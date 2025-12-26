import React, {
  forwardRef,
  memo,
  useMemo,
  useEffect,
  useCallback,
} from "react";
import {
  MapContainer,
  ScaleControl,
  TileLayer,
  ZoomControl,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  GeoJsonLayerWrapper,
  PaneCreator,
  Legend,
  BufferGeoJsonLayer,
  BaseMapTileLayer,
} from "../../components";
import { PANE_ZINDEX } from "../../constants";
import FitBounds from "../common/FitBounds";
import Base from "antd/es/typography/Base";

// Add a component to handle map updates when container size changes
const MapResizer = ({ orientation, format, scaleValue }) => {
  const map = useMap();

  useEffect(() => {
    // Use setTimeout to ensure DOM has updated
    const timer = setTimeout(() => {
      map.invalidateSize(); // Ensure the map container is properly resized
      // Also trigger a re-render of tiles
      map.eachLayer((layer) => {
        if (layer.redraw) {
          layer.redraw();
        }
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [map, orientation, format, scaleValue]); // Re-run when orientation or format changes

  return null;
};

// Component to handle scale-based zoom adjustment
const ScaleController = memo(({ scaleValue, mapCenter }) => {
  const map = useMap();

  useEffect(() => {
    if (!scaleValue || !mapCenter) return;

    try {
      // Parse scale value (e.g., "1:5000" or "5000")
      let scaleNumber;
      if (scaleValue.includes(":")) {
        const parts = scaleValue.split(":");
        scaleNumber = parseFloat(parts[1] || parts[0]);
      } else {
        scaleNumber = parseFloat(scaleValue);
      }

      if (isNaN(scaleNumber) || scaleNumber <= 0) return;

      // Convert scale to zoom level approximation
      // This is an approximation as exact scale depends on latitude and screen DPI
      // Typical scale to zoom relationship for OSM tiles:
      // At zoom 0: 1:500 million (approx)
      // Each zoom level doubles the scale

      // Base scale at zoom 0 (varies by latitude)
      const baseScaleAtEquator = 500000000; // Approximate 1:500M at equator, zoom 0
      const targetScale = scaleNumber;

      // Calculate approximate zoom level
      // scale = baseScale / (2^zoom)
      // zoom = log2(baseScale / targetScale)
      const zoomLevel = Math.log2(baseScaleAtEquator / targetScale);

      // Clamp zoom level to reasonable bounds
      const clampedZoom = Math.max(
        0,
        Math.min(20, Math.round(zoomLevel * 10) / 10)
      );

      // Set map zoom without changing center (avoid recentering on user zoom/pan)
      try {
        map.setZoom(clampedZoom);
      } catch (err) {
        // Fallback: set view only if necessary
        if (mapCenter && mapCenter.length === 2) {
          map.setView(mapCenter, clampedZoom);
        }
      }
    } catch (error) {
      console.error("Error setting map scale:", error);
    }
  }, [map, scaleValue, mapCenter]);

  return null;
});

// Sync zoom to scale and notify parent
const ZoomScaleSync = memo(({ onScaleChange }) => {
  const map = useMap();

  useEffect(() => {
    if (!onScaleChange || !map) return;
    const handler = () => {
      try {
        const zoom = map.getZoom();
        const center = map.getCenter();
        const lat = center?.lat || 0;
        const dpi = 96; // assumed screen DPI
        const metersPerPixel =
          (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
        const scaleDen = metersPerPixel * dpi * 39.37; // inches per meter = 39.37
        if (typeof onScaleChange === "function") {
          onScaleChange(Math.round(scaleDen));
        }
      } catch (err) {
        console.error("ZoomScaleSync error:", err);
      }
    };

    // Trigger initial update
    handler();

    map.on("zoomend", handler);
    return () => {
      map.off("zoomend", handler);
    };
  }, [map, onScaleChange]);

  return null;
});

const PrintPreviewMap = forwardRef(
  (
    {
      geoJsonLayers,
      bufferLayers,
      viewport,
      showLegend,
      orientation,
      format,
      scaleValue,
      onScaleChange,
    },
    ref
  ) => {
    // Sort layers by order (same logic as MapPanel)
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

    // Sort buffer layers
    const sortedBufferLayers = useMemo(() => {
      if (!bufferLayers) return [];
      return Object.keys(bufferLayers || {})
        .filter((id) => bufferLayers[id] && bufferLayers[id].geoJsonData)
        .map((layerId) => ({ layerId, data: bufferLayers[layerId] }));
    }, [bufferLayers]);

    // Build panes from sorted list (same logic as MapPanel)
    const panes = useMemo(() => {
      const base = PANE_ZINDEX.OVERLAY_BASE;
      return sortedLayers.map((l, idx) => ({
        name: `pane-layer-${l.layerId}`,
        zIndex: base + idx,
      }));
    }, [sortedLayers]);

    // Create panes for buffer layers
    const bufferPanes = useMemo(() => {
      const overlayBase = PANE_ZINDEX.OVERLAY_BASE;
      const fallback = Math.max(201, overlayBase - 1000);
      const bufferBase =
        typeof PANE_ZINDEX.BUFFER_BASE === "number"
          ? PANE_ZINDEX.BUFFER_BASE
          : fallback;

      return sortedBufferLayers.map((l, idx) => ({
        name: `pane-buffer-${l.layerId}`,
        zIndex: bufferBase + idx,
      }));
    }, [sortedBufferLayers]);

    // Rendered buffer layers
    const renderedBufferLayers = useMemo(() => {
      return sortedBufferLayers.map(({ layerId, data }) => (
        <BufferGeoJsonLayer
          key={layerId}
          layerId={layerId}
          geoJsonData={data.geoJsonData}
          metaData={data.metaData}
          pane={`pane-buffer-${layerId}`}
        />
      ));
    }, [sortedBufferLayers]);

    // Rendered layers
    const renderedLayers = useMemo(() => {
      return sortedLayers.map(({ layerId, data }) => (
        <GeoJsonLayerWrapper
          key={layerId}
          layerId={layerId}
          geoJsonData={data.geoJsonData}
          metaData={data.metaData}
          pane={`pane-layer-${layerId}`}
        />
      ));
    }, [sortedLayers]);

    const mapSettings = useMemo(
      () => ({
        center: viewport?.center || [28.7041, 77.1025],
        zoom: viewport?.zoom || 8,
        style: { width: "100%", height: "100%" },
        zoomControl: false,
        doubleClickZoom: false,
        dragging: true,
        keyboard: false,
        scrollWheelZoom: true,
        touchZoom: false,
        // Add these props to help with re-rendering
        whenReady: () => {
          // This callback ensures map is initialized properly
        },
      }),
      [viewport]
    );

    return (
      <MapContainer {...mapSettings} ref={ref}>
        <BaseMapTileLayer />
        {/* Add MapResizer to handle dimension changes */}
        <MapResizer
          orientation={orientation}
          format={format}
          scaleValue={scaleValue}
        />

        {/* Sync map zoom to scale input and notify parent */}
        <ScaleController
          scaleValue={scaleValue}
          mapCenter={viewport?.center || [28.7041, 77.1025]}
        />
        <ZoomScaleSync onScaleChange={onScaleChange} />

        <ScaleControl
          position="bottomleft"
          imperial={true}
          metric={true}
          maxWidth={200}
          updateWhenIdle={true}
        />
        <FitBounds geoJsonLayers={geoJsonLayers} />

        {/* Create buffer panes first */}
        <PaneCreator panes={bufferPanes} />
        {renderedBufferLayers}

        {/* Create regular panes */}
        <PaneCreator panes={panes} />
        {renderedLayers}

        {/* Legend if enabled */}
        {showLegend && <Legend visible={true} />}
      </MapContainer>
    );
  }
);

PrintPreviewMap.displayName = "PrintPreviewMap";
export default memo(PrintPreviewMap);
