// spatialQuery/utils/matchedTargetLayer.js

/**
 * Build a GeoJSON FeatureCollection of matched TARGET features enriched
 * with source / target / query metadata.
 *
 * Deduplicated by target feature id: each target feature appears once,
 * even if matched by multiple source features. Source info is aggregated
 * into arrays.
 *
 * @param {Array<{source:{layerId,featureId,feature}, matchedTargets:Array,
 *               operation:string, distance:number|null}>} rows
 * @param {Object} meta - { sourceLayerName, targetLayerName }
 * @returns {Object} GeoJSON FeatureCollection
 */
export function buildMatchedTargetLayer(rows, meta) {
  const { sourceLayerName = "", targetLayerName = "" } = meta || {};

  // targetKey -> { feature, props, sourceFeatureIds: [], sourceLabels: [] }
  const byTarget = new Map();

  let matchId = 0;
  for (const row of rows || []) {
    const srcProps = row.source.feature?.properties || {};
    const srcLabel =
      srcProps.name ??
      srcProps.NAME ??
      srcProps.label ??
      srcProps.id ??
      row.source.featureId;

    for (const mt of row.matchedTargets || []) {
      const tgtProps = mt.feature?.properties || {};
      const tKey = `${mt.layerId}::${mt.featureId}`;

      let entry = byTarget.get(tKey);
      if (!entry) {
        entry = {
          feature: mt.feature,
          props: { ...tgtProps },
          sourceFeatureIds: [],
          sourceLabels: [],
          sourceLayerIds: [],
          operations: new Set(),
          distances: [],
          matchIds: [],
          targetLayerId: mt.layerId,
          targetFeatureId: mt.featureId,
          targetLabel:
            tgtProps.name ??
            tgtProps.NAME ??
            tgtProps.label ??
            tgtProps.id ??
            mt.featureId,
        };
        byTarget.set(tKey, entry);
      }

      if (!entry.sourceFeatureIds.includes(row.source.featureId)) {
        entry.sourceFeatureIds.push(row.source.featureId);
        entry.sourceLabels.push(String(srcLabel));
        entry.sourceLayerIds.push(row.source.layerId);
      }
      entry.operations.add(row.operation);
      if (mt.distance != null) entry.distances.push(mt.distance);
      entry.matchIds.push(matchId++);
    }
  }

  const features = [];
  for (const entry of byTarget.values()) {
    const minDistance = entry.distances.length
      ? Math.min(...entry.distances)
      : null;

    features.push({
      type: "Feature",
      id: `${entry.targetFeatureId}__${entry.sourceFeatureIds.join("_")}`,
      geometry: entry.feature.geometry,
      properties: {
        ...entry.props,
        _sq_source_layer: sourceLayerName || entry.sourceLayerIds[0],
        _sq_source_layer_id: entry.sourceLayerIds[0],
        _sq_source_features: entry.sourceLabels.join(", "),
        _sq_source_feature_ids: entry.sourceFeatureIds.join(", "),
        _sq_target_layer: targetLayerName || entry.targetLayerId,
        _sq_target_layer_id: entry.targetLayerId,
        _sq_target_feature: String(entry.targetLabel),
        _sq_target_feature_id: entry.targetFeatureId,
        _sq_operation: [...entry.operations].join("|"),
        _sq_distance_m:
          minDistance != null
            ? Math.round(minDistance * 1000) / 1000
            : null,
        _sq_match_count: entry.sourceFeatureIds.length,
      },
    });
  }

  return { type: "FeatureCollection", features };
}