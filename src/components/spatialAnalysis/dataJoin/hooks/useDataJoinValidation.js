import { useState, useCallback, useMemo } from 'react';
import { getFieldNames, areFieldsCompatible, getFieldSample } from '../utils/fieldUtils';
import { JOIN_TYPES, MATCH_STRATEGIES, AGGREGATION_TYPES } from '../constants';

export function useDataJoinValidation() {
  const [validationErrors, setValidationErrors] = useState([]);
  const [fieldSamples, setFieldSamples] = useState({});

  const validateLayer = useCallback((layer, fieldName) => {
    const errors = [];

    if (!layer) {
      errors.push('Layer is required');
      return errors;
    }

    const features = layer.data?.geoJsonData?.features;
    if (!features || features.length === 0) {
      errors.push('Layer contains no features');
      return errors;
    }

    if (fieldName) {
      const availableFields = getFieldNames(features);
      if (!availableFields.includes(fieldName)) {
        errors.push(`Field "${fieldName}" does not exist`);
      } else {
        // Check if field has values
        const hasValues = features.some(
          (f) => f.properties?.[fieldName] !== undefined && f.properties?.[fieldName] !== null
        );
        if (!hasValues) {
          errors.push(`Field "${fieldName}" contains no values`);
        }
      }
    }

    return errors;
  }, []);

  const validateJoinConfig = useCallback((config) => {
    const {
      targetLayer,
      joinLayer,
      targetFields,
      joinFields,
      selectedJoinFields,
    } = config;

    const errors = [];

    // Validate target layer
    const targetErrors = validateLayer(targetLayer, targetFields?.[0]);
    errors.push(...targetErrors.map(e => `Target: ${e}`));

    // Validate join layer
    const joinErrors = validateLayer(joinLayer, joinFields?.[0]);
    errors.push(...joinErrors.map(e => `Join: ${e}`));

    // Check same layer
    if (targetLayer && joinLayer && targetLayer.value === joinLayer.value) {
      errors.push('Target and Join layers must be different');
    }

    // Validate selected join fields exist
    if (selectedJoinFields && selectedJoinFields.length > 0 && joinLayer) {
      const features = joinLayer.data?.geoJsonData?.features || [];
      const availableFields = getFieldNames(features);
      for (const field of selectedJoinFields) {
        if (!availableFields.includes(field)) {
          errors.push(`Selected join field "${field}" does not exist in join layer`);
        }
      }
    }

    setValidationErrors(errors);
    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [validateLayer]);

  const getFieldSamples = useCallback((layer, fieldNames) => {
    if (!layer || !fieldNames || fieldNames.length === 0) {
      return {};
    }

    const features = layer.data?.geoJsonData?.features || [];
    const samples = {};

    for (const field of fieldNames) {
      samples[field] = getFieldSample(features, field, 5);
    }

    return samples;
  }, []);

  const validateFieldsCompatibility = useCallback((targetLayer, joinLayer, targetField, joinField) => {
    if (!targetLayer || !joinLayer || !targetField || !joinField) {
      return true;
    }

    const targetFeatures = targetLayer.data?.geoJsonData?.features || [];
    const joinFeatures = joinLayer.data?.geoJsonData?.features || [];

    // Check if fields have compatible types
    const targetTypes = new Set();
    const joinTypes = new Set();

    for (const f of targetFeatures) {
      const val = f.properties?.[targetField];
      if (val !== undefined && val !== null) {
        targetTypes.add(typeof val);
      }
    }

    for (const f of joinFeatures) {
      const val = f.properties?.[joinField];
      if (val !== undefined && val !== null) {
        joinTypes.add(typeof val);
      }
    }

    // Strings and numbers can be compared (will be normalized)
    const allStrings = [...targetTypes, ...joinTypes].every(t => t === 'string');
    const allNumbers = [...targetTypes, ...joinTypes].every(t => t === 'number');

    return allStrings || allNumbers;
  }, []);

  const clearValidation = useCallback(() => {
    setValidationErrors([]);
    setFieldSamples({});
  }, []);

  return {
    validationErrors,
    fieldSamples,
    validateJoinConfig,
    getFieldSamples,
    validateFieldsCompatibility,
    clearValidation,
  };
}