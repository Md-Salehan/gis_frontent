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
import {
  debugScaleCalculations,
  parseScaleValue,
  scaleToZoom,
  scaleToZoomx,
  zoomToScale,
  zoomToScalex,
  zoomToScaley,
} from "../../utils";

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
    });

    // Use setTimeout to ensure DOM has updated
    // const timer = setTimeout(() => {
    //   map.invalidateSize(); // Ensure the map container is properly resized
    //   // Also trigger a re-render of tiles
    //   map.eachLayer((layer) => {
    //     if (layer.redraw) {
    //       layer.redraw();
    //     }
    //   });
    // }, 100);
    // return () => clearTimeout(timer);
  }, [map, orientation, format, scaleValue]);

  return null;
};

// Component to handle scale-based zoom adjustment
const ScaleController = memo(
  ({ scaleValue, mapCenter, isUserZooming, mapScaleChangeSource }) => {
    const map = useMap();
    const lastScaleValue = useRef(scaleValue);

    useEffect(() => {
      // Don't adjust zoom if user is manually zooming or if we're already setting scale
      if (mapScaleChangeSource.current !== "userInput") return;

      if (!scaleValue || !mapCenter) return;
      


      try {
        // Parse scale value (e.g., "1:5000" or "5000")
        let scaleNumber = parseScaleValue(scaleValue);

        // Extract latitude from mapCenter
        const lat = Array.isArray(mapCenter)
          ? mapCenter[0]
          : mapCenter?.lat || 0;
        // Use the utility function to calculate zoom
        const clampedZoom = Math.floor(scaleToZoomx(scaleNumber, lat));

        //debug
        // debugScaleCalculations(scaleValue, lat, "ScaleController");

        // map.setZoom(clampedZoom, { animate: false });
        if (mapCenter && mapCenter.length === 2) {
          map.setView(mapCenter, clampedZoom);
        }
        mapScaleChangeSource.current = "zoomChange";
        
      } catch (error) {
        console.error("mylog scalerControl error:", error);
      } finally {
        
      }
    }, [map, scaleValue, mapCenter, isUserZooming, mapScaleChangeSource]);

    return null;
  }
);

// Sync zoom to scale and notify parent
// Update ZoomScaleSync to track user interaction
// Sync zoom to scale and notify parent
const ZoomScaleSync = memo(
  ({ onScaleChange, isUserZooming, mapScaleChangeSource }) => {
    const map = useMap();
    const lastZoom = useRef(map?.getZoom?.() || 0);

    const updateScale = useCallback(() => {
      
      try {
        if (!map || mapScaleChangeSource.current !== "zoomChange") return;

        const zoom = map.getZoom();
        const center = map.getCenter();
        const lat = center?.lat || 0;

        // Use the utility function to calculate scale

        const scaleDen = zoomToScaley(zoom, lat);

        // Only update if zoom actually changed
        lastZoom.current = zoom;
        if (typeof onScaleChange === "function") {
          onScaleChange(scaleDen, "zoomChange");
        }
      } catch (err) {
        console.error("ZoomScaleSync error:", err);
      }
    }, [map, onScaleChange, mapScaleChangeSource.current]);

    useEffect(() => {
      if (!map || !onScaleChange) return;

      const handleZoomStart = (e) => {
        mapScaleChangeSource.current = "zoomChange";
      };

      const handleZoomEnd = () => {
        // Update scale after user zoom
        updateScale();
        // mapScaleChangeSource.current = "userInput";
      };

      map.on("zoomstart", handleZoomStart);
      // map.on("zoom", handleZoom);
      map.on("zoomend", handleZoomEnd);

      // // Initial update
      // updateScale();

      return () => {
        map.off("zoomstart", handleZoomStart);
        // map.off("zoom", handleZoom);
        map.off("zoomend", handleZoomEnd);
      };
    }, [map, onScaleChange, isUserZooming, updateScale, mapScaleChangeSource]); // Added missing dependencies

    return null;
  }
);

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
      handleLegendDimensions,
      legendWidth,
      legendHeight,
      legendTitleFontSize,
      legendLabelFontSize,
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
          isPrintModalOpen={true}
        />
      ));
    }, [sortedLayers]);

    const mapSettings = useMemo(
      () => ({
        center: viewport?.center || [28.7041, 77.1025],
        zoom: viewport?.zoom || 8,
        style: { width: "100%", height: "100%" },
        zoomControl: false,
        // doubleClickZoom: false,
        // dragging: true,
        // keyboard: false,
        scrollWheelZoom: 1,
        // touchZoom: false,
        attributionControl: false,
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
          metric={false}
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
        { (
          <Legend
            visible={showLegend}
            isMovable={true}
            width={legendWidth}
            height={legendHeight}
            titleFontSize={legendTitleFontSize}
            labelFontSize={legendLabelFontSize}
            getDimentions={(dims) => {
              // Update legend dimensions in form values
              if (handleLegendDimensions) {

                handleLegendDimensions(dims);
              }
            }}
          />
        )}
      </MapContainer>
    );
  }
);

PrintPreviewMap.displayName = "PrintPreviewMap";
export default memo(PrintPreviewMap);
