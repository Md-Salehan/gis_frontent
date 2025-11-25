import React, { memo, useMemo, useCallback, useEffect } from "react";
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
import {
  AttributeTable,
  GeoJsonLayerWrapper,
  Legend,
  MeasureControl,
  PaneCreator,
  PrintControl,
  // PrintControl,
} from "../../../../components";
import SelectedFeaturesLayer from "../../../../components/map/SelectedFeaturesLayer";




const MapPanel = memo(() => {
  // read layers & viewport from redux
  const geoJsonLayers = useSelector((state) => state.map.geoJsonLayers);
  const viewport = useSelector((state) => state.map.viewport);
  const isLegendVisible = useSelector((state) => state.ui.isLegendVisible);

  // Sort layers by order number ascending (first = bottom)
  const sortedLayers = useMemo(() => {
    return Object.entries(geoJsonLayers || {})
      .filter(([, data]) => data?.geoJsonData)
      .map(([layerId, data]) => ({
        layerId,
        orderNo: Number(data.orderNo || 0),
        data,
      }))
      .sort((a, b) => {
        // ascending: lower orderNo rendered first -> bottom
        return b.orderNo - a.orderNo || b.layerId.localeCompare(a.layerId);
      });
  }, [geoJsonLayers]);

  // build panes from sorted list (deterministic zIndex per index)
  const panes = useMemo(() => {
    const base = 400; // overlay pane base zIndex
    return sortedLayers.map((l, idx) => ({
      name: `pane-layer-${l.layerId}`,
      zIndex: base + idx,
    }));
  }, [sortedLayers]);

  const renderedLayers = useMemo(() => {
    return sortedLayers.map(({ layerId, data }, idx) => {
      const paneName = `pane-layer-${layerId}`;
      return (
        <GeoJsonLayerWrapper
          key={layerId}
          layerId={layerId}
          geoJsonData={data.geoJsonData}
          metaData={data.metaData}
          pane={paneName}
        />
      );
    });
  }, [sortedLayers]);

  const mapSettings = useMemo(
    () => ({
      center: viewport?.center || [28.7041, 77.1025],
      zoom: viewport?.zoom || 20,
      style: { width: "100%", height: "100%" },
      zoomControl: false,
    }),
    [viewport]
  );

  return (
    <div className="map-panel">
      <MapContainer {...mapSettings}>
        <ZoomControl position="bottomright" />

        <BaseMapSwitcher />

        <FitBounds geoJsonLayers={geoJsonLayers} />

        {/* Create panes before adding layers */}
        <PaneCreator panes={panes} />

        {/* Render layers in ascending order (first = bottom) */}
        {renderedLayers}

        {/* Selected features on a very top pane */}
        <PaneCreator
          panes={[{ name: "pane-selected-features", zIndex: 10000 }]}
        />
        <SelectedFeaturesLayer />

        <GeomanControl />
        <MiniMapControl />
        <Legend visible={isLegendVisible} />
        <AttributeTable />
        <MeasureControl />
        <PrintControl />
      </MapContainer>
    </div>
  );
});

MapPanel.displayName = "MapPanel";
export default MapPanel;
