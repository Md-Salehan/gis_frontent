// spatialQuery/utils/matchedTargetLayer.js

/**
 * Build a FeatureCollection of matched target features enriched with
 * source / target / query metadata.
 *
 * One target feature instance per (source × target) pair, so provenance
 * stays visible at the feature level.
 *
 * @param {Array<{source:{layerId,featureId,feature}, target:{layerId,featureId,feature},
 *               operation:string, distance:number|null}>} rows
 * @param {Object} meta - { sourceLayerName, targetLayerName }
 * @returns {Object} GeoJSON FeatureCollection
 */
export function buildMatchedTargetLayer(rows, meta) {
  const { sourceLayerName = "", targetLayerName = "" } = meta || {};

  const features = (rows || []).map((row, i) => {
    const srcProps = row.source.feature?.properties || {};
    const tgtProps = row.target.feature?.properties || {};

    const srcLabel =
      srcProps.name ??
      srcProps.NAME ??
      srcProps.label ??
      srcProps.id ??
      row.source.featureId;

    const tgtLabel =
      tgtProps.name ??
      tgtProps.NAME ??
      tgtProps.label ??
      tgtProps.id ??
      row.target.featureId;

    return {
      type: "Feature",
      id: `${row.target.featureId}__${row.source.featureId}__${i}`,
      geometry: row.target.feature.geometry,
      properties: {
        // Original target properties preserved.
        ...tgtProps,

        // Spatial Query metadata appended.
        _sq_match_id: i,
        _sq_source_layer: sourceLayerName || row.source.layerId,
        _sq_source_layer_id: row.source.layerId,
        _sq_source_feature: String(srcLabel),
        _sq_source_feature_id: row.source.featureId,
        _sq_target_layer: targetLayerName || row.target.layerId,
        _sq_target_layer_id: row.target.layerId,
        _sq_target_feature: String(tgtLabel),
        _sq_target_feature_id: row.target.featureId,
        _sq_operation: row.operation,
        _sq_distance_m:
          row.distance !== null && row.distance !== undefined
            ? Math.round(row.distance * 1000) / 1000
            : null,
      },
    };
  });

  return { type: "FeatureCollection", features };
}