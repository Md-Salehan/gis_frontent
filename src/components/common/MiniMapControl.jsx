import React, { useEffect } from 'react'
import "leaflet-minimap/dist/Control.MiniMap.min.css";
import "leaflet-minimap";
import L from "leaflet";
import { useMap } from 'react-leaflet';

function MiniMapControl () {
  const map = useMap();

  useEffect(() => {
    // Create a base layer for the minimap
    const miniMapLayer = new L.TileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      minZoom: 0,
      maxZoom: 20,
      attribution: 'Tiles © Esri'
    });

    // Initialize MiniMap control
    const miniMap = new L.Control.MiniMap(miniMapLayer, {
      toggleDisplay: true, // Add button to show/hide
      minimized: false, // Start expanded
      position: "bottomleft", // Position of minimap
      width: 150,
      height: 150,
      zoomLevelOffset: -5, // smaller zoom on minimap
      aimingRectOptions: { color: "#ff7800", weight: 1, clickable: false },
      shadowRectOptions: { color: "#000000", weight: 1, clickable: false, opacity: 0, fillOpacity: 0 },
    });

    miniMap.addTo(map);

    // Cleanup on unmount
    return () => {
      map.removeControl(miniMap);
    };
  }, [map]);

  return null;
}

export default MiniMapControl 