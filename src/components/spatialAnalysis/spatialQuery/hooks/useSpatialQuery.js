// spatialQuery/hooks/useSpatialQuery.js
import { useState, useCallback, useRef } from "react";
import * as turf from "@turf/turf";
import { useChunkProcessor } from "../../../../hooks/useChunkProcessor";
import { useLayerIndexCache } from "./useLayerIndexCache";
import { executePredicate } from "../../common/utils/spatialPredicates";
import { convertToMeters } from "../../../../utils";
import { buildMatchedTargetLayer } from "../utils/matchedTargetLayer";

const CHUNK_SIZE = 500;
const DEGREES_PER_METER = 1 / 111320; // rough, for candidate bbox padding only

/**
 * Spatial Query engine.
 * Reuses existing buildSpatialIndex (via useLayerIndexCache),
 * existing useChunkProcessor, existing executePredicate.
 *
 * Emits one result row per (source × matched target) pair.
 */
export function useSpatialQuery({ onComplete, onError } = {}) {
  const { processChunks } = useChunkProcessor();
  const { getIndex } = useLayerIndexCache();

  const [status, setStatus] = useState("idle"); // idle | processing | complete | error
  const [progress, setProgress] = useState(0);
  const [totalFeatures, setTotalFeatures] = useState(0);
  const [processedFeatures, setProcessedFeatures] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [resultRows, setResultRows] = useState(null);
  const [matchedTargetLayer, setMatchedTargetLayer] = useState(null);
  const [error, setError] = useState(null);

  const abortControllerRef = useRef(null);
  const processingRef = useRef(false);

  const isProcessing = status === "processing";
  const isComplete = status === "complete";

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    if (processingRef.current) cancel();
    setStatus("idle");
    setProgress(0);
    setTotalFeatures(0);
    setProcessedFeatures(0);
    setMatchCount(0);
    setResultRows(null);
    setMatchedTargetLayer(null);
    setError(null);
  }, [cancel]);

  const startQuery = useCallback(
    async (normalized, layerMetaByName) => {
      if (processingRef.current) return;

      const { source, target, operation, distance, distanceUnit } = normalized;

      // ---- Validate ----
      if (!source?.items?.length || !target?.items?.length) {
        const err = new Error("Source and target feature sets are required.");
        setError(err.message);
        onError?.(err);
        return;
      }
      if (!operation) {
        const err = new Error("Spatial operation is required.");
        setError(err.message);
        onError?.(err);
        return;
      }
      if (
        (operation === "within-distance" || operation === "nearest") &&
        (!distance || distance <= 0)
      ) {
        const err = new Error("A positive distance is required for this operation.");
        setError(err.message);
        onError?.(err);
        return;
      }

      // ---- Reset ----
      setStatus("processing");
      setError(null);
      setResultRows(null);
      setMatchedTargetLayer(null);
      setProgress(0);
      setTotalFeatures(source.items.length);
      setProcessedFeatures(0);
      setMatchCount(0);
      processingRef.current = true;

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const { signal } = controller;

      try {
        // ---- Build / reuse target spatial index ----
        const targetFeatures = target.items.map((it) => it.feature);
        const built = await getIndex(target.layerId, targetFeatures, { signal });
        if (!built?.index) throw new Error("Failed to build spatial index.");
        const targetIndex = built.index;
        const targetFeaturesCanonical = built.features;

        // Lookup from canonical index → original target item (for metadata).
        const canonicalToItem = new Map();
        for (const it of target.items) {
          canonicalToItem.set(it.feature, it);
        }

        // Distance padding for candidate bbox (only for distance-based ops).
        const padDegrees =
          operation === "within-distance" || operation === "nearest"
            ? convertToMeters(distance, distanceUnit || "meters") *
              DEGREES_PER_METER
            : 0.0001;

        const rows = [];
        let localMatches = 0;

        await processChunks(source.items, {
          chunkSize: CHUNK_SIZE,
          signal,
          onProgress: (processed, total) => {
            setProcessedFeatures(processed);
            setProgress(Math.round((processed / total) * 100));
            setMatchCount(localMatches);
          },
          processor: async (srcItem) => {
            const srcFeature = srcItem.feature;
            if (!srcFeature?.geometry) return null;

            let bbox;
            try {
              bbox = turf.bbox(srcFeature);
            } catch {
              return null;
            }

            const queryBbox = [
              bbox[0] - padDegrees,
              bbox[1] - padDegrees,
              bbox[2] + padDegrees,
              bbox[3] + padDegrees,
            ];

            let candidateIndices = [];
            try {
              candidateIndices = targetIndex.search(
                queryBbox[0],
                queryBbox[1],
                queryBbox[2],
                queryBbox[3],
              );
            } catch {
              candidateIndices = [];
            }

            if (!candidateIndices.length) return null;

            // For `nearest`, keep only the closest across all candidates.
            if (operation === "nearest") {
              let best = null;
              for (const idx of candidateIndices) {
                const tFeature = targetFeaturesCanonical[idx];
                if (!tFeature?.geometry) continue;
                let d;
                try {
                  d = turf.distance(srcFeature, tFeature, { units: "meters" });
                } catch {
                  continue;
                }
                if (d <= distance && (!best || d < best.d)) {
                  best = { idx, tFeature, d };
                }
              }
              if (best) {
                const tItem = canonicalToItem.get(best.tFeature) || {
                  layerId: target.layerId,
                  featureId: `target#${best.idx}`,
                  feature: best.tFeature,
                };
                rows.push({
                  source: srcItem,
                  target: { ...tItem },
                  operation,
                  distance: best.d,
                });
                localMatches += 1;
              }
              return null;
            }

            // Non-nearest operations.
            for (const idx of candidateIndices) {
              const tFeature = targetFeaturesCanonical[idx];
              if (!tFeature?.geometry) continue;

              let isMatch = false;
              try {
                isMatch = executePredicate(
                  srcFeature.geometry,
                  tFeature.geometry,
                  operation,
                  distance,
                  distanceUnit,
                );
              } catch {
                isMatch = false;
              }
              if (!isMatch) continue;

              const tItem = canonicalToItem.get(tFeature) || {
                layerId: target.layerId,
                featureId: `target#${idx}`,
                feature: tFeature,
              };

              let measuredDistance = null;
              if (operation === "within-distance") {
                try {
                  measuredDistance = turf.distance(srcFeature, tFeature, {
                    units: "meters",
                  });
                } catch {
                  measuredDistance = null;
                }
              }

              rows.push({
                source: srcItem,
                target: { ...tItem },
                operation,
                distance: measuredDistance,
              });
              localMatches += 1;
            }
            return null;
          },
        });

        if (signal.aborted) throw new Error("Operation cancelled");

        // ---- Build matched target layer ----
        const matched = buildMatchedTargetLayer(rows, layerMetaByName || {});

        setResultRows(rows);
        setMatchedTargetLayer(matched);
        setMatchCount(rows.length);
        setStatus("complete");
        setProgress(100);

        onComplete?.({ rows, matchedTargetLayer: matched, operation });
      } catch (err) {
        if (
          err?.name === "AbortError" ||
          err?.message === "Operation cancelled"
        ) {
          setStatus("idle");
          setError(null);
        } else {
          setStatus("error");
          setError(err?.message || "Spatial query failed.");
          onError?.(err);
        }
      } finally {
        processingRef.current = false;
        abortControllerRef.current = null;
      }
    },
    [processChunks, getIndex, onComplete, onError],
  );

  return {
    status,
    progress,
    totalFeatures,
    processedFeatures,
    matchCount,
    resultRows,
    matchedTargetLayer,
    error,
    startQuery,
    cancel,
    reset,
    isProcessing,
    isComplete,
  };
}