import { extractKey } from '../utils/keyUtils';
import { aggregateFeatures } from './aggregation';
import {
  MATCH_STRATEGIES,
  COLLISION_STRATEGIES,
} from '../constants';

export function performAttributeJoin(
  targetFeatures,
  joinLookup,
  config
) {
  const {
    targetFields,
    joinFields,
    normalizeOptions = {},
    matchStrategy = MATCH_STRATEGIES.FIRST,
    aggregation = null,
    collisionStrategy = COLLISION_STRATEGIES.PREFIX_JOIN,
    fieldPrefix = 'join_',
    selectedJoinFields = null,
  } = config;

  const resultFeatures = [];
  const statistics = {
    targetCount: targetFeatures.length,
    matchedCount: 0,
    unmatchedCount: 0,
    invalidTargetKeyCount: 0,
    duplicateMatchesCount: 0,
    fieldCollisions: [],
  };

  // Determine which fields to copy from join
  const fieldsToCopy = selectedJoinFields || [];

  for (const targetFeature of targetFeatures) {
    // Extract target key
    const targetKey = extractKey(targetFeature, targetFields, normalizeOptions);

    // Check for invalid target key
    if (targetKey === null || targetKey === undefined || targetKey === '') {
      statistics.invalidTargetKeyCount++;
      // Still include the feature with no join data
      const resultFeature = createResultFeature(
        targetFeature,
        null,
        fieldsToCopy,
        fieldPrefix,
        collisionStrategy,
        statistics // Pass statistics reference
      );
      resultFeatures.push(resultFeature);
      statistics.unmatchedCount++;
      continue;
    }

    // Look up in join index
    const joinData = joinLookup.get(targetKey);

    if (!joinData) {
      // No match found
      const resultFeature = createResultFeature(
        targetFeature,
        null,
        fieldsToCopy,
        fieldPrefix,
        collisionStrategy,
        statistics // Pass statistics reference
      );
      resultFeatures.push(resultFeature);
      statistics.unmatchedCount++;
      continue;
    }

    // Handle matches based on strategy
    let joinFeatures = [];
    let isArray = Array.isArray(joinData);

    if (isArray) {
      statistics.duplicateMatchesCount += joinData.length;
      joinFeatures = joinData;
    } else {
      joinFeatures = [joinData];
    }

    // Apply match strategy
    let matchedFeatures = [];
    switch (matchStrategy) {
      case MATCH_STRATEGIES.FIRST:
        matchedFeatures = joinFeatures.slice(0, 1);
        break;
      case MATCH_STRATEGIES.ALL:
        matchedFeatures = joinFeatures;
        break;
      case MATCH_STRATEGIES.AGGREGATE:
        if (aggregation && aggregation.type) {
          // Aggregate all matches into one feature
          const aggregatedProps = aggregateFeatures(
            joinFeatures,
            fieldsToCopy,
            aggregation.type
          );
          const resultFeature = createResultFeature(
            targetFeature,
            aggregatedProps,
            fieldsToCopy,
            fieldPrefix,
            collisionStrategy,
            statistics // Pass statistics reference
          );
          resultFeatures.push(resultFeature);
          statistics.matchedCount += joinFeatures.length;
          continue;
        }
        matchedFeatures = joinFeatures;
        break;
      default:
        matchedFeatures = joinFeatures.slice(0, 1);
    }

    // Create result features
    for (const joinFeature of matchedFeatures) {
      const joinProps = joinFeature.properties || {};
      const resultFeature = createResultFeature(
        targetFeature,
        joinProps,
        fieldsToCopy,
        fieldPrefix,
        collisionStrategy,
        statistics // Pass statistics reference
      );
      resultFeatures.push(resultFeature);
      statistics.matchedCount++;
    }
  }

  // Calculate match rate
  const totalTargets = targetFeatures.length || 1;
  statistics.matchRate = (statistics.matchedCount / totalTargets) * 100;
  statistics.unmatchedCount = totalTargets - statistics.matchedCount;

  return {
    features: resultFeatures,
    statistics,
  };
}

function createResultFeature(
  targetFeature,
  joinProperties,
  fieldsToCopy,
  fieldPrefix,
  collisionStrategy,
  statistics // Add statistics parameter
) {
  // Preserve target geometry
  const result = {
    type: 'Feature',
    geometry: targetFeature.geometry,
    properties: {},
  };

  // Start with target properties
  if (targetFeature.properties) {
    result.properties = { ...targetFeature.properties };
  }

  // If no join properties, return target feature
  if (!joinProperties) {
    return result;
  }

  // Select only requested fields from join
  let selectedJoinProps = {};
  if (fieldsToCopy.length > 0) {
    for (const field of fieldsToCopy) {
      if (field in joinProperties) {
        selectedJoinProps[field] = joinProperties[field];
      }
    }
  } else {
    // Copy all fields if none selected
    selectedJoinProps = { ...joinProperties };
  }

  // Handle field collisions
  for (const [key, value] of Object.entries(selectedJoinProps)) {
    if (key in result.properties) {
      // Collision detected
      if (statistics  && statistics?.fieldCollisions) {
        statistics.fieldCollisions.push(key);
      }
      
      switch (collisionStrategy) {
        case COLLISION_STRATEGIES.PREFIX_JOIN:
          result.properties[`${fieldPrefix}${key}`] = value;
          break;
        case COLLISION_STRATEGIES.PREFIX_TARGET:
          // Keep target, rename join field
          result.properties[`${fieldPrefix}${key}`] = value;
          break;
        case COLLISION_STRATEGIES.REPLACE:
          result.properties[key] = value;
          break;
        case COLLISION_STRATEGIES.SKIP:
          // Keep target, skip join
          break;
        case COLLISION_STRATEGIES.ERROR:
          throw new Error(`Field collision on "${key}"`);
        default:
          result.properties[`${fieldPrefix}${key}`] = value;
      }
    } else {
      result.properties[key] = value;
    }
  }

  return result;
}