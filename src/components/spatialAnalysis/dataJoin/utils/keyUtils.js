import { getCompositeKey, getNormalizedKey } from './valueNormalizer';

export function extractKey(feature, fieldNames, normalizeOptions) {
  if (!feature || !feature.properties) {
    return null;
  }

  if (Array.isArray(fieldNames) && fieldNames.length > 1) {
    return getCompositeKey(feature, fieldNames, normalizeOptions);
  }

  const fieldName = Array.isArray(fieldNames) ? fieldNames[0] : fieldNames;
  return getNormalizedKey(feature, fieldName, normalizeOptions);
}

export function createKeyExtractor(fieldNames, normalizeOptions) {
  return (feature) => extractKey(feature, fieldNames, normalizeOptions);
}