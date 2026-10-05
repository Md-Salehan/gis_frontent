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
// Cap how far we're willing to expand the search bbox for a point/line
// in case the initial pad misses (e.g. dateline crossing, very high lat).
const MAX_PAD_METERS = 5_000_000; // ~5000 km

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

/** Safe bbox extraction. Returns null if it can't be computed. */
function safeBbox(feature) {
  try {
    const b = turf.bbox(feature);
    if (!b || b.length !== 4) return null;
    // Guard against NaN / Infinity
    for (const v of b) {
      if (!Number.isFinite(v)) return null;
    }
    return b;
  } catch {
    return null;
  }
}

/**
 * Compute a query bbox around a source feature's bbox, expanded by `padMeters`
 * (latitude-aware). Ensures a strictly non-degenerate box so Flatbush
 * always has a valid search region.
 */
function buildQueryBbox(sourceBbox, padMeters) {
  const [minX, minY, maxX, maxY] = sourceBbox;
  const midLat = (minY + maxY) / 2;

  // Use at least a tiny pad so point bboxes become non-degenerate.
  const effectivePad = Math.max(padMeters || 0, 1);
  const { dLat, dLng } = metersToDegreesAtLat(effectivePad, midLat);

  // Ensure dLng/dLat are > 0
  const safeDLng = Math.max(dLng, 1e-9);
  const safeDLat = Math.max(dLat, 1e-9);

  return [
    minX - safeDLng,
    minY - safeDLat,
    maxX + safeDLng,
    maxY + safeDLat,
  ];
}

export function useSpatialQuery({ onComplete, onError } = {}) {
  const { processChunks } = useChunkProcessor();
  const { getIndex, invalidate } = useLayerIndexCache();

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
        const targetFeaturesInput = target.items.map((it) => it.feature);
        //
        // FIX #3: the index is built over EXACTLY the target items. The cache
        // is keyed by layerId + feature count, so a subset of a layer must NOT
        // share the layer's key (a different subset of the same size would get
        // a stale index). Whole-layer queries reuse the per-layer cache;
        // subset queries use a selection-specific key that is dropped as soon
        // as we hold the index, so nothing leaks in the module-level cache.
        const isWholeLayerTarget = target.mode === "layer";
        const cacheKey = isWholeLayerTarget
          ? target.layerId
          : `${target.layerId}::sel:${target.items.map((it) => it.index).join(",")}`;
        const built = await getIndex(cacheKey, targetFeaturesInput, {
          signal,
        });
        if (!isWholeLayerTarget) invalidate(cacheKey);
        if (!built?.index) throw new Error("Failed to build spatial index.");

        const targetIndex = built.index;
        const targetFeaturesCanonical = built.features;
        const targetItemsCanonical = built.items || [];

        if (!targetFeaturesCanonical?.length) {
          throw new Error("Target index is empty.");
        }

        // Map canonical feature -> original item for metadata lookup.
        //
        // FIX #2: `built.items` (from buildSpatialIndex) are internal
        // `{ id, feature, bbox }` wrappers, NOT the original `target.items`
        // ({ layerId, featureId, feature }). We must map canonical features
        // back to the ORIGINAL items so that featureId / layerId metadata
        // (e.g. district_id D001) is preserved in results.
        //
        // We match by feature object identity first (fast path), then fall
        // back to positional index (built.features preserves input order).
        const canonicalToItem = new Map();

        // Fast path: identity map from original item.feature -> item
        const originalByFeature = new Map();
        for (const it of target.items) {
          if (it?.feature) originalByFeature.set(it.feature, it);
        }

        for (let i = 0; i < targetFeaturesCanonical.length; i++) {
          const cf = targetFeaturesCanonical[i];

          // 1) identity match against original items
          let tItem = originalByFeature.get(cf) || null;

          // 2) positional fallback (buildSpatialIndex preserves input order)
          if (!tItem) tItem = target.items[i] || null;

          // 3) last resort — synthesize an item
          if (!tItem) {
            tItem = {
              layerId: target.layerId,
              featureId: `target#${i}`,
              feature: cf,
            };
          }

          canonicalToItem.set(cf, tItem);

          // Also register the internal wrapper if present, in case the
          // canonical feature differs by reference from built.items[i].feature
          const wrapper = targetItemsCanonical[i];
          if (wrapper?.feature && !canonicalToItem.has(wrapper.feature)) {
            canonicalToItem.set(wrapper.feature, tItem);
          }
        }

        // ---- Distance padding ----
        const distanceMeters =
          operation === "within-distance" || operation === "nearest"
            ? convertToMeters(distance, distanceUnit || "meters")
            : 0;
        const basePadMeters = distanceMeters + SAFETY_PAD_METERS;

        // ---- Result accumulation ----
        // Preserve source ordering by inserting in the order features arrive.
        const rowsBySource = new Map();
        const sourceOrder = [];
        let matchedSourceCount = 0;

        const recordSourceMatch = (srcItem, payload) => {
          const key = `${srcItem.layerId}::${srcItem.featureId}`;
          if (!rowsBySource.has(key)) {
            sourceOrder.push(key);
            matchedSourceCount += 1;
          }
          rowsBySource.set(key, payload);
        };

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

            const srcBbox = safeBbox(srcFeature);
            if (!srcBbox) return null;

            // ---- Candidate search ----
            // Start with base pad, then grow if we get nothing.
            // This protects against degenerate points/lines and edge cases.
            //
            // FIX #1: buildSpatialIndex returns a `search(bbox)` wrapper that
            // expects a SINGLE array argument: search([minX, minY, maxX, maxY]).
            // The previous code called it with 4 positional numbers, which
            // made the destructure inside the wrapper produce `undefined`s,
            // causing Flatbush to throw — swallowed by the try/catch — and
            // every source returned 0 candidates → "No matches found".
            const padSteps = [
              basePadMeters,
              basePadMeters * 4,
              basePadMeters * 16,
            ];
            let candidateIndices = [];
            let usedPad = basePadMeters;

            for (let s = 0; s < padSteps.length; s++) {
              const pad = Math.min(padSteps[s], MAX_PAD_METERS);
              const qbox = buildQueryBbox(srcBbox, pad);
              try {
                // ✅ Correct call: pass the bbox array.
                candidateIndices = targetIndex.search(qbox);
                if (!Array.isArray(candidateIndices)) candidateIndices = [];
              } catch (e) {
                candidateIndices = [];
              }
              usedPad = pad;
              if (candidateIndices.length > 0) break;
            }

            // ---- DISJOINT: match iff disjoint from ALL targets ----
            if (operation === "disjoint") {
              // Any candidate that actually intersects disqualifies the source.
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
                } catch (e) {
                  // If intersects throws, treat as non-intersecting (safe default).
                  continue;
                }
              }
              if (!intersectsAny) {
                recordSourceMatch(srcItem, {
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
                if (!Number.isFinite(d)) continue;
                if (d <= distanceMeters) {
                  if (!best || d < best.d || (d === best.d && idx < best.idx)) {
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
                recordSourceMatch(srcItem, {
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
              } catch (e) {
                // Log in dev so future Turf API breakages don't hide silently.
                if (typeof console !== "undefined") {
                  console.warn(
                    `executePredicate failed for op=${operation}:`,
                    e?.message || e,
                  );
                }
                isMatch = false;
              }

              // `nearest` returns { result, distance }; all others return boolean.
              if (isMatch && typeof isMatch === "object") {
                if (isMatch.result === true) {
                  isMatch = true;
                } else {
                  isMatch = false;
                }
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
                  if (!Number.isFinite(measuredDistance)) measuredDistance = null;
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
              const key = `${srcItem.layerId}::${srcItem.featureId}`;
              const existing = rowsBySource.get(key);
              if (existing) {
                existing.matchedTargets.push(...matchedTargets);
                if (operation === "within-distance") {
                  const dists = matchedTargets
                    .map((mt) => mt.distance)
                    .filter((d) => d != null);
                  if (dists.length) {
                    const minD = Math.min(...dists);
                    existing.distance =
                      existing.distance == null
                        ? minD
                        : Math.min(existing.distance, minD);
                  }
                }
              } else {
                let rowDistance = null;
                if (operation === "within-distance") {
                  const dists = matchedTargets
                    .map((mt) => mt.distance)
                    .filter((d) => d != null);
                  if (dists.length) rowDistance = Math.min(...dists);
                }
                recordSourceMatch(srcItem, {
                  source: srcItem,
                  matchedTargets: [...matchedTargets],
                  operation,
                  distance: rowDistance,
                });
              }
            }

            // Silence "usedPad" unused warning in some linters
            void usedPad;

            return null;
          },
        });

        if (signal.aborted) throw new Error("Operation cancelled");

        // Preserve source order for deterministic UI.
        //
        // FIX #4: QueryResultsTable and buildMatchedTargetLayer expect ONE row
        // per (source x matched target) pair shaped
        // { source, target, operation, distance }. Internally we accumulate
        // { source, matchedTargets: [...] } per source, so flatten here.
        const rows = sourceOrder.flatMap((k) => {
          const r = rowsBySource.get(k);
          if (!r) return [];
          return (r.matchedTargets || []).map((t) => ({
            source: r.source,
            target: {
              layerId: t.layerId,
              featureId: t.featureId,
              feature: t.feature,
            },
            operation: r.operation,
            distance: t.distance ?? r.distance ?? null,
          }));
        });

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
    [processChunks, getIndex, invalidate, onComplete, onError],
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