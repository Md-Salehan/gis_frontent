import React, { memo, useMemo } from "react";
import {
  MapContainer,
  ScaleControl,
  TileLayer,
  ZoomControl,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useSelector } from "react-redux";
import { PANE_ZINDEX } from "../../../../constants";
import MiniMapControl from "../../../../components/common/MiniMapControl";
import BaseMapSwitcher from "../../../../components/common/BaseMapSwitcher";
import GeomanControl from "../../../../components/common/GeomanControl";
import FitBounds from "../../../../components/common/FitBounds";
import {
  AnalyticalOverlays,
  AttributeTableDrawer,
  BaseMapSwitcherControl,
  BufferGeoJsonLayer,
  BufferToolDrawer,
  GeoJsonLayerWrapper,
  Legend,
  MeasureControl,
  PaneCreator,
  PrintControl,
  SpatialAnalysis,
} from "../../../../components";
import SelectedFeaturesLayer from "../../../../components/map/SelectedFeaturesLayer";

const MapPanel = memo(() => {
  // read layers & viewport from redux
  const geoJsonLayers = useSelector((state) => state.map.geoJsonLayers);
  const viewport = useSelector((state) => state.map.viewport);
  const isLegendVisible = useSelector((state) => state.ui.isLegendVisible);
  const isPrintModalOpen = useSelector((state) => state.ui.isPrintModalOpen);

  // buffers (kept separately)
  const bufferLayers = useSelector((state) => state.map.bufferLayers);
  const bufferOrder = useSelector((state) => state.map.bufferOrder);

  const analyticalLayers = useSelector((state) => state.map.tempGeoJsonLayers);
  const analyticalOrder = useSelector((state) => state.map.tempLayerOrder);

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
        (id) =>
          bufferLayers && bufferLayers[id] && bufferLayers[id].geoJsonData,
      )
      .map((layerId) => ({ layerId, data: bufferLayers[layerId] }));
  }, [bufferLayers, bufferOrder]);

  // buffers sorted by bufferOrder (creation order)
  const sortedAnalyticalLayers = useMemo(() => {
    if (!analyticalLayers && !analyticalOrder) return [];

    const order = analyticalOrder.length
      ? analyticalOrder
      : Object.keys(analyticalLayers || {});

    return order
      .filter(
        (id) =>
          analyticalLayers &&
          analyticalLayers[id] &&
          analyticalLayers[id].geoJsonData,
      )
      .map((layerId) => ({ layerId, data: analyticalLayers[layerId] }));
  }, [analyticalLayers, analyticalOrder]);

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
    const bufferBase = PANE_ZINDEX.BUFFER_BASE;
    return sortedBufferLayers.map((l, idx) => ({
      name: `pane-buffer-${l.layerId}`,
      zIndex: bufferBase + idx,
    }));
  }, [sortedBufferLayers]);

  const analyticalPanes = useMemo(() => {
    const analyticalBase = PANE_ZINDEX.ANALYTICAL_BASE;
    return sortedAnalyticalLayers.map((l, idx) => ({
      name: `pane-analytical-${l.layerId}`,
      zIndex: analyticalBase + idx,
    }));
  }, [sortedAnalyticalLayers]);

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

  const renderedAnalyticalLayers = useMemo(() => {
    
    return sortedAnalyticalLayers
      .filter((item) => item?.data?.isActive)
      .map(({ layerId, data }, idx) => {
        const paneName = `pane-analytical-${layerId}`;
        return (
          <AnalyticalOverlays
            key={layerId}
            layerId={layerId}
            geoJsonData={data.geoJsonData}
            metaData={data.metaData}
            pane={paneName}
          />
        );
      });
  }, [sortedAnalyticalLayers]);

  const mapSettings = useMemo(
    () => ({
      center: viewport?.center || [28.7041, 77.1025],
      zoom: viewport?.zoom || 8,
      style: { width: "100%", height: "100%" },
      zoomControl: false,
    }),
    [viewport],
  );

  return (
    <div className="map-panel">
      <MapContainer {...mapSettings}>
        <ZoomControl position="topright" />
        <ScaleControl
          position="bottomright"
          imperial={true}
          metric={true}
          maxWidth={200}
          updateWhenIdle={true}
        />

        <BaseMapSwitcherControl />

        <FitBounds geoJsonLayers={geoJsonLayers} />

        {/* Create buffer panes first so they are at the bottom */}
        <PaneCreator panes={bufferPanes} />
        {/* Render buffer layers in creation order (first = bottom) */}
        {renderedBufferLayers}

        {/* Create panes before adding layers */}
        <PaneCreator panes={panes} />
        {/* Render layers in ascending order (first = bottom) */}
        {renderedLayers}

        <PaneCreator panes={analyticalPanes} />
        {renderedAnalyticalLayers}

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
        <Legend visible={isLegendVisible} isMovable={true} />
        <AttributeTableDrawer />
        <MeasureControl />
        {isPrintModalOpen && <PrintControl />}
        <BufferToolDrawer />
        {/* <SpatialAnalysis /> */}
      </MapContainer>
    </div>
  );
});

MapPanel.displayName = "MapPanel";
export default MapPanel;
