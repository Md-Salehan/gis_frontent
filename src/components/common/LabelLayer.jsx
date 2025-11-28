import React, { memo, useCallback, useMemo, useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { useSelector } from "react-redux";

const LabelLayer = memo(({ layerId, geoJsonData, metaData }) => {
  const map = useMap();
  const activeLayerIds = useSelector((state) => state.map.layerOrder);
  const currentZoom = useSelector((state) => state.map.viewport.zoom);

  // Extract label configuration from metadata
  const labelConfig = useMemo(() => {
    const style = metaData?.style || {};

    // Parse label_offset_xy if available
    let offsetX = 0;
    let offsetY = 0;
    if (style.label_offset_xy) {
      try {
        const parsed = JSON.parse(style.label_offset_xy);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          offsetX = Number(parsed[0]) || 0;
          offsetY = Number(parsed[1]) || 0;
        }
      } catch (err) {
        console.warn("Failed to parse label_offset_xy:", style.label_offset_xy);
      }
    }

    return {
      fontType: style.label_font_typ || "Arial",
      fontSize: Number(style.label_font_size) || 12,
      textColor: style.label_color || "#000000",
      bgColor: style.label_bg_color || "transparent",
      bgStrokeWidth: Number(style.label_bg_stroke_width) || 0,
      zoomLevel: Number(style.label_zoom_level) || 14,
      offsetX,
      offsetY,
      enabled:
        style.label_font_size !== undefined && style.label_font_size !== null,
    };
  }, [metaData?.style]);

  // Check if layer is active
  const isLayerActive = useMemo(
    () => activeLayerIds.includes(layerId),
    [activeLayerIds, layerId]
  );

  // Check if zoom level is sufficient for label visibility
  const isZoomSufficient = useMemo(
    () => currentZoom >= labelConfig.zoomLevel,
    [currentZoom, labelConfig.zoomLevel]
  );

  // Calculate centroid for different geometry types
  const calculateCentroid = useCallback((geometry) => {
    if (!geometry) return null;

    switch (geometry.type.toLowerCase()) {
      case "point":
        return geometry.coordinates;
      case "linestring":
        return calculateLineStringCentroid(geometry.coordinates);
      case "polygon":
        return calculatePolygonCentroid(geometry.coordinates[0]);
      case "multipoint":
        return calculateMultiPointCentroid(geometry.coordinates);
      case "multilinestring":
        return calculateMultiLineStringCentroid(geometry.coordinates);
      case "multipolygon":
        return calculateMultiPolygonCentroid(geometry.coordinates);
      default:
        return null;
    }
  }, []);

  // Calculate centroid for LineString
  const calculateLineStringCentroid = useCallback((coords) => {
    if (!coords || coords.length === 0) return null;
    const mid = Math.floor(coords.length / 2);
    return coords[mid];
  }, []);

  // Calculate centroid for Polygon (simple polygon centroid)
  const calculatePolygonCentroid = useCallback((coords) => {
    if (!coords || coords.length === 0) return null;

    let area = 0;
    let x = 0;
    let y = 0;

    for (let i = 0; i < coords.length - 1; i++) {
      const [lng1, lat1] = coords[i];
      const [lng2, lat2] = coords[i + 1];
      const cross = lng1 * lat2 - lng2 * lat1;
      area += cross;
      x += (lng1 + lng2) * cross;
      y += (lat1 + lat2) * cross;
    }

    if (area === 0) return coords[0];
    return [x / (3 * area), y / (3 * area)];
  }, []);

  // Calculate centroid for MultiPoint
  const calculateMultiPointCentroid = useCallback((coords) => {
    if (!coords || coords.length === 0) return null;
    const lngSum = coords.reduce((sum, c) => sum + c[0], 0);
    const latSum = coords.reduce((sum, c) => sum + c[1], 0);
    return [lngSum / coords.length, latSum / coords.length];
  }, []);

  // Calculate centroid for MultiLineString
  const calculateMultiLineStringCentroid = useCallback(
    (coords) => {
      if (!coords || coords.length === 0) return null;
      // Use centroid of first line
      return calculateLineStringCentroid(coords[0]);
    },
    [calculateLineStringCentroid]
  );

  // Calculate centroid for MultiPolygon
  const calculateMultiPolygonCentroid = useCallback(
    (coords) => {
      if (!coords || coords.length === 0) return null;
      // Use centroid of first polygon
      return calculatePolygonCentroid(coords[0][0]);
    },
    [calculatePolygonCentroid]
  );

  // Extract label text from feature properties
  const getFeatureLabel = useCallback(
    (properties) => {
      if (!properties) return null;
      const lebel_column =
        metaData?.portal_layer_map?.label_text_col_nm || null;

      return lebel_column && properties[lebel_column]
        ? properties[lebel_column]
        : null;
    },
    [metaData.portal_layer_map]
  );

  // Create label icon HTML
  const createLabelIcon = (text, config) => {
    const html = `
      <div class="label-text" style="
        font-family: ${config.fontType}, sans-serif;
        font-size: ${config.fontSize}px;
        color: ${config.textColor};
        background-color: ${config.bgColor};
        border: ${config.bgStrokeWidth}px solid ${config.textColor};
        padding: 4px 8px;
        border-radius: 4px;
        white-space: nowrap;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        font-weight: 600;
      ">
        ${text}
      </div>
    `;

    return L.divIcon({
      html,
      className: "feature-label-icon",
      iconSize: null,
      iconAnchor: [config.offsetX, config.offsetY],
    });
  };

  // store markers
  const labelMarkersRef = useRef([]);

  useEffect(() => {
    // cleanup first
    cleanupLabels();

    if (!map || !geoJsonData || !isLayerActive || !labelConfig.enabled) {
      return;
    }

    createLabels();

    // on zoom use map.getZoom() (don't rely on Redux-only zoom)
    const handleZoom = () => {
      const mapZoom = map.getZoom();
      const shouldShow = mapZoom >= labelConfig.zoomLevel;
      labelMarkersRef.current.forEach((m) => m.setOpacity(shouldShow ? 1 : 0));
    };

    map.on("zoomend", handleZoom);

    return () => {
      map.off("zoomend", handleZoom);
      cleanupLabels();
    };
  }, [
    map,
    geoJsonData,
    isLayerActive,
    labelConfig,
    calculateCentroid,
    getFeatureLabel,
  ]);

  // Create label markers
  const createLabels = useCallback(() => {
    cleanupLabels();

    if (!geoJsonData.features || geoJsonData.features.length === 0) return;

    geoJsonData.features.forEach((feature) => {
      try {
        const centroid = calculateCentroid(feature.geometry);
        if (!centroid) return;

        const labelText = getFeatureLabel(feature.properties);
        if (!labelText) return;

        const [lng, lat] = centroid;
        const latlng = L.latLng(lat, lng);

        // Create label marker
        const icon = createLabelIcon(labelText, labelConfig);
        const marker = L.marker(latlng, {
          icon,
          interactive: false,
          zIndexOffset: 1000,
        });

        marker.addTo(map);
        labelMarkersRef.current.push(marker);

        // Set initial visibility based on actual map zoom
        const mapZoom = map.getZoom?.() ?? currentZoom;
        marker.setOpacity(mapZoom >= labelConfig.zoomLevel ? 1 : 0);
      } catch (err) {
        console.warn("Error creating label for feature:", err);
      }
    });
  }, [geoJsonData, calculateCentroid, getFeatureLabel, labelConfig, map]);

  // kept for backward compatibility (not used by effect)
  const updateLabelVisibility = useCallback(() => {
    const mapZoom = map.getZoom();
    const shouldShow = mapZoom >= labelConfig.zoomLevel;
    labelMarkersRef.current.forEach((marker) => {
      marker.setOpacity(shouldShow ? 1 : 0);
    });
  }, [map, labelConfig.zoomLevel]);

  // Cleanup labels
  const cleanupLabels = useCallback(() => {
    labelMarkersRef.current.forEach((marker) => {
      try {
        map.removeLayer(marker);
      } catch (err) {
        // ignore
      }
    });
    labelMarkersRef.current = [];
  }, [map]);

  return null; // This component doesn't render anything itself
});

LabelLayer.displayName = "LabelLayer";
export default LabelLayer;
