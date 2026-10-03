// spatialQuery/hooks/useLayerIndexCache.js
import { useCallback, useRef } from "react";
import { buildSpatialIndex } from "../../common/utils/spatialIndex";

const LAYER_INDEX_CACHE = new Map();

/**
 * Build a cache key that uniquely identifies the exact feature set being
 * indexed. Must not collide for two different selections of the same layer
 * that happen to share length, first id, and last id.
 *
 * Uses: layerId + length + first id + last id + a cheap 32-bit checksum
 * over every feature's stable id.
 */
function cacheKey(layerId, features) {
  if (!features?.length) return `${layerId}::empty`;

  const first = features[0];
  const last = features[features.length - 1];
  const firstId = first?.properties?.id ?? first?.id ?? "";
  const lastId = last?.properties?.id ?? last?.id ?? "";

  // Cheap checksum over all feature ids. Uses a simple FNV-like rolling hash.
  let hash = 2166136261 >>> 0; // FNV offset basis
  for (let i = 0; i < features.length; i++) {
    const f = features[i];
    const rawId = f?.properties?.id ?? f?.id ?? i;
    const s = String(rawId);
    for (let j = 0; j < s.length; j++) {
      hash ^= s.charCodeAt(j);
      hash = Math.imul(hash, 16777619) >>> 0; // FNV prime
    }
    // separator to avoid ambiguous concatenations
    hash ^= 0x2c;
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  return `${layerId}::${features.length}::${firstId}::${lastId}::${hash}`;
}

export function useLayerIndexCache() {
  const inflight = useRef(new Map());

  const getIndex = useCallback(
    async (layerId, features, { signal, items } = {}) => {
      if (!layerId || !features?.length) {
        return { index: null, features: [], items: [], featureCount: 0 };
      }

      const key = cacheKey(layerId, features);
      const cached = LAYER_INDEX_CACHE.get(key);
      if (cached) return cached;

      if (inflight.current.has(key)) return inflight.current.get(key);

      const promise = (async () => {
        const built = await buildSpatialIndex(features, { signal, items });
        const entry = {
          index: built.index,
          features: built.features || features,
          items: built.items || [],
          featureCount: features.length,
        };
        if (entry.index) LAYER_INDEX_CACHE.set(key, entry);
        return entry;
      })();

      inflight.current.set(key, promise);
      try {
        return await promise;
      } finally {
        inflight.current.delete(key);
      }
    },
    [],
  );

  const invalidate = useCallback((layerId) => {
    for (const k of [...LAYER_INDEX_CACHE.keys()]) {
      if (k.startsWith(`${layerId}::`)) LAYER_INDEX_CACHE.delete(k);
    }
  }, []);

  const clearAll = useCallback(() => {
    LAYER_INDEX_CACHE.clear();
  }, []);

  return { getIndex, invalidate, clearAll };
}