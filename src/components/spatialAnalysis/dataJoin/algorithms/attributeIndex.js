import { extractKey } from "../utils/keyUtils";

export function buildLookupIndex(features, fieldNames, options = {}) {
  const {
    normalizeOptions = {},
    duplicateStrategy = "first",
    aggregation = null,
    maxKeys = null,
  } = options;

  const lookup = new Map();
  let invalidKeyCount = 0;
  let duplicateKeyCount = 0;
  const processedFeatures = [];

  // Handle empty or invalid input
  if (!features || !Array.isArray(features) || features.length === 0) {
    return {
      lookup,
      totalFeatures: 0,
      processedFeatures: 0,
      invalidKeyCount: 0,
      duplicateKeyCount: 0,
      uniqueKeyCount: 0,
    };
  }

  if (!fieldNames || fieldNames.length === 0) {
    return {
      lookup,
      totalFeatures: features.length,
      processedFeatures: 0,
      invalidKeyCount: features.length,
      duplicateKeyCount: 0,
      uniqueKeyCount: 0,
    };
  }

  for (const feature of features) {
    const key = extractKey(feature, fieldNames, normalizeOptions);

    // Skip invalid keys (null, undefined, empty)
    if (key === null || key === undefined || key === "") {
      invalidKeyCount++;
      continue;
    }

    // Check max keys limit
    if (maxKeys && lookup.size >= maxKeys) {
      break;
    }

    if (lookup.has(key)) {
      duplicateKeyCount++;
      const existing = lookup.get(key);

      // Handle duplicate strategies
      switch (duplicateStrategy) {
        case "first":
          // Keep first, ignore subsequent
          break;
        case "all":
          // Store as array
          if (!Array.isArray(existing)) {
            lookup.set(key, [existing, feature]);
          } else {
            existing.push(feature);
          }
          break;
        case "aggregate":
          // Handle via aggregation
          if (!Array.isArray(existing)) {
            lookup.set(key, [existing, feature]);
          } else {
            existing.push(feature);
          }
          break;
        case "error":
          throw new Error(`Duplicate key found: ${key}`);
        default:
          // Default: keep first
          break;
      }
    } else {
      lookup.set(key, feature);
    }

    processedFeatures.push(feature);
  }

  return {
    lookup,
    totalFeatures: features.length,
    processedFeatures: processedFeatures.length,
    invalidKeyCount,
    duplicateKeyCount,
    uniqueKeyCount: lookup.size,
  };
}

export function getCachedLookup(lookup, key) {
  if (!lookup) return null;
  return lookup.get(key);
}