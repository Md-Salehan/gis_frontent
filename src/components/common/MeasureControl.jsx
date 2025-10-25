import React, { useEffect } from "react";
import "leaflet-measure";
import "leaflet-measure/dist/leaflet-measure.css";

import { useMap } from "react-leaflet";
import L from "leaflet";


function MeasureControl() {
  const map = useMap();

  useEffect(() => {
    // Remove existing measure control if any (avoid duplicates on hot reload)
    const existing = document.querySelector(".leaflet-control-measure");
    if (existing) existing.remove();

    const measureControl = new L.Control.Measure({
      position: "topleft", // top left of the map
      primaryLengthUnit: "meters", // main distance unit
      secondaryLengthUnit: "kilometers",
      primaryAreaUnit: "sqmeters",
      secondaryAreaUnit: "hectares",
      activeColor: "#db4a29",
      completedColor: "#9b2d14",
      captureZIndex: 10000, // Important: prevents map from moving while measuring
    });

    measureControl.addTo(map);

    return () => {
      map.removeControl(measureControl);
    };
  }, [map]);

  return null;
}

export default MeasureControl;
