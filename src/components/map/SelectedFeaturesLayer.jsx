import React, { memo, useCallback, useMemo } from "react";
import { GeoJSON } from "react-leaflet";
import L from "leaflet";
import { useSelector } from "react-redux";
import { bindTooltip } from "../../utils";
import {
  SELECTED_FEATURE_STYLE,
  SELECTED_CIRCLE_MARKER_STYLE,
  MULTI_SELECTED_FEATURE_STYLE,
  MULTI_SELECTED_CIRCLE_MARKER_STYLE,
  PANE_ZINDEX,
} from "../../constants";

const SelectedFeaturesLayer = memo(() => {
  const selectedFeature = useSelector(
    (state) => state.map.selectedFeature.feature
  );
  const selectedFeatureMetadata = useSelector(
    (state) => state.map.selectedFeature.metaData
  );

  const multiSelectedFeatures = useSelector(
    (state) => state.map.multiSelectedFeatures || []
  );

  const pointToLayer = useCallback((feature, latlng) => {
    return L.circleMarker(latlng, SELECTED_CIRCLE_MARKER_STYLE);
  }, []);

  const multiPointToLayer = useCallback((feature, latlng) => {
    return L.circleMarker(latlng, MULTI_SELECTED_CIRCLE_MARKER_STYLE);
  }, []);

  const onEachFeature = useCallback(
    (feature, layer) => {
      if (feature.properties) {
        const title =
          feature.properties[
            selectedFeatureMetadata?.portal_layer_map?.label_text_col_nm
          ] || "";
        bindTooltip(layer, feature.properties, title);
      }
    },
    [selectedFeatureMetadata]
  );

  const hasSingle = selectedFeature && selectedFeature.length > 0;
  const hasMulti = multiSelectedFeatures && multiSelectedFeatures.length > 0;

  const singleKey = useMemo(
    () => `selected-single-${selectedFeature?.length || 0}`,
    [selectedFeature?.length]
  );

  const multiKey = useMemo(
    () => `selected-multi-${multiSelectedFeatures.length}`,
    [multiSelectedFeatures.length]
  );

  return (
    <>
      {hasSingle && (
        <GeoJSON
          key={singleKey}
          data={{
            type: "FeatureCollection",
            features: selectedFeature,
          }}
          style={SELECTED_FEATURE_STYLE}
          pointToLayer={pointToLayer}
          onEachFeature={onEachFeature}
          interactive={false}
          pane={`pane-selected-features`}
        />
      )}

      {hasMulti && (
        <GeoJSON
          key={multiKey}
          data={{
            type: "FeatureCollection",
            features: multiSelectedFeatures.map((f) => f.feature),
          }}
          style={MULTI_SELECTED_FEATURE_STYLE}
          pointToLayer={multiPointToLayer}
          onEachFeature={onEachFeature}
          interactive={false}
          pane={`pane-selected-features`}
        />
      )}
    </>
  );
});

SelectedFeaturesLayer.displayName = "SelectedFeaturesLayer";
export default SelectedFeaturesLayer;
