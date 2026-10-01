// spatialQuery/hooks/useLayerIndexCache.js
import { useCallback, useRef } from "react";
import { buildSpatialIndex } from "../../common/utils/spatialIndex";

/** Module-level cache so it survives component remounts. */
const LAYER_INDEX_CACHE = new Map();

/**
 * Persistent per-layer Flatbush index cache.
 * Auto-invalidates when the feature count for a layer changes.
 */
export function useLayerIndexCache() {
  const inflight = useRef(new Map());

  const getIndex = useCallback(async (layerId, features, { signal } = {}) => {
    if (!layerId || !features?.length) {
      return { index: null, features: [], items: [], featureCount: 0 };
    }

    const cached = LAYER_INDEX_CACHE.get(layerId);
    if (cached && cached.featureCount === features.length) return cached;

    if (inflight.current.has(layerId)) return inflight.current.get(layerId);

    const promise = (async () => {
      const built = await buildSpatialIndex(features, { signal });
      const entry = {
        index: built.index,
        features: built.features || features,
        items: built.items || [],
        featureCount: features.length,
      };
      if (entry.index) LAYER_INDEX_CACHE.set(layerId, entry);
      return entry;
    })();

    inflight.current.set(layerId, promise);
    try {
      return await promise;
    } finally {
      inflight.current.delete(layerId);
    }
  }, []);

  const invalidate = useCallback((layerId) => {
    LAYER_INDEX_CACHE.delete(layerId);
  }, []);

  const clearAll = useCallback(() => {
    LAYER_INDEX_CACHE.clear();
  }, []);

  return { getIndex, invalidate, clearAll };
}