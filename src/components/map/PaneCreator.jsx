import React, { useEffect } from 'react'
import { useMap } from 'react-leaflet';

const PaneCreator = ({ panes = [] }) => {
  const map = useMap();
  useEffect(() => {
    panes.forEach(({ name, zIndex }) => {
      // create pane if missing
      if (!map.getPane(name)) {
        map.createPane(name);
      }
      const p = map.getPane(name);
      if (p) p.style.zIndex = String(zIndex);
    });
    // keep effect dependent on panes
  }, [map, panes]);
  return null;
};

export default PaneCreator