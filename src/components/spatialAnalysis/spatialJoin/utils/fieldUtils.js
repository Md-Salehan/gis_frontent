export function copyProperties(source, fields, prefix) {
  const result = {};
  // If fields is empty array, copy nothing
  const fieldsToCopy = fields && fields.length > 0 ? fields : [];
  
  for (const field of fieldsToCopy) {
    if (source[field] !== undefined && source[field] !== null) {
      const key = prefix ? `${prefix}${field}` : field;
      result[key] = source[field];
    }
  }

  return result;
}

export function resolveFieldCollisions(targetProps, joinProps, prefix) {
  const result = { ...targetProps };

  // If prefix is "target_", we keep target fields
  // If prefix is "join_", we keep join fields
  // If prefix is empty, we use suffix "_join"
  
  for (const [key, value] of Object.entries(joinProps)) {
    // Check if key exists in target (including undefined)
    if (key in result) {
      // Collision detected
      const newKey = prefix ? `${prefix}${key}` : `${key}_join`;
      result[newKey] = value;
    } else {
      result[key] = value;
    }
  }

  return result;
}

// Get field type (numeric, string, boolean, etc.)
export function getFieldType(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") return "numeric";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "string") {
    // Check if it's a date
    if (!isNaN(Date.parse(value)) && value.includes("-")) return "date";
    return "string";
  }
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  return "unknown";
}

// Check if a field is suitable for aggregation
export function isAggregatableField(value) {
  const type = getFieldType(value);
  return type === "numeric" || type === "string";
}

// Get numeric value from field
export function getNumericValue(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  }
  return null;
}

// Format field name for display
export function formatFieldName(field) {
  return field
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}