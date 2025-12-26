import React, {
  forwardRef,
  memo,
  useMemo,
  useEffect,
  useCallback,
  useState,
  useImperativeHandle,
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

// Custom hook to handle zoom events
const useZoomHandler = (onZoomChange, initialZoom) => {
  const map = useMap();
  const [currentZoom, setCurrentZoom] = useState(initialZoom);
  const [isUserInteraction, setIsUserInteraction] = useState(false);

  useEffect(() => {
    if (!map) return;

    const handleZoom = () => {
      const newZoom = map.getZoom();
      if (newZoom !== currentZoom) {
        setCurrentZoom(newZoom);

        // Only trigger callback for user interactions
        if (isUserInteraction && onZoomChange) {
          onZoomChange(newZoom);
        }
      }
      setIsUserInteraction(false);
    };

    const handleZoomStart = () => {
      setIsUserInteraction(true);
    };

    map.on("zoomstart", handleZoomStart);
    map.on("zoom", handleZoom);
    map.on("zoomend", handleZoom);

    return () => {
      map.off("zoomstart", handleZoomStart);
      map.off("zoom", handleZoom);
      map.off("zoomend", handleZoom);
    };
  }, [map, currentZoom, onZoomChange, isUserInteraction]);

  // Function to set zoom programmatically
  const setZoom = useCallback(
    (zoom) => {
      if (map) {
        // Disable user interaction flag when setting zoom programmatically
        setIsUserInteraction(false);
        map.setZoom(zoom);
      }
    },
    [map]
  );

  return { setZoom, currentZoom };
};

// Component to handle external zoom updates
const ZoomUpdater = ({ externalZoom, setZoomFromScale }) => {
  const map = useMap();

  useEffect(() => {
    if (externalZoom !== undefined && setZoomFromScale) {
      const currentZoom = map.getZoom();
      if (Math.abs(currentZoom - externalZoom) > 0.01) {
        setZoomFromScale(externalZoom);
      }
    }
  }, [externalZoom, map, setZoomFromScale]);

  return null;
};

// Component to handle scale-based zoom adjustment
// Updated ScaleController component
const ScaleController = ({ scaleValue, mapCenter, setZoomFromScale }) => {
  const map = useMap();

  useEffect(() => {
    if (!scaleValue || !mapCenter || !setZoomFromScale) return;

    try {
      // Parse scale value
      let scaleNumber;
      if (scaleValue.includes(":")) {
        const parts = scaleValue.split(":");
        scaleNumber = parseFloat(parts[1] || parts[0]);
      } else {
        scaleNumber = parseFloat(scaleValue);
      }

      if (isNaN(scaleNumber) || scaleNumber <= 0) return;

      // Convert scale to zoom level
      const lat = mapCenter[0] || 28.7041;
      const metersPerPixel = (1 / scaleNumber) * 0.0254 * 96;
      const baseMetersPerPixel = 156543.03392 * Math.cos((lat * Math.PI) / 180);
      const zoom = Math.log2(baseMetersPerPixel / metersPerPixel);

      // Clamp zoom level
      const clampedZoom = Math.max(0, Math.min(20, zoom));

      // Use the setZoomFromScale callback
      if (setZoomFromScale) {
        setZoomFromScale(clampedZoom);
      }
    } catch (error) {
      console.error("Error setting map scale:", error);
    }
  }, [map, scaleValue, mapCenter, setZoomFromScale]);

  return null;
};

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
      onZoomChange,
      initialZoom = 8,
    },
    ref
  ) => {

     // State for controlled zoom
    const [programmaticZoom, setProgrammaticZoom] = useState(null);
    
    // Custom hook for zoom handling
    const { setZoom, currentZoom } = useZoomHandler(onZoomChange, initialZoom);
    
    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      setZoomFromScale: (zoom) => {
        setProgrammaticZoom(zoom);
        setZoom(zoom);
      },
      getCurrentZoom: () => currentZoom,
    }));




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

        {/* Add ScaleController to adjust zoom based on scale */}
        <ScaleController
          scaleValue={scaleValue}
          mapCenter={viewport?.center || [28.7041, 77.1025]}
        />

        <ZoomUpdater 
          externalZoom={programmaticZoom} 
          setZoomFromScale={setZoom}
        />

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
