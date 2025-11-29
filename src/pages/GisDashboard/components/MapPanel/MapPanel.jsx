import React, { memo, useMemo } from "react";
import { MapContainer, TileLayer, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useSelector } from "react-redux";
import { PANE_ZINDEX } from "../../../../constants";
import MiniMapControl from "../../../../components/common/MiniMapControl";
import BaseMapSwitcher from "../../../../components/common/BaseMapSwitcher";
import GeomanControl from "../../../../components/common/GeomanControl";
import FitBounds from "../../../../components/common/FitBounds";
import {
  AttributeTable,
  AttributeTableDrawer,
  BufferGeoJsonLayer,
  BufferToolDrawer,
  GeoJsonLayerWrapper,
  Legend,
  MeasureControl,
  PaneCreator,
  PrintControl,
} from "../../../../components";
import SelectedFeaturesLayer from "../../../../components/map/SelectedFeaturesLayer";

const MapPanel = memo(() => {
  // read layers & viewport from redux
  const geoJsonLayers = useSelector((state) => state.map.geoJsonLayers);
  const viewport = useSelector((state) => state.map.viewport);
  const isLegendVisible = useSelector((state) => state.ui.isLegendVisible);

  // buffers (kept separately)
  const bufferLayers = useSelector((state) => state.map.bufferLayers);
  const bufferOrder = useSelector((state) => state.map.bufferOrder);

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

  // buffers sorted by bufferOrder (creation order)
  const sortedBufferLayers = useMemo(() => {
    const order = Array.isArray(bufferOrder)
      ? bufferOrder
      : Object.keys(bufferLayers || {});
    return order
      .filter(
        (id) => bufferLayers && bufferLayers[id] && bufferLayers[id].geoJsonData
      )
      .map((layerId) => ({ layerId, data: bufferLayers[layerId] }));
  }, [bufferLayers, bufferOrder]);

  // build panes from sorted list (deterministic zIndex per index)
  const panes = useMemo(() => {
    const base = PANE_ZINDEX.OVERLAY_BASE;
    return sortedLayers.map((l, idx) => ({
      name: `pane-layer-${l.layerId}`,
      zIndex: base + idx,
    }));
  }, [sortedLayers]);

  // create panes for buffer layers at a lower zIndex (so they appear below overlays)
  const bufferPanes = useMemo(() => {
    const overlayBase = PANE_ZINDEX.OVERLAY_BASE;
    // prefer explicit BUFFER_BASE if available
    // otherwise choose a zIndex that is below overlays but above the tile layer (tile layer zIndex ~= 200)
    const fallback = Math.max(201, overlayBase - 1000); // ensure > tile z-index (200)
    const bufferBase =
      typeof PANE_ZINDEX.BUFFER_BASE === "number"
        ? PANE_ZINDEX.BUFFER_BASE
        : fallback;
    return sortedBufferLayers.map((l, idx) => ({
      name: `pane-buffer-${l.layerId}`,
      zIndex: bufferBase + idx,
    }));
  }, [sortedBufferLayers]);

  const renderedBufferLayers = useMemo(() => {
    return sortedBufferLayers.map(({ layerId, data }, idx) => {
      const paneName = `pane-buffer-${layerId}`;
      return (
        <BufferGeoJsonLayer
          key={layerId}
          layerId={layerId}
          geoJsonData={data.geoJsonData}
          metaData={data.metaData}
          pane={paneName}
        />
      );
    });
  }, [sortedBufferLayers]);

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
      zoom: viewport?.zoom || 8,
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

        {/* Create buffer panes first so they are at the bottom */}
        <PaneCreator panes={bufferPanes} />
        {/* Render buffer layers in creation order (first = bottom) */}
        {renderedBufferLayers}

        {/* Create panes before adding layers */}
        <PaneCreator panes={panes} />

        {/* Render layers in ascending order (first = bottom) */}
        {renderedLayers}

        {/* Selected features on a very top pane */}
        <PaneCreator
          panes={[
            {
              name: "pane-selected-features",
              zIndex: PANE_ZINDEX.SELECTED_FEATURES,
            },
          ]}
        />
        <SelectedFeaturesLayer />

        <GeomanControl />
        <MiniMapControl />
        <Legend visible={isLegendVisible} />
        {/* <AttributeTable /> */}
        <AttributeTableDrawer />
        <MeasureControl />
        <PrintControl />
        {/* <BufferTool /> */}
        <BufferToolDrawer />
      </MapContainer>
    </div>
  );
});

MapPanel.displayName = "MapPanel";
export default MapPanel;
