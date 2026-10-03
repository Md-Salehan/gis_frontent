// spatialQuery/utils/normalizeQueryConfig.js

/**
 * Stable per-feature identity. Prefers conventional id-like props, falls back
 * to `${layerId}#${index}`.
 */
export function featureIdOf(layerId, index, feature) {
  const props = feature?.properties || {};
  const candidate =
    props.id ??
    props.feature_id ??
    props.fid ??
    props.OBJECTID ??
    props.NAME ??
    null;
  return candidate !== null && candidate !== undefined
    ? String(candidate)
    : `${layerId}#${index}`;
}

/** Indices → items[] for one side of the query. */
export function resolveItems(layerData, layerId, indices) {
  const features = layerData?.geoJsonData?.features || [];
  const out = [];
  for (const idx of indices || []) {
    const feature = features[idx];
    if (!feature) continue;
    out.push({
      layerId,
      index: idx,
      featureId: featureIdOf(layerId, idx, feature),
      feature,
    });
  }
  return out;
}

/** Whole-layer helper. */
export function resolveWholeLayer(layerData, layerId) {
  const features = layerData?.geoJsonData?.features || [];
  return resolveItems(
    layerData,
    layerId,
    features.map((_, i) => i),
  );
}

/**
 * Build the normalized query config the engine consumes.
 *
 * Enforces the single-layer invariant:
 *   - exactly one source.layerId
 *   - exactly one target.layerId
 *   - every item on each side shares that layerId
 */
export function normalizeQueryConfig({
  sourceLayerId,
  sourceMode,
  sourceFeatureIndices,
  targetLayerId,
  targetMode,
  targetFeatureIndices,
  layerDataById,
  operation,
  distance,
  distanceUnit,
}) {
  const sourceLayerData = sourceLayerId ? layerDataById[sourceLayerId] : null;
  const targetLayerData = targetLayerId ? layerDataById[targetLayerId] : null;

  const sourceItems =
    sourceMode === "layer"
      ? resolveWholeLayer(sourceLayerData, sourceLayerId)
      : resolveItems(sourceLayerData, sourceLayerId, sourceFeatureIndices);

  const targetItems =
    targetMode === "layer"
      ? resolveWholeLayer(targetLayerData, targetLayerId)
      : resolveItems(targetLayerData, targetLayerId, targetFeatureIndices);

  // Single-layer invariant checks
  if (sourceItems.some((it) => it.layerId !== sourceLayerId)) {
    throw new Error(
      "Source feature does not belong to the selected Source layer.",
    );
  }
  if (targetItems.some((it) => it.layerId !== targetLayerId)) {
    throw new Error(
      "Target feature does not belong to the selected Target layer.",
    );
  }

  return {
    source: { mode: sourceMode, layerId: sourceLayerId, items: sourceItems },
    target: { mode: targetMode, layerId: targetLayerId, items: targetItems },
    operation,
    distance,
    distanceUnit,
  };
}