import React, { memo, useCallback } from "react";
import { GeoJSON } from "react-leaflet";
import L from "leaflet";
import { useSelector } from "react-redux";
import { bindTooltip } from "../../utils";

const SelectedFeaturesLayer = memo(() => {
  const selectedFeature = useSelector(
    (state) => state.map.selectedFeature.feature
  );
  const selectedFeatureMetadata = useSelector(
    (state) => state.map.selectedFeature.metaData
  );

  // read multi-selected features (array) from redux
  const multiSelectedFeatures = useSelector(
    (state) => state.map.multiSelectedFeatures || []
  );

  const selectedStyle = useCallback((feature) => {
    return {
      color: "#ff0000",
      weight: 3,
      opacity: 0.8,
      fillColor: "#ff0000",
      fillOpacity: 0.6,
    };
  }, []);

  // yellow style for multi-selected
  const multiSelectedStyle = useCallback((feature) => {
    return {
      color: "#ffbf00",
      weight: 2,
      opacity: 0.9,
      fillColor: "#fff7cc",
      fillOpacity: 0.6,
    };
  }, []);

  // Use circle markers for Point features
  const pointToLayer = useCallback((feature, latlng) => {
    return L.circleMarker(latlng, {
      radius: 10,
      color: "#ff0000",
      weight: 2,
      opacity: 0.9,
      fillColor: "#ff0000",
      fillOpacity: 0.6,
    });
  }, []);

  const multiPointToLayer = useCallback((feature, latlng) => {
    return L.circleMarker(latlng, {
      radius: 8,
      color: "#ffbf00",
      weight: 2,
      opacity: 0.9,
      fillColor: "#fff7cc",
      fillOpacity: 0.6,
    });
  }, []);

  // Handle feature events - add tooltips
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

  // for multi-selected we don't assume a single metadata; use properties only
  const onEachMultiFeature = useCallback((feature, layer) => {
    if (feature.properties) {
      bindTooltip(layer, feature.properties, "");
    }
  }, []);

  const hasSingle = selectedFeature && selectedFeature.length > 0;
  const hasMulti = multiSelectedFeatures && multiSelectedFeatures.length > 0;

  return (
    <>
      {hasSingle && (
        <GeoJSON
          key={`selected-features-single-${
            selectedFeature.length
          }-${Date.now()}`}
          data={{
            type: "FeatureCollection",
            features: selectedFeature,
          }}
          style={selectedStyle}
          pointToLayer={pointToLayer}
          onEachFeature={onEachFeature}
          interactive={false}
          pane="pane-selected-features"
        />
      )}

      {hasMulti && (
        <GeoJSON
          key={`selected-features-multi-${
            multiSelectedFeatures.length
          }-${Date.now()}`}
          data={{
            type: "FeatureCollection",
            // multiSelectedFeatures may include __layerId but are valid Feature objects
            features: multiSelectedFeatures.map((f) => {
              // strip helper fields to keep valid GeoJSON
              const clone = { ...f };
              delete clone.__layerId;
              return clone;
            }),
          }}
          style={multiSelectedStyle}
          pointToLayer={multiPointToLayer}
          onEachFeature={onEachMultiFeature}
          interactive={false}
          pane="pane-selected-features"
        />
      )}
    </>
  );
});

SelectedFeaturesLayer.displayName = "SelectedFeaturesLayer";
export default SelectedFeaturesLayer;
