import React from "react";
import { memo, useCallback } from "react";
import { GeoJSON } from "react-leaflet";
import { useSelector } from "react-redux";

const SelectedFeaturesLayer = memo(() => {
  const selectedFeatures = useSelector((state) => state.map.selectedFeatures);

  // Style for selected features (red color, top layer)
  const selectedStyle = useCallback((feature) => {
    return {
      color: '#ff0000',
      weight: 3,
      opacity: 0.8,
      fillColor: '#ff0000',
      fillOpacity: 0.4
    };
  }, []);

  // Create GeoJSON data from selected features
  const selectedFeaturesGeoJson = {
    type: "FeatureCollection",
    features: selectedFeatures
  };

  if (!selectedFeatures || selectedFeatures.length === 0) {
    return null;
  }

  return (
    <GeoJSON
      key={`selected-features-${selectedFeatures.length}`}
      data={selectedFeaturesGeoJson}
      style={selectedStyle}
      interactive={false} // Make it non-interactive to avoid conflicts
    />
  );
});

SelectedFeaturesLayer.displayName = "SelectedFeaturesLayer";
export default SelectedFeaturesLayer;