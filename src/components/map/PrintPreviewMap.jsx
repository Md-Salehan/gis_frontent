import React, {
  forwardRef,
  memo,
  useMemo,
  useEffect,
  useCallback,
  useState,
} from "react";
import {
  MapContainer,
  ScaleControl,
  TileLayer,
  ZoomControl,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  GeoJsonLayerWrapper,
  PaneCreator,
  Legend,
  BufferGeoJsonLayer,
  BaseMapTileLayer,
} from "../../components";
import { PANE_ZINDEX } from "../../constants";
import FitBounds from "../common/FitBounds";

// Renamed to PascalCase: HighResTiles (was useHighResTiles)
const HighResTiles = ({ scaleValue }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Force tile layer to reload with higher zoom if needed
    const updateTiles = () => {
      Object.values(map._layers).forEach((layer) => {
        if (layer instanceof L.TileLayer) {
          // Set higher maxNativeZoom for better quality
          layer.options.maxNativeZoom = 19;
          layer.options.keepBuffer = 5;
          layer.redraw();
        }
      });
    };

    // Small delay to ensure map is ready
    const timer = setTimeout(updateTiles, 500);

    return () => clearTimeout(timer);
  }, [map, scaleValue]);

  return null;
};

// Component to handle map updates when container size changes
const MapResizer = ({ orientation, format, scaleValue }) => {
  const map = useMap();

  useEffect(() => {
    const resizeMap = () => {
      map.invalidateSize({ animate: false });

      // Force re-render of all layers
      Object.values(map._layers || {}).forEach((layer) => {
        if (layer.redraw) {
          try {
            layer.redraw();
          } catch (e) {
            // Ignore errors
          }
        }
      });

      // Refresh tile layer
      Object.values(map._layers || {}).forEach((layer) => {
        if (layer instanceof L.TileLayer) {
          try {
            layer._resetView();
          } catch (e) {
            // Ignore errors
          }
        }
      });
    };

    // Use timeout to ensure DOM updates are complete
    const timer = setTimeout(resizeMap, 100);

    return () => clearTimeout(timer);
  }, [map, orientation, format, scaleValue]);

  return null;
};

// Enhanced scale controller with accurate calculations - FIXED NaN ERROR
// Enhanced scale controller with accurate calculations - FIXED NaN ERROR
const ScaleController = ({ scaleValue, mapCenter }) => {
  const map = useMap();

  useEffect(() => {
    if (!scaleValue || !mapCenter) return;

    const calculateZoomLevel = () => {
      try {
        // Parse scale value safely
        const scaleStr = scaleValue.toString();
        const cleanedStr = scaleStr.replace(/[^\d.]/g, "");
        const scaleNum = parseFloat(cleanedStr);

        if (isNaN(scaleNum) || scaleNum <= 0 || !isFinite(scaleNum)) {
          console.warn("Invalid scale value:", scaleValue);
          return null;
        }

        // Simplified zoom calculation for OSM tiles
        // OSM at zoom 0: ~1:500,000,000
        // Each zoom level halves the scale
        const baseScale = 500000000; // 1:500M at zoom 0

        // Avoid division by zero or very small numbers
        if (scaleNum <= 0) return null;

        // Calculate zoom level: scale = baseScale / 2^zoom
        // zoom = log2(baseScale / scaleNum)
        const zoomLevel = Math.log2(baseScale / scaleNum);

        if (!isFinite(zoomLevel)) {
          console.warn("Invalid zoom calculation:", { baseScale, scaleNum });
          return null;
        }

        // Adjust for latitude (Mercator projection) - simple correction
        const latRad = (mapCenter[0] * Math.PI) / 180;
        const latCorrection = Math.cos(latRad);
        const adjustedZoom =
          zoomLevel + Math.log2(Math.max(0.01, latCorrection));

        // Clamp to reasonable bounds
        return Math.max(0, Math.min(20, adjustedZoom));
      } catch (error) {
        console.error("Error calculating zoom:", error);
        return null;
      }
    };

    const zoomLevel = calculateZoomLevel();

    // Enhanced validation for mapCenter
    const isValidCenter =
      Array.isArray(mapCenter) &&
      mapCenter.length === 2 &&
      !isNaN(mapCenter[0]) &&
      !isNaN(mapCenter[1]) &&
      isFinite(mapCenter[0]) &&
      isFinite(mapCenter[1]) &&
      Math.abs(mapCenter[0]) <= 90 && // Valid latitude range
      Math.abs(mapCenter[1]) <= 180; // Valid longitude range

    if (zoomLevel !== null && isValidCenter && isFinite(zoomLevel)) {
      // Ensure zoomLevel is valid
      const validZoomLevel = Math.max(0, Math.min(20, zoomLevel));

      // Debug logging
      console.log("ScaleController:", {
        scaleValue,
        mapCenter,
        zoomLevel: validZoomLevel,
        isValidCenter,
        centerLat: mapCenter[0],
        centerLng: mapCenter[1],
      });

      // Add a small delay to ensure map is ready
      const timer = setTimeout(() => {
        try {
          map.flyTo(mapCenter, validZoomLevel, {
            duration: 0.5,
            easeLinearity: 0.25,
          });
        } catch (error) {
          console.error("Error in map.flyTo:", error);
        }
      }, 100);

      return () => clearTimeout(timer);
    } else {
      console.warn("ScaleController: Invalid parameters", {
        zoomLevel,
        isValidCenter,
        mapCenter,
        scaleValue,
      });
    }
  }, [map, scaleValue, mapCenter]);

  return null;
};

// Component to optimize map for print/export
// Component to optimize map for print/export
const PrintOptimizer = ({ scaleValue }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Disable interactive features for print optimization
    const originalDragging = map.dragging.enabled();
    const originalTouchZoom = map.touchZoom.enabled();
    const originalDoubleClickZoom = map.doubleClickZoom.enabled();
    const originalScrollWheelZoom = map.scrollWheelZoom.enabled();
    const originalBoxZoom = map.boxZoom.enabled();
    const originalKeyboard = map.keyboard.enabled();

    // Disable interactions
    map.dragging.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.scrollWheelZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();

    // Set map to static mode for better rendering
    map.options.preferCanvas = true;

    // Force higher tile quality
    map.whenReady(() => {
      setTimeout(() => {
        map.invalidateSize({ animate: false });
        Object.values(map._layers || {}).forEach((layer) => {
          if (layer instanceof L.TileLayer) {
            layer.options.detectRetina = true;
            layer.options.updateWhenIdle = false;
            layer.options.updateWhenZooming = false;
            layer.options.keepBuffer = 8;
          }
        });
      }, 200);
    });

    // Restore original state on cleanup
    return () => {
      map.dragging[originalDragging ? "enable" : "disable"]();
      map.touchZoom[originalTouchZoom ? "enable" : "disable"]();
      map.doubleClickZoom[originalDoubleClickZoom ? "enable" : "disable"]();
      map.scrollWheelZoom[originalScrollWheelZoom ? "enable" : "disable"]();
      map.boxZoom[originalBoxZoom ? "enable" : "disable"]();
      map.keyboard[originalKeyboard ? "enable" : "disable"]();
    };
  }, [map, scaleValue]);

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
    },
    ref
  ) => {
    const [mapReady, setMapReady] = useState(false);
    const [error, setError] = useState(null);

    // Debug logging
    useEffect(() => {
      console.log("PrintPreviewMap props:", {
        viewport,
        scaleValue,
        geoJsonLayersCount: Object.keys(geoJsonLayers || {}).length,
        bufferLayersCount: Object.keys(bufferLayers || {}).length,
      });
    }, [viewport, scaleValue, geoJsonLayers, bufferLayers]);

    // Add error boundary for map rendering
    useEffect(() => {
      const handleError = (error) => {
        console.error("Map error:", error);
        setError(error.message);
      };

      // You might want to add actual error event listeners here
      return () => {
        // Cleanup if needed
      };
    }, []);

    if (error) {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f5f5f5",
            color: "#ff4d4f",
            padding: "20px",
            textAlign: "center",
          }}
        >
          <div>
            <h3>Error loading map</h3>
            <p>{error}</p>
            <button onClick={() => setError(null)}>Retry</button>
          </div>
        </div>
      );
    }

    // Sort layers by order
    const sortedLayers = useMemo(() => {
      return Object.entries(geoJsonLayers || {})
        .filter(([, data]) => data?.geoJsonData)
        .map(([layerId, data]) => ({
          layerId,
          orderNo: Number(data.orderNo || 0),
          data,
        }))
        .sort((a, b) => {
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

    // Build panes from sorted list
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

    // Map settings optimized for print
    const mapSettings = useMemo(() => {
      const defaultCenter = [28.7041, 77.1025];
      const center = viewport?.center || defaultCenter;

      // Validate center coordinates
      const isValidCenter =
        Array.isArray(center) &&
        center.length === 2 &&
        !isNaN(center[0]) &&
        !isNaN(center[1]);

      const settings = {
        center: isValidCenter ? center : defaultCenter,
        zoom: viewport?.zoom || 8,
        style: { width: "100%", height: "100%" },
        zoomControl: false,
        doubleClickZoom: false,
        dragging: false, // Disabled for print
        keyboard: false,
        scrollWheelZoom: false,
        touchZoom: false,
        boxZoom: false,
        preferCanvas: true, // Better for static maps
        zoomAnimation: false,
        fadeAnimation: false,
        markerZoomAnimation: false,
        // Renderer options for better quality
        renderer: L.canvas({ padding: 0.5 }),
        whenReady: () => {
          setTimeout(() => setMapReady(true), 300);
        },
      };

      return settings;
    }, [viewport]);

    return (
      <MapContainer {...mapSettings} ref={ref}>
        {/* Print optimizer - disables interactions */}
        <PrintOptimizer scaleValue={scaleValue} />

        {/* High-quality base map */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
          maxNativeZoom={19}
          updateWhenIdle={false}
          updateWhenZooming={false}
          keepBuffer={10}
          detectRetina={true}
          className="print-tile-layer"
        />

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

        {/* High-res tile optimizer - FIXED: Now PascalCase */}
        <HighResTiles scaleValue={scaleValue} />

        <ScaleControl
          position="bottomleft"
          imperial={false}
          metric={true}
          maxWidth={200}
          updateWhenIdle={true}
          className="print-scale"
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

        {/* Loading indicator */}
        {!mapReady && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 1000,
              background: "rgba(255, 255, 255, 0.8)",
              padding: "10px 20px",
              borderRadius: "4px",
              fontSize: "14px",
            }}
          >
            Loading high-resolution map...
          </div>
        )}
      </MapContainer>
    );
  }
);

PrintPreviewMap.displayName = "PrintPreviewMap";
export default memo(PrintPreviewMap);
