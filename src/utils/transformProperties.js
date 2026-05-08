/**
 * Transforms feature properties by processing string values containing "~" delimiter
 * @param {Object} properties - Feature properties object
 * @param {Object} options - Configuration options
 * @param {boolean} options.keepOriginalOnParseError - Whether to keep original value when JSON parse fails (default: true)
 * @param {string} options.delimiter - Delimiter to split on (default: "~")
 * @param {boolean} options.processNestedArrays - Whether to recursively process nested arrays (default: false)
 * @returns {Object} Transformed properties object
 */
function transformProperties(properties, options = {}) {
  const {
    keepOriginalOnParseError = true,
    delimiter = "~",
    processNestedArrays = false
  } = options;

  if (!properties || typeof properties !== "object") {
    return {};
  }

  const TransformedProperties = {};

  for (const [k, v] of Object.entries(properties)) {
    // Skip null or undefined values
    if (v === null || v === undefined) {
      TransformedProperties[k] = v;
      continue;
    }

    // Handle string values
    if (typeof v === "string") {
      if (v.includes(delimiter)) {
        // Try to parse as JSON first
        try {
          const parsed = JSON.parse(v);
          if (Array.isArray(parsed)) {
            TransformedProperties[k] = processArrayValue(parsed, delimiter, processNestedArrays);
          } else if (typeof parsed === "string" && parsed.includes(delimiter)) {
            // Parsed result is a string with delimiter
            TransformedProperties[k] = parsed.split(delimiter)[0];
          } else {
            TransformedProperties[k] = parsed;
          }
        } catch (e) {
          // Not valid JSON, treat as regular string
          TransformedProperties[k] = v.split(delimiter)[0];
        }
      } else {
        TransformedProperties[k] = v;
      }
    }
    // Handle array values
    else if (Array.isArray(v)) {
      TransformedProperties[k] = processArrayValue(v, delimiter, processNestedArrays);
    }
    // Handle nested objects (optional)
    else if (typeof v === "object" && v !== null && processNestedArrays) {
      TransformedProperties[k] = transformProperties(v, options);
    }
    // Pass through other types (numbers, booleans, etc.)
    else {
      TransformedProperties[k] = v;
    }
  }

  return TransformedProperties;
}

/**
 * Helper function to process array values
 * @param {Array} arr - Array to process
 * @param {string} delimiter - Delimiter to split on
 * @param {boolean} processNested - Whether to process nested arrays
 * @returns {Array} Processed array
 */
function processArrayValue(arr, delimiter, processNested) {
  return arr.map((item) => {
    // Handle null/undefined
    if (item === null || item === undefined) {
      return item;
    }
    
    // Handle string items with delimiter
    if (typeof item === "string" && item.includes(delimiter)) {
      // return item.split(delimiter)[0];
      const path = item.split(delimiter)[0];
      const url = `${import.meta.env.VITE_JAVA_SERVER_PREFIX}${path}`;
      return url;
    }
    
    // Handle nested arrays (if enabled)
    if (Array.isArray(item) && processNested) {
      return processArrayValue(item, delimiter, processNested);
    }
    
    // Handle nested objects (if enabled)
    if (typeof item === "object" && item !== null && processNested) {
      return transformProperties(item, { delimiter, processNested });
    }
    
    return item;
  });
}

export default transformProperties;