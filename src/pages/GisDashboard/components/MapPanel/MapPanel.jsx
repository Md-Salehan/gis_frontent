import React, { memo, useMemo, useCallback } from "react";
import { Button } from "antd";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  ZoomControl,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useDispatch, useSelector } from "react-redux";
import {
  updateViewport,
  setSelectedFeature,
} from "../../../../store/slices/mapSlice";
import MiniMapControl from "../../../../components/common/MiniMapControl";
import BaseMapSwitcher from "../../../../components/common/BaseMapSwitcher";
import GeomanControl from "../../../../components/common/GeomanControl";
import FitBounds from "../../../../components/common/FitBounds";
import { GeoJsonLayerWrapper, Legend } from "../../../../components";
// import MeasureControl from "../../../../components/common/MeasureControl";

// Move utility function outside component
const getColorByValue = (v) => {
  if (v > 80) return "#2b6cb0";
  if (v > 60) return "#4c67b5";
  if (v > 40) return "#7b9ad9";
  if (v > 20) return "#b9c7ee";
  return "#e6eefb";
};


const MapPanel = memo(() => {
  const dispatch = useDispatch();
  // read layers & viewport from redux
  const geoJsonLayers = useSelector((state) => state.map.geoJsonLayers);
  const viewport = useSelector((state) => state.map.viewport);
  const isLegendVisible = useSelector((state) => state.ui.isLegendVisible);





  // Memoize rendered GeoJSON layers
  const renderedLayers = useMemo(
    () =>
      Object.entries(geoJsonLayers || {})
        .filter(([, geoJsonData]) => geoJsonData)
        .map(([layerId, geoJsonData]) => (
          <GeoJsonLayerWrapper
            key={layerId}
            geoJsonData={geoJsonData}
          />
        )),
    [geoJsonLayers]
  );

  const mapSettings = useMemo(
    () => ({
      center: viewport?.center || [52.5208, 13.4049],
      zoom: viewport?.zoom || 13,
      style: { width: "100%", height: "100%" },
      zoomControl: false,
    }),
    [viewport]
  );

  return (
    <div className="map-panel">
      <MapContainer {...mapSettings}>
        <ZoomControl position="bottomright" />
        {/* <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        /> */}
        {/* <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        /> */}
        {/* <TileLayer
          attribution='&copy; CNES, Distribution Airbus DS, © Airbus DS, © PlanetObserver (Contains Copernicus Data) | &copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}{r}.jpg"
        /> */}

        <BaseMapSwitcher />

        <FitBounds geoJsonLayers={geoJsonLayers} />

        {renderedLayers}

        {/* Custom overlay controls */}
        {/* <div className="leaflet-bottom leaflet-right">
          <div className="leaflet-control leaflet-bar">
            <Button size="small">↺</Button>
            <Button size="small">⤢</Button>
            <Button size="small">☰</Button>
          </div>
        </div> */}
        {/* <MeasureControl /> */}
        <GeomanControl />
        <MiniMapControl />
        <Legend visible={isLegendVisible} />
      </MapContainer>
    </div>
  );
});

MapPanel.displayName = "MapPanel";
export default MapPanel;
