import React, { useMemo, useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/*
  Render a real Leaflet Map inside the preview so html2canvas can capture the whole
  preview (title + live map + footer). MapInner notifies readiness by setting a
  data attribute on the preview container when 'load' and 'tileload' events complete.
*/

const MapInner = ({ onReady, geoJsonLayers }) => {
  const map = useMap();
  const tilesLoadedRef = useRef(false);
  const readyFiredRef = useRef(false);

  useEffect(() => {
    if (!map) return;

    const notifyReady = () => {
      if (!readyFiredRef.current) {
        readyFiredRef.current = true;
        console.log("✓ Map ready fired");
        onReady && onReady(true);
      }
    };

    // Listen for tile load event
    const onTileLoad = () => {
      tilesLoadedRef.current = true;
      console.log("✓ Tiles loaded");
      notifyReady();
    };

    // Listen for map load event
    const onMapLoad = () => {
      console.log("✓ Map loaded");
      notifyReady();
    };

    // Subscribe to events
    map.on("tileload", onTileLoad);
    map.on("load", onMapLoad);

    // Check if tiles already loaded before subscribing
    setTimeout(() => {
      if (tilesLoadedRef.current || (map.isLoading && !map.isLoading())) {
        notifyReady();
      }
    }, 500);

    // Cleanup
    return () => {
      map.off("tileload", onTileLoad);
      map.off("load", onMapLoad);
    };
  }, [map, onReady]);

  // Render GeoJSON layers with proper styling
  return (
    <>
      {Object.entries(geoJsonLayers || {}).map(([layerId, data]) => {
        if (!data?.geoJsonData) return null;

        return (
          <GeoJSON
            key={layerId}
            data={data.geoJsonData}
            style={(feature) => {
              const props = data.metaData?.style || {};
              return {
                color: props.stroke_color || "#3388ff",
                weight: props.stroke_width || 1,
                opacity: props.stroke_opacity || 1,
                fillColor: props.fill_color || "#3388ff",
                fillOpacity: props.fill_opacity ?? 0.2,
              };
            }}
            pointToLayer={(feature, latlng) => {
              const props = data.metaData?.style || {};
              const iconName = props.marker_fa_icon_name;
              const markerSize = Number(props.marker_size) || 8;
              const markerColor = props.marker_color || "#3388ff";

              // Try to render as FontAwesome icon
              if (iconName) {
                try {
                  const html = `<div style="display:flex;align-items:center;justify-content:center;width:${markerSize}px;height:${markerSize}px;">
                    <i class="${iconName}" style="font-size:${markerSize}px;color:${markerColor};line-height:1;"></i>
                  </div>`;
                  const icon = L.divIcon({
                    className: "fa-icon-marker",
                    html,
                    iconSize: [markerSize, markerSize],
                    iconAnchor: [
                      Math.round(markerSize / 2),
                      Math.round(markerSize / 2),
                    ],
                  });
                  return L.marker(latlng, { icon });
                } catch (err) {
                  console.warn("Icon render failed, using circle:", err);
                }
              }

              // Fallback to circle marker
              return L.circleMarker(latlng, {
                radius: markerSize,
                color: markerColor,
                fillColor: markerColor,
                fillOpacity: 0.5,
                weight: 1,
              });
            }}
          />
        );
      })}
    </>
  );
};

const PrintPreview = () => {
  const printSettings = useSelector((state) => state.print);
  const viewport = useSelector((state) => state.map.viewport);
  const geoJsonLayers = useSelector((s) => s.map.geoJsonLayers);
  const previewRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  // Calculate paper dimensions for preview (in pixels)
  const paperDimensions = useMemo(() => {
    const sizes = {
      a4: { width: 210, height: 297 },
      a3: { width: 297, height: 420 },
      letter: { width: 215.9, height: 279.4 },
    };

    const size = sizes[printSettings.paperSize] || sizes.a4;

    // Calculate ratio based on orientation
    const ratio =
      printSettings.orientation === "landscape"
        ? size.width / size.height
        : size.height / size.width;

    // Preview width fixed at 450px
    const previewWidth = 450;
    const previewHeight = previewWidth / ratio;

    console.log("Paper dimensions:", {
      paperSize: printSettings.paperSize,
      orientation: printSettings.orientation,
      previewWidth,
      previewHeight,
    });

    return { width: previewWidth, height: previewHeight, ratio };
  }, [printSettings.paperSize, printSettings.orientation]);

  // Handle map ready state
  const handleMapReady = (ready) => {
    console.log("Map ready state:", ready);
    setMapReady(!!ready);
    if (previewRef.current) {
      previewRef.current.dataset.mapReady = ready ? "true" : "false";
    }
  };

  // Reset map ready when settings change
  useEffect(() => {
    setMapReady(false);
    if (previewRef.current) {
      previewRef.current.dataset.mapReady = "false";
    }
    console.log("Reset map ready due to settings change");
  }, [
    printSettings.paperSize,
    printSettings.orientation,
    printSettings.zoomLevel,
    printSettings.includeLegend,
    JSON.stringify(Object.keys(geoJsonLayers || {})),
  ]);

  const center = viewport?.center || [28.7041, 77.1025];
  const zoom = printSettings.zoomLevel || viewport?.zoom || 10;

  console.log("PrintPreview render:", { center, zoom, mapReady });

  return (
    <div
      style={{
        width: "65%",
        paddingLeft: "24px",
        overflowY: "auto",
        overflowX: "hidden",
        maxHeight: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: "16px",
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: "0px" }}>Print Preview</h3>
      <p style={{ color: "#8c8c8c", fontSize: "12px", margin: "0px" }}>
        <strong>{(printSettings.paperSize || "A4").toUpperCase()}</strong> •{" "}
        <strong>{printSettings.orientation}</strong>
      </p>

      {/* Preview Container */}
      <div
        id="print-preview-content"
        ref={previewRef}
        data-map-ready="false"
        style={{
          width: `${paperDimensions.width}px`,
          height: `${paperDimensions.height}px`,
          backgroundColor: "#ffffff",
          border: "2px solid #d9d9d9",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          padding: "20px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
          marginTop: "0px",
        }}
      >
        {/* Title Section */}
        {printSettings.title && (
          <div
            style={{
              fontSize: "18px",
              fontWeight: "bold",
              marginBottom: "12px",
              textAlign: "center",
              borderBottom: "2px solid #d9d9d9",
              paddingBottom: "8px",
              color: "#1f2937",
              flexShrink: 0,
            }}
          >
            {printSettings.title}
          </div>
        )}

        {/* Map Container Area - FIXED */}
        <div
          style={{
            flex: 1,
            border: "1px solid #9ca3af",
            borderRadius: "4px",
            overflow: "hidden",
            marginBottom: "12px",
            minHeight: "200px",
            position: "relative",
            backgroundColor: "#f5f5f5",
          }}
        >
          {/* Loading indicator */}
          {!mapReady && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255, 255, 255, 0.8)",
                zIndex: 1000,
              }}
            >
              <div style={{ textAlign: "center", color: "#666" }}>
                <div style={{ fontSize: "12px", marginBottom: "8px" }}>
                  Loading map...
                </div>
              </div>
            </div>
          )}

          {/* Leaflet MapContainer */}
          <MapContainer
            center={center}
            zoom={zoom}
            style={{
              width: "100%",
              height: "100%",
            }}
            zoomControl={false}
            attributionControl={false}
            dragging={false}
            touchZoom={false}
            doubleClickZoom={false}
            scrollWheelZoom={false}
          >
            {/* Base tile layer */}
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              crossOrigin="anonymous"
              attribution="© OpenStreetMap contributors"
            />

            {/* GeoJSON layers and map ready handler */}
            <MapInner onReady={handleMapReady} geoJsonLayers={geoJsonLayers} />
          </MapContainer>
        </div>

        {/* Metadata Section */}
        <div
          style={{
            fontSize: "9px",
            color: "#6b7280",
            textAlign: "center",
            marginBottom: "8px",
            paddingBottom: "8px",
            borderBottom: "1px solid #e5e7eb",
            flexShrink: 0,
          }}
        >
          Generated on {new Date().toLocaleDateString()} at{" "}
          {new Date().toLocaleTimeString()}
        </div>

        {/* Footer Section */}
        {printSettings.footer && (
          <div
            style={{
              fontSize: "10px",
              textAlign: "center",
              color: "#4b5563",
              fontStyle: "italic",
              borderTop: "1px solid #d9d9d9",
              paddingTop: "8px",
              wordBreak: "break-word",
              flexShrink: 0,
            }}
          >
            {printSettings.footer}
          </div>
        )}
      </div>

      {/* Status Info Box */}
      <div
        style={{
          padding: "12px",
          backgroundColor: mapReady ? "#d4edda" : "#fff3cd",
          borderLeft: `4px solid ${mapReady ? "#28a745" : "#ffc107"}`,
          fontSize: "12px",
          color: mapReady ? "#155724" : "#856404",
          borderRadius: "4px",
          width: "100%",
          maxWidth: `${paperDimensions.width}px`,
          marginBottom: "16px",
        }}
      >
        Preview: <strong>{paperDimensions.width}px</strong> ×{" "}
        <strong>{Math.round(paperDimensions.height)}px</strong>
        {mapReady ? " ✓ Map ready" : " ⏳ Loading map..."}
      </div>
    </div>
  );
};

export default PrintPreview;
