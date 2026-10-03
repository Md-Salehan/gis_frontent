// spatialQuery/hooks/useLayerIndexCache.js
import { useCallback, useRef } from "react";
import { buildSpatialIndex } from "../../common/utils/spatialIndex";

const LAYER_INDEX_CACHE = new Map();

function cacheKey(layerId, features) {
  if (!features?.length) return `${layerId}::empty`;
  const first = features[0];
  const last = features[features.length - 1];
  // Use object identity of first + last, plus length. This is cheap and
  // disambiguates different subsets of the same layer.
  const firstId = first?.properties?.id ?? first?.id ?? "";
  const lastId = last?.properties?.id ?? last?.id ?? "";
  return `${layerId}::${features.length}::${firstId}::${lastId}`;
}

export function useLayerIndexCache() {
  const inflight = useRef(new Map());

  const getIndex = useCallback(async (layerId, features, { signal } = {}) => {
    if (!layerId || !features?.length) {
      return { index: null, features: [], items: [], featureCount: 0 };
    }

    const key = cacheKey(layerId, features);
    const cached = LAYER_INDEX_CACHE.get(key);
    if (cached) return cached;

    if (inflight.current.has(key)) return inflight.current.get(key);

    const promise = (async () => {
      const built = await buildSpatialIndex(features, { signal });
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
  }, []);

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