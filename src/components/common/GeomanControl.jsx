import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';

function GeomanControl() {
  const map = useMap();

  useEffect(() => {
    // Check if geoman is already initialized
    if (!map.pm) {
      console.error('Geoman not available on map instance');
      return;
    }

    // Add controls to the map
    map.pm.addControls({
      position: 'topright', // Position of the toolbar
      drawMarker: true,
      drawCircle: true,
      drawPolyline: true,
      drawRectangle: true,
      drawPolygon: true,
      editMode: true,
      dragMode: true,
      cutPolygon: true,
      removalMode: true,
    });

    // Cleanup function
    return () => {
      map.pm.removeControls();
    };
  }, [map]);

  return null;
}

export default GeomanControl;