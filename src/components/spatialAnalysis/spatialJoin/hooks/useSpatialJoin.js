import { useState, useCallback, useRef } from "react";
import * as turf from "@turf/turf";
import { buildSpatialIndex } from "./useSpatialIndex";
import { processInChunks } from "./useChunkProcessor";
import {
  executePredicate,
  isGeometryTypeCompatible,
} from "../utils/spatialPredicates";
import { getCompatiblePredicates } from "../utils/compatibilityMatrix";
import { copyProperties, resolveFieldCollisions } from "../utils/fieldUtils";

const CHUNK_SIZE = 500;
const PROGRESS_INTERVAL = 200; // ms

export function useSpatialJoin({ onComplete, onError } = {}) {
  const [status, setStatus] = useState("idle"); // idle | processing | complete | error
  const [progress, setProgress] = useState(0);
  const [totalFeatures, setTotalFeatures] = useState(0);
  const [processedFeatures, setProcessedFeatures] = useState(0);
  const [matches, setMatches] = useState(0);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const abortControllerRef = useRef(null);
  const processingRef = useRef(false);

  const isProcessing = status === "processing";
  const isComplete = status === "complete";

  const startJoin = useCallback(
    async ({
      targetLayer,
      joinLayer,
      predicate,
      distance,
      distanceUnit,
      matchStrategy,
      selectedFields,
      fieldPrefix,
      aggregation,
    }) => {
      if (processingRef.current) {
        console.warn("Spatial join already in progress");
        return;
      }

      // Validate inputs
      if (!targetLayer || !joinLayer) {
        const err = new Error("Target and join layers are required");
        setError(err.message);
        if (onError) onError(err);
        return;
      }

      if (targetLayer.value === joinLayer.value) {
        const err = new Error("Target and join layers must be different");
        setError(err.message);
        if (onError) onError(err);
        return;
      }

      const targetFeatures = targetLayer.data.geoJsonData?.features || [];
      const joinFeatures = joinLayer.data.geoJsonData?.features || [];

      if (targetFeatures.length === 0 || joinFeatures.length === 0) {
        const err = new Error("Selected layers contain no features");
        setError(err.message);
        if (onError) onError(err);
        return;
      }

      // Validate geometry compatibility
      const targetType = targetLayer.geometryTypes[0] || "Unknown";
      const joinType = joinLayer.geometryTypes[0] || "Unknown";

      if (!isGeometryTypeCompatible(targetType, joinType, predicate)) {
        const compatible = getCompatiblePredicates(targetType, joinType);
        const err = new Error(
          `Incompatible geometry types for predicate "${predicate}". ` +
            `Compatible: ${compatible.join(", ") || "none"}`,
        );
        setError(err.message);
        if (onError) onError(err);
        return;
      }

      // Validate distance for distance-based predicates
      if (
        (predicate === "within-distance" || predicate === "nearest") &&
        !distance
      ) {
        const err = new Error("Distance is required for this predicate");
        setError(err.message);
        if (onError) onError(err);
        return;
      }

      // Reset state
      setStatus("processing");
      setError(null);
      setResults(null);
      setProgress(0);
      setTotalFeatures(targetFeatures.length);
      setProcessedFeatures(0);
      setMatches(0);

      processingRef.current = true;

      // Create abort controller
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      try {
        // Build spatial index from join layer
        const indexResult = await buildSpatialIndex(joinFeatures, { signal });

        if (signal.aborted) {
          throw new Error("Operation cancelled");
        }

        // Get fields to copy
        const fieldsToCopy = selectedFields.length > 0 ? selectedFields : [];
        
        // Process target features in chunks
        const resultFeatures = [];
        let totalMatchCount = 0;

        await processInChunks(
          targetFeatures,
          {
            chunkSize: CHUNK_SIZE,
            signal,
            onProgress: (processed, total, chunkMatches) => {
              setProcessedFeatures(processed);
              setMatches(chunkMatches);
              setProgress((processed / total) * 100);
            },
            onChunkComplete: (chunk, chunkIndex, chunkMatches) => {
              // Accumulate matches
              totalMatchCount += chunkMatches;
              console.log(`Chunk ${chunkIndex + 1} completed with ${chunkMatches} matches`);
            },
          },
          async (feature, index) => {
            // For each target feature, find matching join features
            const matchingFeatures = findMatches(
              feature,
              indexResult,
              predicate,
              distance,
              distanceUnit,
              matchStrategy,
              fieldsToCopy,
              fieldPrefix,
            );

            let featureMatchCount = 0;

            if (matchingFeatures && matchingFeatures.length > 0) {
              // Create result feature(s) based on match strategy
              if (matchStrategy === "first" || matchStrategy === "aggregate") {
                // Only take first match or aggregate
                const resultFeature = createResultFeature(
                  feature,
                  matchingFeatures,
                  matchStrategy,
                  aggregation,
                  fieldsToCopy,
                  fieldPrefix,
                );
                if (resultFeature) {
                  resultFeatures.push(resultFeature);
                  featureMatchCount = matchStrategy === "aggregate" ? matchingFeatures.length : 1;
                }
              } else {
                // All matches - create one result per match
                for (const match of matchingFeatures) {
                  const resultFeature = createResultFeature(
                    feature,
                    [match],
                    "first",
                    null,
                    fieldsToCopy,
                    fieldPrefix,
                  );
                  if (resultFeature) {
                    resultFeatures.push(resultFeature);
                  }
                }
                featureMatchCount = matchingFeatures.length;
              }
            }
            return featureMatchCount;
          },
        );

        if (signal.aborted) {
          throw new Error("Operation cancelled");
        }

        // Create result GeoJSON
        const resultGeoJson = {
          type: "FeatureCollection",
          features: resultFeatures,
        };

        setResults(resultGeoJson);
        setMatches(totalMatchCount);
        setStatus("complete");
        setProgress(100);

        if (onComplete) {
          onComplete(resultGeoJson);
        }

        return resultGeoJson;
      } catch (err) {
        if (
          err.name === "AbortError" ||
          err.message === "Operation cancelled"
        ) {
          setStatus("idle");
          setError(null);
        } else {
          setStatus("error");
          setError(err.message);
          if (onError) onError(err);
        }
      } finally {
        processingRef.current = false;
        abortControllerRef.current = null;
      }
    },
    [onComplete, onError],
  );

  const cancelJoin = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const reset = useCallback(() => {
    if (processingRef.current) {
      cancelJoin();
    }
    setStatus("idle");
    setError(null);
    setResults(null);
    setProgress(0);
    setTotalFeatures(0);
    setProcessedFeatures(0);
    setMatches(0);
  }, [cancelJoin]);

  return {
    status,
    progress,
    totalFeatures,
    processedFeatures,
    matches,
    results,
    error,
    startJoin,
    cancelJoin,
    reset,
    isProcessing,
    isComplete,
  };
}

// Helper: Find matches for a single feature
function findMatches(
  targetFeature,
  indexResult,
  predicate,
  distance,
  distanceUnit,
  matchStrategy,
  fieldsToCopy,
  fieldPrefix,
) {
  const { index, features } = indexResult;

  // Get target geometry
  const targetGeometry = targetFeature.geometry;
  if (!targetGeometry) return [];

  // Get target bbox for spatial index query
  const bbox = turf.bbox(targetFeature);

  // Query spatial index for candidates
  let candidateIndices = index.search(bbox);

  if (candidateIndices.length === 0) {
    return [];
  }

  // For distance-based predicates, expand search
  if (predicate === "within-distance") {
    const distanceInMeters = convertToMeters(distance, distanceUnit);

    // Get the centroid and buffer from there for better performance
    let searchCenter;
    try {
      const centroid = turf.centroid(targetFeature);
      searchCenter = centroid;
    } catch {
      // Fallback: use the feature itself
      searchCenter = targetFeature;
    }

    const buffered = turf.buffer(searchCenter, distanceInMeters, {
      units: "meters",
    });
    if (buffered) {
      const expandedBbox = turf.bbox(buffered);
      candidateIndices = index.search(expandedBbox);
    }
  }

  // Filter candidates by exact predicate
  const matches = [];

  for (const idx of candidateIndices) {
    const joinFeature = features[idx];
    if (!joinFeature) continue;

    const joinGeometry = joinFeature.geometry;
    if (!joinGeometry) continue;

    // Execute predicate
    const result = executePredicate(
      targetGeometry,
      joinGeometry,
      predicate,
      distance,
      distanceUnit,
    );

    if (result) {
      matches.push({
        feature: joinFeature,
        distance: result.distance || null,
        index: idx,
      });
    }
  }

  // For nearest, find the closest match
  if (predicate === "nearest" && matches.length > 0) {
    matches.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
    return [matches[0]];
  }

  return matches;
}

// Helper: Create result feature
function createResultFeature(
  targetFeature,
  matches,
  matchStrategy,
  aggregation,
  fieldsToCopy,
  fieldPrefix,
) {
  if (matches.length === 0) return null;

  // Deep clone target feature to avoid mutation
  const resultFeature = JSON.parse(JSON.stringify(targetFeature));

  // Copy properties from matches
  let joinProperties = {};

  if (matchStrategy === "aggregate" && aggregation) {
    // Aggregate properties from all matches
    joinProperties = aggregateProperties(matches, aggregation, fieldsToCopy);
  } else {
    // Use first match
    const match = matches[0];
    if (match) {
      joinProperties = copyProperties(
        match.feature.properties || {},
        fieldsToCopy,
        fieldPrefix,
      );
    }
  }

  // Merge properties (resolve collisions)
  resultFeature.properties = resolveFieldCollisions(
    resultFeature.properties || {},
    joinProperties,
    fieldPrefix,
  );

  // Add match metadata
  resultFeature.properties._join_count = matches.length;
  if (matches.length > 0 && matches[0].distance !== null) {
    resultFeature.properties._nearest_distance = matches[0].distance;
  }

  return resultFeature;
}

// Helper: Aggregate properties
function aggregateProperties(matches, aggregation, fieldsToCopy) {
  const result = {};

  if (!fieldsToCopy || fieldsToCopy.length === 0) {
    return result;
  }

  for (const field of fieldsToCopy) {
    const values = matches
      .map((m) => m.feature.properties?.[field])
      .filter((v) => v !== undefined && v !== null);

    if (values.length === 0) continue;

    switch (aggregation) {
      case "count":
        result[field] = values.length;
        break;
      case "sum":
        result[field] = values.reduce(
          (a, b) => a + (typeof b === "number" ? b : 0),
          0,
        );
        break;
      case "average":
        result[field] =
          values.reduce((a, b) => a + (typeof b === "number" ? b : 0), 0) /
          values.length;
        break;
      case "min":
        result[field] = Math.min(
          ...values.filter((v) => typeof v === "number"),
        );
        break;
      case "max":
        result[field] = Math.max(
          ...values.filter((v) => typeof v === "number"),
        );
        break;
      case "concatenate":
        result[field] = values.join(", ");
        break;
      default:
        result[field] = values[0];
    }
  }

  return result;
}

// Helper: Convert distance to meters
function convertToMeters(value, unit) {
  switch (unit) {
    case "kilometers":
      return value * 1000;
    case "miles":
      return value * 1609.34;
    case "meters":
    default:
      return value;
  }
}