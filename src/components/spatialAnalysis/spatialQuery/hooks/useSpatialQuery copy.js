// spatialQuery/hooks/useSpatialQuery.js
import { useState, useCallback, useRef } from "react";
import * as turf from "@turf/turf";
import { useChunkProcessor } from "../../../../hooks/useChunkProcessor";
import { useLayerIndexCache } from "./useLayerIndexCache";
import { executePredicate } from "../../common/utils/spatialPredicates";
import { convertToMeters } from "../../../../utils";
import { buildMatchedTargetLayer } from "../utils/matchedTargetLayer";

const CHUNK_SIZE = 500;
const DEGREES_PER_METER = 1 / 111320;
const SAFETY_PAD_METERS = 50;

/** Convert meters to degrees latitude (approximation). */
function metersToDegrees(meters) {
  return meters * DEGREES_PER_METER;
}

/** Convert meters to degrees, accounting for latitude for longitude. */
function metersToDegreesAtLat(meters, lat) {
  const dLat = meters * DEGREES_PER_METER;
  const cosLat = Math.max(0.01, Math.cos((lat * Math.PI) / 180));
  const dLng = dLat / cosLat;
  return { dLat, dLng };
}

export function useSpatialQuery({ onComplete, onError } = {}) {
  const { processChunks } = useChunkProcessor();
  const { getIndex } = useLayerIndexCache();

  const [status, setStatus] = useState("idle");
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

      // ---- Invariants ----
      if (!source?.layerId || !target?.layerId) {
        const err = new Error("Source and Target layers must be selected.");
        setError(err.message);
        onError?.(err);
        return;
      }
      if (source.items?.some((it) => it.layerId !== source.layerId)) {
        const err = new Error(
          "Source feature does not belong to the selected Source layer.",
        );
        setError(err.message);
        onError?.(err);
        return;
      }
      if (target.items?.some((it) => it.layerId !== target.layerId)) {
        const err = new Error(
          "Target feature does not belong to the selected Target layer.",
        );
        setError(err.message);
        onError?.(err);
        return;
      }
      if (!source?.items?.length || !target?.items?.length) {
        const err = new Error(
          "Source and target feature sets are required.",
        );
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
        const err = new Error(
          "A positive distance is required for this operation.",
        );
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
        // ---- Build target index over EXACTLY the target items ----
        const targetFeatures = target.items.map((it) => it.feature);
        const built = await getIndex(target.layerId, targetFeatures, {
          signal,
        });
        if (!built?.index) throw new Error("Failed to build spatial index.");

        const targetIndex = built.index;
        const targetFeaturesCanonical = built.features;
        const targetItemsCanonical = built.items || [];

        // The canonical list maps 1:1 to target.items (same order).
        // Guard: if build reordered, rebuild the mapping from the canonical list.
        const canonicalToItem = new Map();
        for (let i = 0; i < targetFeaturesCanonical.length; i++) {
          const cf = targetFeaturesCanonical[i];
          const tItem =
            targetItemsCanonical[i] ||
            target.items[i] || {
              layerId: target.layerId,
              featureId: `target#${i}`,
              feature: cf,
            };
          canonicalToItem.set(cf, tItem);
        }

        // ---- Distance padding (only for distance/nearest) ----
        const distanceMeters =
          operation === "within-distance" || operation === "nearest"
            ? convertToMeters(distance, distanceUnit || "meters")
            : 0;
        const padMeters = distanceMeters + SAFETY_PAD_METERS;

        // ---- Result accumulation ----
        const rowsBySource = new Map();
        let matchedSourceCount = 0;

        await processChunks(source.items, {
          chunkSize: CHUNK_SIZE,
          signal,
          onProgress: (processed, total) => {
            setProcessedFeatures(processed);
            setProgress(Math.round((processed / total) * 100));
            setMatchCount(matchedSourceCount);
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

            // Latitude-aware padding
            const midLat = (bbox[1] + bbox[3]) / 2;
            const { dLat, dLng } = padMeters
              ? metersToDegreesAtLat(padMeters, midLat)
              : { dLat: 0.0001, dLng: 0.0001 };

            const queryBbox = [
              bbox[0] - dLng,
              bbox[1] - dLat,
              bbox[2] + dLng,
              bbox[3] + dLat,
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

            const sourceKey = `${srcItem.layerId}::${srcItem.featureId}`;

            // ---- DISJOINT: source matches iff disjoint from ALL targets ----
            if (operation === "disjoint") {
              // Candidates are "possible collisions"; if none, definitely disjoint.
              let intersectsAny = false;
              for (const idx of candidateIndices) {
                const tFeature = targetFeaturesCanonical[idx];
                if (!tFeature?.geometry) continue;
                try {
                  if (
                    executePredicate(
                      srcFeature.geometry,
                      tFeature.geometry,
                      "intersects",
                      null,
                      null,
                    )
                  ) {
                    intersectsAny = true;
                    break;
                  }
                } catch {
                  continue;
                }
              }
              if (!intersectsAny) {
                if (!rowsBySource.has(sourceKey)) {
                  matchedSourceCount += 1;
                }
                rowsBySource.set(sourceKey, {
                  source: srcItem,
                  matchedTargets: [],
                  operation,
                  distance: null,
                });
              }
              return null;
            }

            if (!candidateIndices.length) return null;

            // ---- NEAREST: single closest target within distance ----
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
                if (d <= distanceMeters) {
                  // deterministic tie-break by canonical index
                  if (
                    !best ||
                    d < best.d ||
                    (d === best.d && idx < best.idx)
                  ) {
                    best = { idx, tFeature, d };
                  }
                }
              }
              if (best) {
                const tItem = canonicalToItem.get(best.tFeature) || {
                  layerId: target.layerId,
                  featureId: `target#${best.idx}`,
                  feature: best.tFeature,
                };
                if (!rowsBySource.has(sourceKey)) matchedSourceCount += 1;
                rowsBySource.set(sourceKey, {
                  source: srcItem,
                  matchedTargets: [
                    {
                      layerId: tItem.layerId,
                      featureId: tItem.featureId,
                      feature: tItem.feature,
                      distance: best.d,
                    },
                  ],
                  operation,
                  distance: best.d,
                });
              }
              return null;
            }

            // ---- All other predicates: accumulate matches ----
            const matchedTargets = [];
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
                  // Use true geometry-to-geometry distance
                  const d = turf.distance(
                    turf.centroid(srcFeature),
                    turf.centroid(tFeature),
                    { units: "meters" },
                  );
                  measuredDistance = d;
                } catch {
                  measuredDistance = null;
                }
              }

              matchedTargets.push({
                layerId: tItem.layerId,
                featureId: tItem.featureId,
                feature: tItem.feature,
                distance: measuredDistance,
              });
            }

            if (matchedTargets.length) {
              if (!rowsBySource.has(sourceKey)) matchedSourceCount += 1;
              let row = rowsBySource.get(sourceKey);
              if (!row) {
                row = {
                  source: srcItem,
                  matchedTargets: [],
                  operation,
                  distance: null,
                };
                rowsBySource.set(sourceKey, row);
              }
              if (operation === "within-distance") {
                const dists = matchedTargets
                  .map((mt) => mt.distance)
                  .filter((d) => d != null);
                if (dists.length) {
                  const minD = Math.min(...dists);
                  row.distance =
                    row.distance == null ? minD : Math.min(row.distance, minD);
                }
              }
              row.matchedTargets.push(...matchedTargets);
            }

            return null;
          },
        });

        if (signal.aborted) throw new Error("Operation cancelled");

        const rows = [...rowsBySource.values()];
        const matched = buildMatchedTargetLayer(rows, layerMetaByName || {});

        setResultRows(rows);
        setMatchedTargetLayer(matched);
        setMatchCount(rows.length);
        setStatus("complete");
        setProgress(100);
        setProcessedFeatures(source.items.length);

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