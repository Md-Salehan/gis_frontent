export function getFieldNames(features) {
  if (!features || features.length === 0) {
    return [];
  }

  const firstFeature = features[0];
  if (!firstFeature.properties) {
    return [];
  }

  return Object.keys(firstFeature.properties);
}

export function getFieldTypes(features, fieldName) {
  if (!features || features.length === 0) {
    return [];
  }

  const types = new Set();
  for (const feature of features) {
    if (feature.properties && feature.properties[fieldName] !== undefined) {
      const value = feature.properties[fieldName];
      types.add(typeof value);
    }
  }

  return Array.from(types);
}

export function areFieldsCompatible(features, fieldName) {
  const types = getFieldTypes(features, fieldName);
  // If all values are strings or all are numbers, they're compatible
  const allStrings = types.every((t) => t === 'string');
  const allNumbers = types.every((t) => t === 'number');
  return allStrings || allNumbers;
}

export function getFieldSample(features, fieldName, limit = 5) {
  if (!features || features.length === 0) {
    return [];
  }

  const samples = [];
  for (const feature of features) {
    if (samples.length >= limit) break;
    if (feature.properties && feature.properties[fieldName] !== undefined) {
      samples.push(feature.properties[fieldName]);
    }
  }

  return samples;
}