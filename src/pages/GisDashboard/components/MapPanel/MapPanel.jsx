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
// import MeasureControl from "../../../../components/common/MeasureControl";

// Move utility function outside component
const getColorByValue = (v) => {
  if (v > 80) return "#2b6cb0";
  if (v > 60) return "#4c67b5";
  if (v > 40) return "#7b9ad9";
  if (v > 20) return "#b9c7ee";
  return "#e6eefb";
};

// // FitBounds component (keeps as side-effect)
// const FitBounds = memo(({ geoJsonLayers }) => {
//   const map = useMap();

//   React.useEffect(() => {
//     if (!map || !geoJsonLayers) return;

//     const timeoutId = setTimeout(() => {
//       try {
//         map.invalidateSize();

//         const entries = Object.entries(geoJsonLayers || {}).filter(
//           ([, data]) => !!data
//         );
//         if (entries.length === 0) return;

//         let combinedBounds = null;
//         for (const [, data] of entries) {
//           try {
//             const tmp = L.geoJSON(data);
//             const b = tmp.getBounds();
//             if (b && b.isValid && b.isValid()) {
//               if (!combinedBounds) combinedBounds = b;
//               else combinedBounds.extend(b);
//             }
//           } catch (err) {
//             // ignore malformed layer
//           }
//         }

//         if (
//           combinedBounds &&
//           combinedBounds.isValid &&
//           combinedBounds.isValid()
//         ) {
//           try {
//             map.flyToBounds(combinedBounds, {
//               padding: [40, 40],
//               maxZoom: 16,
//               duration: 0.7,
//             });
//           } catch {
//             map.fitBounds(combinedBounds, { padding: [40, 40], maxZoom: 16 });
//           }
//         }
//       } catch (err) {
//         // ignore
//       }
//     }, 100);

//     return () => clearTimeout(timeoutId);
//   }, [map, geoJsonLayers]);

//   return null;
// });
// FitBounds.displayName = "FitBounds";

const MapPanel = memo(() => {
  const dispatch = useDispatch();
  // read layers & viewport from redux
  const geoJsonLayers = useSelector((state) => state.map.geoJsonLayers);
  const viewport = useSelector((state) => state.map.viewport);

  // Memoize style function
  const style = useCallback(
    (feature) => ({
      fillColor: getColorByValue(feature?.properties?.value),
      weight: 10,
      opacity: 0.8,
      color: "#1f2937",
      fillOpacity: 0.6,
    }),
    []
  );

  // handle feature events
  const onEachFeature = useCallback(
    (feature, layer) => {
      if (feature.properties && feature.properties.name) {
        layer.bindTooltip(
          `${feature.properties.name}: ${feature.properties.value}`,
          {
            sticky: true,
          }
        );
      }

      // highlight on mouseover
      layer.on("mouseover", (e) => {
        try {
          e.target.setStyle({
            weight: 2,
            color: "#111827",
            fillOpacity: 0.8,
          });
        } catch {}
      });
      layer.on("mouseout", (e) => {
        try {
          e.target.setStyle(style(feature));
        } catch {}
      });

      // click -> save selected feature and center map viewport on it
      layer.on("click", (e) => {
        dispatch(setSelectedFeature(feature));
        try {
          const bounds = layer.getBounds ? layer.getBounds() : null;
          if (bounds && bounds.isValid && bounds.isValid()) {
            const center = bounds.getCenter();
            dispatch(
              updateViewport({
                center: [center.lat, center.lng],
                zoom: Math.min(16, viewport.zoom || 13),
              })
            );
          } else if (feature.geometry?.coordinates) {
            const [lng, lat] = feature.geometry.coordinates;
            dispatch(updateViewport({ center: [lat, lng] }));
          }
        } catch (err) {
          // ignore
        }
      });
    },
    [dispatch, style, viewport.zoom]
  );

  // Memoize rendered GeoJSON layers
  const renderedLayers = useMemo(
    () =>
      Object.entries(geoJsonLayers || {})
        .filter(([, geoJsonData]) => geoJsonData)
        .map(([layerId, geoJsonData]) => (
          <GeoJSON
            key={layerId}
            data={geoJsonData}
            style={style}
            onEachFeature={onEachFeature}
          />
        )),
    [geoJsonLayers, style, onEachFeature]
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
      </MapContainer>
    </div>
  );
});

MapPanel.displayName = "MapPanel";
export default MapPanel;
