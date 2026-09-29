// hooks/useSpatialJoin.js
import { useState, useCallback, useRef } from "react";
import * as turf from "@turf/turf";
import { buildSpatialIndex } from "../utils/spatialIndex";
import { processInChunks } from "./useChunkProcessor";
import {
  executePredicate,
  isGeometryTypeCompatible,
} from "../utils/spatialPredicates";
import { getCompatiblePredicates } from "../utils/compatibilityMatrix";
import { copyProperties, resolveFieldCollisions } from "../utils/fieldUtils";
import { convertToMeters } from "../../../../utils";

const CHUNK_SIZE = 500;

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

      console.log("xxw Target features :", targetFeatures.length, targetFeatures);
      console.log("xxw Join features :", joinFeatures.length, joinFeatures);

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

        if (!indexResult.index) {
          throw new Error("Failed to build spatial index");
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
              totalMatchCount += chunkMatches;
              console.log(
                `Chunk ${chunkIndex + 1} completed with ${chunkMatches} matches`,
              );
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
            );
            console.log(
              `xxw Feature matches ${index}: ${matchingFeatures.length}`,
              {
                feature,
                indexResult,
                predicate,
                distance,
                distanceUnit,
              },
            );

            let featureMatchCount = 0;
            let isMatchingAvailable =
              matchingFeatures && matchingFeatures.length > 0;

            // if (matchingFeatures && matchingFeatures.length > 0) {
            // Create result feature(s) based on match strategy
            if (matchStrategy === "first" || matchStrategy === "aggregate") {
              // Only take first match or aggregate
              const resultFeature = createResultFeature(
                feature,
                isMatchingAvailable ? matchingFeatures : [],
                matchStrategy,
                aggregation,
                fieldsToCopy,
                fieldPrefix,
              );
              if (resultFeature) {
                resultFeatures.push(resultFeature);
                featureMatchCount =
                  matchStrategy === "aggregate"
                    ? matchingFeatures.length
                    : isMatchingAvailable
                      ? 1
                      : 0;
              }
            } else {
              // All matches - create one result per match
              for (const match of matchingFeatures) {
                const resultFeature = createResultFeature(
                  feature,
                  isMatchingAvailable ? [match] : [],
                  "first",
                  null,
                  fieldsToCopy,
                  fieldPrefix,
                );
                if (resultFeature) {
                  resultFeatures.push(resultFeature);
                }
              }
              featureMatchCount = isMatchingAvailable
                ? matchingFeatures.length
                : 0;
            }
            // }
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

// Helper: Find matches for a single feature using Flatbush
function findMatches(
  targetFeature,
  indexResult,
  predicate,
  distance,
  distanceUnit,
) {
  const { index, features, items } = indexResult;
  console.log("xxw findMatches called", {
    targetFeature,
    indexResult,
    predicate,
    distance,
    distanceUnit,
  });
  if (!index || !features) return [];

  // Get target geometry
  const targetGeometry = targetFeature.geometry;
  if (!targetGeometry) return [];
  console.log("xxw Target geometry:", targetGeometry);

  const targetType = targetGeometry.type;
  
  // For distance-based predicates, use the distance directly for bbox expansion
  if (predicate === "within-distance" || predicate === "nearest") {
    const distanceInMeters = convertToMeters(distance || 1000, distanceUnit || "meters");
    
    // Convert distance to degrees (approximate)
    const distanceInDegrees = distanceInMeters / 111320; // 1 degree ≈ 111.32 km at equator
    
    // Get the point coordinates
    let coords;
    if (targetType === 'Point') {
      coords = targetGeometry.coordinates;
    } else if (targetType === 'MultiPoint') {
      coords = targetGeometry.coordinates[0] || [0, 0];
    } else {
      // For other geometries, use centroid
      try {
        const centroid = turf.centroid(targetFeature);
        coords = centroid.geometry.coordinates;
      } catch {
        coords = [0, 0];
      }
    }
    
    // Create expanded bbox for distance search
    const expandedBbox = [
      coords[0] - distanceInDegrees,
      coords[1] - distanceInDegrees,
      coords[0] + distanceInDegrees,
      coords[1] + distanceInDegrees
    ];
    
    console.log("xxw Expanded bbox for distance search:", expandedBbox);
    console.log("xxw Distance in meters:", distanceInMeters);
    console.log("xxw Distance in degrees:", distanceInDegrees);
    console.log("xxw Original coords:", coords);
    
    // Search with expanded bbox
    let candidateIndices = index.search(expandedBbox);
    console.log("xxw Candidate indices after expanded search:", candidateIndices);
    
    // If still no candidates, try with a larger bbox (2x the distance)
    if (candidateIndices.length === 0) {
      const largerBbox = [
        coords[0] - distanceInDegrees * 2,
        coords[1] - distanceInDegrees * 2,
        coords[0] + distanceInDegrees * 2,
        coords[1] + distanceInDegrees * 2
      ];
      console.log("xxw Trying larger bbox:", largerBbox);
      candidateIndices = index.search(largerBbox);
      console.log("xxw Candidate indices after larger search:", candidateIndices);
    }
    
    if (candidateIndices.length === 0) {
      console.log("xxw No candidates found in spatial index");
      return [];
    }
    
    // Filter candidates by exact predicate
    const matches = [];

    console.log("xxw Target feature coordinates:", targetFeature.geometry.coordinates);
    console.log(
      "xxw Join features coordinates:",
      features.map((f) => f.geometry.coordinates),
    );

    for (const idx of candidateIndices) {
      const joinFeature = features[idx];
      if (!joinFeature) continue;

      const joinGeometry = joinFeature.geometry;
      if (!joinGeometry) continue;

      const actualDistance = turf.distance(targetFeature, joinFeature, {
        units: "meters",
      });
      console.log(
        `xxw Distance between feature and candidate ${idx}: ${actualDistance} meters`,
      );

      // Execute predicate - this will check if within distance
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
          distance: actualDistance, // Use the actual distance we calculated
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
  
  // For non-distance predicates (contains, intersects, etc.)
  // Get target bbox for spatial index query
  let bbox;
  try {
    bbox = turf.bbox(targetFeature);
  } catch (error) {
    console.warn("Failed to calculate bbox:", error);
    return [];
  }
  
  // For points, expand the bbox slightly
  if (targetType === 'Point' || targetType === 'MultiPoint') {
    const expansionFactor = 0.0001; // ~11 meters - small expansion for exact matches
    bbox = [
      bbox[0] - expansionFactor,
      bbox[1] - expansionFactor,
      bbox[2] + expansionFactor,
      bbox[3] + expansionFactor
    ];
  }
  
  console.log("xxw Target bbox for non-distance predicate:", bbox);
  console.log("xxw Index bbox:", index.bbox);

  // Query spatial index for candidates
  let candidateIndices = index.search(bbox);
  console.log("xxw Candidate indices from search:", candidateIndices);

  if (candidateIndices.length === 0) {
    console.log("xxw No candidates found in spatial index");
    return [];
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
        distance: null,
        index: idx,
      });
    }
  }

  return matches;
}

// Helper: Create result feature
function createResultFeature(
  targetFeature,
  matches, // Array of matching features
  matchStrategy, // "first" | "aggregate"
  aggregation, // "count" | "sum" | "average" | "min" | "max" | "concatenate" | null
  fieldsToCopy,
  fieldPrefix,
) {
  // if (matches.length === 0) return null;

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
        match?.feature?.properties || {},
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
  // resultFeature.properties._join_count = matches.length;
  // if (matches.length > 0 && matches[0].distance !== null) {
  //   resultFeature.properties._nearest_distance = matches[0].distance;
  // }

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
        const minVal = Math.min(...values.filter((v) => typeof v === "number"));
        result[field] = isFinite(minVal) ? minVal : values[0];
        break;
      case "max":
        const maxVal = Math.max(...values.filter((v) => typeof v === "number"));
        result[field] = isFinite(maxVal) ? maxVal : values[0];
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
