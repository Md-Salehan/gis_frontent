import { buildLookupIndex } from '../algorithms/attributeIndex';
import { performAttributeJoin } from '../algorithms/attributeJoin';
import { processInChunks } from '../utils/chunkProcessor';
import { getFieldNames } from '../utils/fieldUtils';
import { JOIN_TYPES, MATCH_STRATEGIES, DEFAULT_CHUNK_SIZE } from '../constants';
import { getJoinCache, setJoinCache, invalidateJoinCache } from './joinCacheService';

export class DataJoinService {
  constructor(options = {}) {
    this.chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
  }

  async validateJoinConfig(config) {
    const errors = [];

    // Validate target layer
    if (!config.targetLayer) {
      errors.push('Target layer is required');
    } else if (!config.targetLayer.data?.geoJsonData?.features?.length) {
      errors.push('Target layer contains no features');
    }

    // Validate join layer
    if (!config.joinLayer) {
      errors.push('Join layer is required');
    } else if (!config.joinLayer.data?.geoJsonData?.features?.length) {
      errors.push('Join layer contains no features');
    }

    if (config.targetLayer && config.joinLayer && config.targetLayer.value === config.joinLayer.value) {
      errors.push('Target and Join layers must be different');
    }

    // Validate fields
    if (!config.targetFields || config.targetFields.length === 0) {
      errors.push('Target field is required');
    }

    if (!config.joinFields || config.joinFields.length === 0) {
      errors.push('Join field is required');
    }

    // Validate fields exist
    if (config.targetLayer && config.targetFields) {
      const targetFeatures = config.targetLayer.data.geoJsonData.features;
      const availableFields = getFieldNames(targetFeatures);
      for (const field of config.targetFields) {
        if (!availableFields.includes(field)) {
          errors.push(`Target field "${field}" does not exist`);
        }
      }
    }

    if (config.joinLayer && config.joinFields) {
      const joinFeatures = config.joinLayer.data.geoJsonData.features;
      const availableFields = getFieldNames(joinFeatures);
      for (const field of config.joinFields) {
        if (!availableFields.includes(field)) {
          errors.push(`Join field "${field}" does not exist`);
        }
      }
    }

    // Validate field compatibility
    if (config.targetLayer && config.joinLayer && config.targetFields && config.joinFields) {
      const targetFeatures = config.targetLayer.data.geoJsonData.features;
      const joinFeatures = config.joinLayer.data.geoJsonData.features;

      // Check if fields have values
      const hasTargetValues = targetFeatures.some(
        (f) => f.properties?.[config.targetFields[0]] !== undefined && f.properties?.[config.targetFields[0]] !== null
      );
      const hasJoinValues = joinFeatures.some(
        (f) => f.properties?.[config.joinFields[0]] !== undefined && f.properties?.[config.joinFields[0]] !== null
      );

      if (!hasTargetValues) {
        errors.push('Target field contains no values');
      }
      if (!hasJoinValues) {
        errors.push('Join field contains no values');
      }
    }

    // Validate selected join fields exist
    if (config.selectedJoinFields && config.selectedJoinFields.length > 0) {
      const joinFeatures = config.joinLayer?.data?.geoJsonData?.features || [];
      const availableFields = getFieldNames(joinFeatures);
      for (const field of config.selectedJoinFields) {
        if (!availableFields.includes(field)) {
          errors.push(`Selected join field "${field}" does not exist`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async performJoin(config, options = {}) {
    const {
      signal = null,
      onProgress = null,
      onChunkComplete = null,
    } = options;

    // Validate first
    const validation = await this.validateJoinConfig(config);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const {
      targetLayer,
      joinLayer,
      targetFields,
      joinFields,
      matchStrategy = MATCH_STRATEGIES.FIRST,
      aggregation = null,
      collisionStrategy = 'prefixJoin',
      fieldPrefix = 'join_',
      selectedJoinFields = null,
      normalizeOptions = {},
      useCache = true,
    } = config;

    const targetFeatures = targetLayer.data.geoJsonData.features;
    const joinFeatures = joinLayer.data.geoJsonData.features;

    // Check if join features have valid data
    if (!joinFeatures || joinFeatures.length === 0) {
      throw new Error('Join layer has no features to join');
    }

    const startTime = performance.now();

    // Build or retrieve lookup index
    let lookupData;
    let cacheHit = false;

    if (useCache) {
      const cacheKey = this.getCacheKey({
        joinLayerId: joinLayer.value,
        joinFields,
        normalizeOptions,
        matchStrategy,
        aggregation,
      });

      lookupData = getJoinCache(cacheKey);
      if (lookupData) {
        cacheHit = true;
      }
    }

    if (!lookupData) {
      const indexStartTime = performance.now();

      // Build lookup from join layer
      const result = buildLookupIndex(
        joinFeatures,
        joinFields,
        {
          normalizeOptions,
          duplicateStrategy: matchStrategy === MATCH_STRATEGIES.FIRST
            ? 'first'
            : matchStrategy === MATCH_STRATEGIES.ALL
              ? 'all'
              : 'aggregate',
          aggregation,
        }
      );

      // Ensure we have valid statistics
      lookupData = {
        lookup: result.lookup || new Map(),
        statistics: {
          totalFeatures: result.totalFeatures || 0,
          processedFeatures: result.processedFeatures || 0,
          invalidKeyCount: result.invalidKeyCount || 0,
          duplicateKeyCount: result.duplicateKeyCount || 0,
          uniqueKeyCount: result.uniqueKeyCount || 0,
        },
        buildTimeMs: performance.now() - indexStartTime,
      };

      // Check if lookup has any keys
      if (lookupData.lookup.size === 0) {
        throw new Error('No valid join keys found in the join layer. Please check the join field for valid data.');
      }

      // Cache the lookup
      if (useCache) {
        const cacheKey = this.getCacheKey({
          joinLayerId: joinLayer.value,
          joinFields,
          normalizeOptions,
          matchStrategy,
          aggregation,
        });
        setJoinCache(cacheKey, lookupData);
      }
    }

    // Process target features in chunks
    const resultFeatures = [];
    let processedCount = 0;
    let totalMatches = 0;
    let totalUnmatched = 0;
    let totalInvalidKeys = 0;

    const chunkProcessor = async (feature, index) => {
      return feature;
    };

    const chunkResults = await processInChunks(
      targetFeatures,
      chunkProcessor,
      {
        chunkSize: this.chunkSize,
        signal,
        onProgress: (processed, total) => {
          processedCount = processed;
          if (onProgress) {
            onProgress(processed, total);
          }
        },
        onChunkComplete: (chunk, chunkIndex, processed) => {
          const { lookup } = lookupData;
          const chunkConfig = {
            ...config,
            targetFields,
            joinFields,
            normalizeOptions,
            matchStrategy,
            aggregation,
            collisionStrategy,
            fieldPrefix,
            selectedJoinFields,
          };

          const result = performAttributeJoin(
            chunk,
            lookup,
            chunkConfig
          );

          resultFeatures.push(...result.features);
          totalMatches += result.statistics.matchedCount || 0;
          totalUnmatched += result.statistics.unmatchedCount || 0;
          totalInvalidKeys += result.statistics.invalidTargetKeyCount || 0;

          if (onChunkComplete) {
            onChunkComplete(chunk, chunkIndex, result.statistics);
          }
        },
      }
    );

    // Final statistics
    const totalTimeMs = performance.now() - startTime;

    const finalStatistics = {
      targetCount: targetFeatures.length || 0,
      matchedCount: totalMatches,
      unmatchedCount: totalUnmatched,
      invalidTargetKeyCount: totalInvalidKeys,
      duplicateKeyCount: lookupData.statistics?.duplicateKeyCount || 0,
      invalidJoinKeyCount: lookupData.statistics?.invalidKeyCount || 0,
      uniqueJoinKeys: lookupData.statistics?.uniqueKeyCount || 0,
      matchRate: targetFeatures.length > 0
        ? (totalMatches / targetFeatures.length) * 100
        : 0,
      processingTimeMs: totalTimeMs,
      cacheHit: cacheHit || false,
      buildTimeMs: lookupData.buildTimeMs || 0,
      resultCount: resultFeatures.length,
    };

    // Create result GeoJSON
    const resultGeoJson = {
      type: 'FeatureCollection',
      features: resultFeatures,
    };

    return {
      featureCollection: resultGeoJson,
      statistics: finalStatistics,
    };
  }

  getCacheKey(params) {
    const { joinLayerId, joinFields, normalizeOptions, matchStrategy, aggregation } = params;
    return JSON.stringify({
      layerId: joinLayerId,
      fields: joinFields ? [...joinFields].sort() : [],
      normalize: normalizeOptions || {},
      strategy: matchStrategy,
      aggregation: aggregation,
    });
  }

  invalidateCache(layerId) {
    invalidateJoinCache(layerId);
  }
}

// Singleton instance
let dataJoinServiceInstance = null;

export function getDataJoinService(options = {}) {
  if (!dataJoinServiceInstance) {
    dataJoinServiceInstance = new DataJoinService(options);
  }
  return dataJoinServiceInstance;
}