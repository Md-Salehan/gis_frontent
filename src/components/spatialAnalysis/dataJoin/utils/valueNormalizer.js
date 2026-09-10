export function normalizeKey(value, options = {}) {
  const {
    trim = true,
    caseSensitive = true,
    preserveLeadingZeros = true,
    nullToEmpty = false,
  } = options;

  // Handle null/undefined
  if (value === null || value === undefined) {
    return nullToEmpty ? '' : null;
  }

  // Convert to string for consistent handling
  let str = String(value);

  // Trim whitespace
  if (trim) {
    str = str.trim();
  }

  // Handle empty string after trimming
  if (str === '') {
    return nullToEmpty ? '' : null;
  }

  // Case conversion
  if (!caseSensitive) {
    str = str.toLowerCase();
  }

  return str;
}

export function getNormalizedKey(feature, fieldName, options = {}) {
  if (!feature || !feature.properties) {
    return null;
  }

  const value = feature.properties[fieldName];
  return normalizeKey(value, options);
}

export function getCompositeKey(feature, fieldNames, options = {}) {
  if (!feature || !feature.properties || !fieldNames || fieldNames.length === 0) {
    return null;
  }

  const keys = fieldNames.map((field) => {
    const value = feature.properties[field];
    return normalizeKey(value, options);
  });

  // Check if any key is null (invalid)
  if (keys.some((k) => k === null)) {
    return null;
  }

  // Use a delimiter that won't appear in the keys
  return keys.join('|||');
}