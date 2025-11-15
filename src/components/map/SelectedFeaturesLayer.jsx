import React, { memo, useCallback } from "react";
import { GeoJSON } from "react-leaflet";
import L from "leaflet";
import { useSelector } from "react-redux";
import { bindTooltip } from "../../utils";

const SelectedFeaturesLayer = memo(() => {
  const selectedFeatures = useSelector((state) => state.map.selectedFeatures.feature);
  const selectedFeaturesMetadata = useSelector((state) => state.map.selectedFeatures.metaData);

  const selectedStyle = useCallback((feature) => {
    return {
      color: "#ff0000",
      weight: 3,
      opacity: 0.8,
      fillColor: "#ff0000",
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

  // Handle feature events - add tooltips
  const onEachFeature = useCallback((feature, layer) => {
    if (feature.properties) {
      const title =
      
          feature.properties[selectedFeaturesMetadata?.portal_layer_map?.label_text_col_nm] ||
          "";
      bindTooltip(layer, feature.properties, title);
    }
  }, [selectedFeaturesMetadata]);

  if (!selectedFeatures || selectedFeatures.length === 0) {
    return null;
  }

  const selectedFeaturesGeoJson = {
    type: "FeatureCollection",
    features: selectedFeatures,
  };

  return (
    <GeoJSON
      key={`selected-features-${selectedFeatures.length}-${Date.now()}`}
      data={selectedFeaturesGeoJson}
      style={selectedStyle}
      pointToLayer={pointToLayer}
      onEachFeature={onEachFeature}
      interactive={false}
    />
  );
});

SelectedFeaturesLayer.displayName = "SelectedFeaturesLayer";
export default SelectedFeaturesLayer;
