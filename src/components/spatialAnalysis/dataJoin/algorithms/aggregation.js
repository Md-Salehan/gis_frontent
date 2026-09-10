// src/features/dataJoin/algorithms/aggregation.js

import { AGGREGATION_TYPES } from '../constants';

/**
 * Convert a value to a number if possible
 * @param {any} value - Value to convert
 * @returns {number|null} - Converted number or null if not convertible
 */
function convertToNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }
  
  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }
  
  if (typeof value === 'string') {
    // Try to parse string to number
    const trimmed = value.trim();
    if (trimmed === '') return null;
    
    const num = Number(trimmed);
    return isNaN(num) ? null : num;
  }
  
  return null;
}

/**
 * Extract numeric values from an array, converting strings when possible
 * @param {Array} values - Array of values
 * @param {boolean} preserveNulls - Whether to preserve null values
 * @returns {Array} - Array of valid numbers
 */
function extractNumericValues(values, preserveNulls = false) {
  if (!values || values.length === 0) {
    return [];
  }

  const result = [];
  
  for (const value of values) {
    if (value === undefined) continue;
    
    if (value === null) {
      if (preserveNulls) {
        result.push(0); // Treat null as 0 for numeric operations
      }
      continue;
    }
    
    const num = convertToNumber(value);
    if (num !== null) {
      result.push(num);
    }
  }
  
  return result;
}

/**
 * Aggregate a list of values using the specified aggregation type
 * @param {Array} values - List of values to aggregate
 * @param {string} aggregationType - Type of aggregation (count, sum, avg, min, max, concat)
 * @param {Object} options - Aggregation options
 * @param {boolean} options.preserveNulls - Whether to preserve null values
 * @returns {number|string|null} - Aggregated result
 */
export function aggregateValues(values, aggregationType, options = {}) {
  const { preserveNulls = false } = options;
  
  if (!values || values.length === 0) {
    return null;
  }

  // Filter out undefined values
  let validValues = values.filter((v) => v !== undefined);
  
  if (!preserveNulls) {
    // Remove nulls when preserveNulls is false
    validValues = validValues.filter((v) => v !== null);
  }

  if (validValues.length === 0) {
    return null;
  }

  switch (aggregationType) {
    case AGGREGATION_TYPES.COUNT:
      return validValues.length;

    case AGGREGATION_TYPES.SUM: {
      // Extract all numeric values (converting strings when possible)
      const numbers = extractNumericValues(validValues, preserveNulls);
      if (numbers.length === 0) return 0;
      return numbers.reduce((a, b) => a + b, 0);
    }

    case AGGREGATION_TYPES.AVG: {
      const numbers = extractNumericValues(validValues, preserveNulls);
      if (numbers.length === 0) return 0;
      const sum = numbers.reduce((a, b) => a + b, 0);
      return sum / numbers.length;
    }

    case AGGREGATION_TYPES.MIN: {
      const numbers = extractNumericValues(validValues, preserveNulls);
      if (numbers.length === 0) return 0;
      return Math.min(...numbers);
    }

    case AGGREGATION_TYPES.MAX: {
      const numbers = extractNumericValues(validValues, preserveNulls);
      if (numbers.length === 0) return 0;
      return Math.max(...numbers);
    }

    case AGGREGATION_TYPES.CONCAT: {
      // Convert all values to strings, handling nulls based on preserveNulls
      const stringValues = validValues.map((v) => {
        if (v === null) return preserveNulls ? 'null' : '';
        return String(v);
      }).filter((v) => v !== '');
      
      if (stringValues.length === 0) return '';
      return stringValues.join(', ');
    }

    default:
      return validValues[0];
  }
}

/**
 * Aggregate multiple fields from a list of matching features
 * @param {Array} matches - List of matching features
 * @param {Array} fields - List of field names to aggregate
 * @param {string} aggregationType - Type of aggregation to apply
 * @param {Object} options - Additional options
 * @param {boolean} options.preserveNulls - Whether to preserve null values in aggregation
 * @returns {Object} - Aggregated properties
 */
export function aggregateFeatures(matches, fields, aggregationType, options = {}) {
  const { preserveNulls = false } = options;
  const result = {};

  if (!matches || matches.length === 0) {
    return result;
  }

  for (const field of fields) {
    // Extract values for this field from all matches
    const values = matches
      .map((m) => m.properties?.[field])
      .filter((v) => {
        // Filter out undefined, but optionally keep null
        if (v === undefined) return false;
        if (v === null && !preserveNulls) return false;
        return true;
      });

    // Skip empty value arrays
    if (values.length === 0) {
      result[field] = null;
      continue;
    }

    // Apply aggregation with options
    const aggregatedValue = aggregateValues(values, aggregationType, { preserveNulls });
    result[field] = aggregatedValue;
  }

  return result;
}

/**
 * Check if a field can be aggregated numerically
 * @param {Array} values - Sample values from the field
 * @param {boolean} convertStrings - Whether to attempt string conversion
 * @returns {boolean} - Whether the field can be numerically aggregated
 */
export function isFieldNumericAggregatable(values, convertStrings = true) {
  if (!values || values.length === 0) {
    return false;
  }

  const validValues = values.filter(v => v !== undefined && v !== null);
  if (validValues.length === 0) return false;

  // Check if any values can be converted to numbers
  for (const value of validValues) {
    if (typeof value === 'number') return true;
    if (convertStrings && typeof value === 'string') {
      const num = Number(value.trim());
      if (!isNaN(num)) return true;
    }
  }

  return false;
}

/**
 * Get appropriate aggregation types for a field
 * @param {Array} values - Sample values from the field
 * @param {Object} options - Options
 * @param {boolean} options.convertStrings - Whether to allow string to number conversion
 * @returns {Array} - List of supported aggregation types
 */
export function getSupportedAggregations(values, options = {}) {
  const { convertStrings = true } = options;
  
  if (!values || values.length === 0) {
    return [AGGREGATION_TYPES.COUNT];
  }

  const validValues = values.filter(v => v !== undefined && v !== null);
  if (validValues.length === 0) {
    return [AGGREGATION_TYPES.COUNT];
  }

  // Check for numeric capability
  let hasNumbers = false;
  let hasStrings = false;

  for (const value of validValues) {
    if (typeof value === 'number') {
      hasNumbers = true;
    }
    if (typeof value === 'string') {
      hasStrings = true;
      if (convertStrings) {
        const num = Number(value.trim());
        if (!isNaN(num)) {
          hasNumbers = true;
        }
      }
    }
  }

  const supported = [AGGREGATION_TYPES.COUNT];

  if (hasNumbers) {
    supported.push(
      AGGREGATION_TYPES.SUM,
      AGGREGATION_TYPES.AVG,
      AGGREGATION_TYPES.MIN,
      AGGREGATION_TYPES.MAX
    );
  }

  if (hasStrings) {
    supported.push(AGGREGATION_TYPES.CONCAT);
  }

  return supported;
}

/**
 * Get value type information for a field
 * @param {Array} values - Sample values from the field
 * @returns {Object} - Type information
 */
export function getFieldValueTypeInfo(values) {
  if (!values || values.length === 0) {
    return { type: 'empty', sample: null };
  }

  const validValues = values.filter(v => v !== undefined && v !== null);
  if (validValues.length === 0) {
    return { type: 'null', sample: null };
  }

  const types = new Set();
  let hasNumericStrings = false;

  for (const value of validValues) {
    types.add(typeof value);
    
    if (typeof value === 'string') {
      const num = Number(value.trim());
      if (!isNaN(num)) {
        hasNumericStrings = true;
      }
    }
  }

  return {
    type: types.size === 1 ? [...types][0] : 'mixed',
    canConvertToNumber: hasNumericStrings || types.has('number'),
    sample: validValues.slice(0, 3),
  };
}
