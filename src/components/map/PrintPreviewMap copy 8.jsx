import React, {
  forwardRef,
  memo,
  useMemo,
  useEffect,
  useCallback,
  useRef,
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
import { debugScaleCalculations, parseScaleValue, scaleToZoom, zoomToScale } from "../../utils";

// Add a component to handle map updates when container size changes
const MapResizer = ({ orientation, format, scaleValue }) => {
  const map = useMap();
  const lastProps = useRef({ orientation, format, scaleValue });

  useEffect(() => {
    // Only redraw if props actually changed
    const currentProps = { orientation, format, scaleValue };
    const propsChanged =
      JSON.stringify(lastProps.current) !== JSON.stringify(currentProps);

    if (!propsChanged) return;

    lastProps.current = currentProps;

    // Use requestAnimationFrame for smoother updates
    requestAnimationFrame(() => {
      map.invalidateSize();
      // Remove the layer.redraw() calls as they cause flicker
      // map.eachLayer((layer) => {
      //   if (layer.redraw) {
      //     layer.redraw();
      //   }
      // });
    });
  }, [map, orientation, format, scaleValue]);

  return null;
};

// Component to handle scale-based zoom adjustment
const ScaleController = memo(({ scaleValue, mapCenter, isUserZooming, mapScaleChangeSource }) => {
  const map = useMap();
  const lastScaleValue = useRef(scaleValue);
  const isSettingScale = useRef(false);

  useEffect(() => {
    // Don't adjust zoom if user is manually zooming or if we're already setting scale
    if (isUserZooming.current || isSettingScale.current) return;

    if (!scaleValue || !mapCenter) return;

    // Skip if scaleValue hasn't changed
    if (lastScaleValue.current === scaleValue) return;
    lastScaleValue.current = scaleValue;

    try {
      isSettingScale.current = true;

      // Use the utility function to parse scale value
      const scaleNumber = parseScaleValue(scaleValue);

      if (isNaN(scaleNumber) || scaleNumber <= 0) {
        isSettingScale.current = false;
        return;
      }

      // Extract latitude from mapCenter
      const lat = Array.isArray(mapCenter) ? mapCenter[0] : mapCenter?.lat || 0;
      
      // Use the utility function to calculate zoom
      const clampedZoom = scaleToZoom(scaleNumber, lat);

      //debug
      debugScaleCalculations(scaleValue, lat, "ScaleController");

      // Get current zoom to avoid unnecessary updates
      const currentZoom = map.getZoom();
      if (Math.abs(currentZoom - clampedZoom) > 0.1) {
        map.setZoom(clampedZoom, { animate: false });
      }
    } catch (error) {
      console.error("Error setting map scale:", error);
    } finally {
      console.log("ScaleController: Setting zoom for scale", scaleValue);
      
      // Reset the flag after a delay to prevent race conditions
      mapScaleChangeSource.current = "zoomChange";
      setTimeout(() => {
        isSettingScale.current = false;
      }, 100);
    }
  }, [map, scaleValue, mapCenter, isUserZooming, mapScaleChangeSource]);

  return null;
});

// Sync zoom to scale and notify parent
const ZoomScaleSync = memo(({ onScaleChange, isUserZooming, mapScaleChangeSource }) => {
  const map = useMap();
  const isProgrammaticZoom = useRef(false);
  const lastZoom = useRef(map?.getZoom?.() || 0);

  const updateScale = useCallback(() => {
    try {
      if (!map || isProgrammaticZoom.current) return;

      const zoom = map.getZoom();
      const center = map.getCenter();
      const lat = center?.lat || 0;

      // Use the utility function to calculate scale
      const scaleDen = zoomToScale(zoom, lat);

      //debug
      debugScaleCalculations(scaleValue, lat, "ZoomScaleSync");

      // Only update if zoom actually changed
      if (Math.abs(lastZoom.current - zoom) > 0.01) {
        lastZoom.current = zoom;
        if (typeof onScaleChange === "function") {
          onScaleChange(scaleDen, "zoomChange");
        }
      }
    } catch (err) {
      console.error("ZoomScaleSync error:", err);
    }
  }, [map, onScaleChange]);

  useEffect(() => {
    if (!map || !onScaleChange) return;

    const handleZoomStart = (e) => {
      // Check if this is a programmatic zoom (from ScaleController)
      if (mapScaleChangeSource.current === "userInput" || mapScaleChangeSource.current === null) {
        isProgrammaticZoom.current = true;
        console.log("ZoomScaleSync: Programmatic zoom start");
      } else {
        isUserZooming.current = true;
        console.log("ZoomScaleSync: User zoom start");
      }
    };

    const handleZoomEnd = () => {
      console.log("ZoomScaleSync: Zoom end");
      
      if (isProgrammaticZoom.current) {
        isProgrammaticZoom.current = false;
        console.log("ZoomScaleSync: Programmatic zoom complete");
      } else {
        isUserZooming.current = false;
        console.log("ZoomScaleSync: User zoom complete");
        // Update scale after user zoom
        updateScale();
      }
    };

    map.on("zoomstart", handleZoomStart);
    map.on("zoomend", handleZoomEnd);

    return () => {
      map.off("zoomstart", handleZoomStart);
      map.off("zoomend", handleZoomEnd);
    };
  }, [map, onScaleChange, isUserZooming, updateScale, mapScaleChangeSource]);

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
      mapScaleChangeSource,
    },
    ref
  ) => {
    const isUserZooming = useRef(false);
    const isInitialMount = useRef(true);
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

    // Reset isUserZooming when scaleValue changes externally
    // useEffect(() => {
    //   if (isInitialMount.current) {
    //     isInitialMount.current = false;
    //   } else if (scaleValue) {
    //     // When scaleValue changes from parent (preset selection), reset user zooming flag
    //     isUserZooming.current = false;
    //   }
    // }, [scaleValue]);

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
          isUserZooming={isUserZooming}
          mapScaleChangeSource={mapScaleChangeSource}
        />

        <ZoomScaleSync
          onScaleChange={onScaleChange}
          isUserZooming={isUserZooming}
          mapScaleChangeSource={mapScaleChangeSource}
        />

        <ScaleControl
          position="bottomleft"
          imperial={true}
          metric={true}
          maxWidth={200}
          updateWhenIdle={true}
          mapScaleChangeSource={mapScaleChangeSource}
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