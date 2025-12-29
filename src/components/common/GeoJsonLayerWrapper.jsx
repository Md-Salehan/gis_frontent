import React, { useMemo } from "react";
import { memo, useCallback } from "react";
import { GeoJSON, useMap } from "react-leaflet";
import { useDispatch, useSelector } from "react-redux";
import { updateViewport } from "../../store/slices/mapSlice";
import L from "leaflet";
import { bindTooltip } from "../../utils";
import {
  DEFAULT_STYLES,
  GEOMETRY_TYPES,
  HOVER_STYLE_CONFIG,
  LINE_STYLE,
} from "../../constants";
import LabelLayer from "./LabelLayer";
import { meta } from "@eslint/js";

const GeoJsonLayerWrapper = memo(({ layerId, geoJsonData, metaData, pane }) => {
  const dispatch = useDispatch();
  const viewport = useSelector((state) => state.map.viewport);
  const map = useMap();
  // FIXED: Check if print modal is open
  const isPrintModalOpen = useSelector((state) => state.ui.isPrintModalOpen);

  // Optimized renderers per pane:
  // - Canvas for normal view (fast)
  // - SVG for print (scalable, sharp)
  const canvasRenderer = useMemo(() => {
    const key = `__canvas_renderer_for_${pane}`;
    if (!map[key]) {
      map[key] = L.canvas({
        padding: 0.5,
        pane,
        tolerance: 0, // Higher precision for print-like rendering
      });
    }
    return map[key];
  }, [map, pane]);

  // Create a pane-aware SVG renderer and reuse it on the map object
  const svgRenderer = useMemo(() => {
    const key = `__svg_renderer_for_${pane}`;
    if (!map[key]) {
      map[key] = L.svg({
        pane,
      });
    }
    return map[key];
  }, [map, pane]);

  

  // Memoize style function
  const style = useCallback((feature) => {
    const props = metaData?.style || {};

    // Get styles from properties
    const customStyle = {
      color: props.stroke_color || DEFAULT_STYLES.color ,
      weight: props.stroke_width || DEFAULT_STYLES.weight,
      opacity: props.stroke_opacity || DEFAULT_STYLES.opacity,
      fillOpacity: props.fill_opacity || DEFAULT_STYLES.fillOpacity,
      fillColor: props.fill_color || DEFAULT_STYLES.fillColor,
    };

    // Apply styles based on geometry type
    switch (props.geom_typ) {
      case GEOMETRY_TYPES.POLYGON: // Polygon
        return customStyle;
      case GEOMETRY_TYPES.LINE: // Line
        return {
          ...customStyle,
          ...LINE_STYLE,
        };
      case GEOMETRY_TYPES.POINT: // Point
        return {
          radius: props.marker_size || DEFAULT_STYLES.radius,
          color: props.stroke_color || DEFAULT_STYLES.color,
          fillColor: props.fill_color || DEFAULT_STYLES.markerFillColor,
          fillOpacity: props.fill_opacity || DEFAULT_STYLES.fillOpacity,
          weight: props.stroke_width || DEFAULT_STYLES.weight,
        };
      default:
        return DEFAULT_STYLES;
    }
  }, []);

  // Simplified onEachFeature for print (no interactivity)
  const onEachFeature = useCallback(
    (feature, layer, layer_nm) => {
      if (feature.properties && !isPrintModalOpen) {
        const title = "Tooltip";
        const geometryType = feature.geometry?.type?.toLowerCase();
        let coordinates = null;
        // layerNm = metaData?.name || "Layer";

        // Extract coordinates for points
        if (geometryType === "point" && feature.geometry?.coordinates) {
          const [lng, lat] = feature.geometry.coordinates;
          coordinates = L.latLng(lat, lng);
        }


        console.log(
          layer_nm,
          layer,
          { ...feature.properties },
          title,
          coordinates,
          geometryType
        , "mylog tooltip");
        

        bindTooltip(
          layer,
          { ...feature.properties },
          title,
          coordinates,
          geometryType,
          layer_nm
        );
      }

      // Disable hover effects and click for print
      // if (isPrintModalOpen) {
      //   layer.off("mouseover");
      //   layer.off("mouseout");
      //   layer.off("click");
      // } else {
        // highlight on mouseover
        layer.on("mouseover", (e) => {
          const currentStyle = style(feature);
          e.target.setStyle({
            ...currentStyle,
            weight: currentStyle.weight + HOVER_STYLE_CONFIG.weightIncrease,
            fillOpacity:
              (currentStyle.fillOpacity || 0) +
              HOVER_STYLE_CONFIG.fillOpacityIncrease,
          });
        });

        layer.on("mouseout", (e) => {
          e.target.setStyle(style(feature));
        });

        // click -> save selected feature and center map viewport on it
        layer.on("click", (e) => {
          try {
            const bounds = layer.getBounds?.();
            console.log(bounds, "bounds");

            if (bounds?.isValid()) {
              const center = bounds.getCenter();
              dispatch(
                updateViewport({
                  center: [center.lat, center.lng],
                  zoom: Math.min(16, viewport.zoom || 13),
                })
              );
            } else if (feature.geometry?.coordinates) {
              const [lng, lat] = feature.geometry.coordinates;
              dispatch(updateViewport({ center: [lat, lng] }));
            }
          } catch (err) {
            // ignore
          }
        });
      }
    // }
    ,
    [dispatch, style, viewport.zoom, isPrintModalOpen]
  );

  const pointToLayer = useCallback(
    (feature, latlng) => {
      const props = metaData?.style || {};
      const iconName = props.marker_fa_icon_name;
      const iconImg = props.marker_img_url;
      const markerSize =
        Math.max(8, Number(props.marker_size) || 18) *
        (isPrintModalOpen ? 1.2 : 1);
      const markerColor = props.marker_color || "#2c3e50";

      if (iconImg) {
        const icon = L.icon({
          iconUrl: iconImg,
          iconSize: [markerSize, markerSize],
          iconAnchor: [markerSize / 2, markerSize / 2],
          className: isPrintModalOpen ? "print-marker-icon" : "",
        });
        return L.marker(latlng, { icon });
      }

      if (iconName) {
        const html = `<i class="${iconName}" style="font-size:${markerSize}px;color:${markerColor};line-height:1;${
          isPrintModalOpen
            ? "filter: drop-shadow(1px 1px 1px rgba(0,0,0,0.3));"
            : ""
        }"></i>`;
        const icon = L.divIcon({
          className: `fa-icon-marker ${isPrintModalOpen ? "print-marker" : ""}`,
          html,
          iconSize: [markerSize, markerSize],
          iconAnchor: [Math.round(markerSize / 2), Math.round(markerSize / 2)],
        });
        return L.marker(latlng, { icon });
      }

      // Enhanced circle marker for print
      return L.circleMarker(latlng, {
        ...style(feature),
        radius: Math.max(
          4,
          (props.marker_size || 8) * (isPrintModalOpen ? 1.2 : 1)
        ),
      });
    },
    [style, metaData, isPrintModalOpen]
  );

  return (
    <>
      <GeoJSON
        key={`${layerId}-${isPrintModalOpen ? "print" : "normal"}`}
        data={geoJsonData}
        style={style}
        pointToLayer={pointToLayer}
        onEachFeature={(feature, layer) => onEachFeature(feature, layer, metaData?.layer?.layer_nm)}
        pane={pane}
        renderer={isPrintModalOpen ? svgRenderer : canvasRenderer} // Force SVG for print
        // interactive={!isPrintModalOpen} // Disable interactivity for print
      />
      {/* Label layer renders labels (centroid) for active layers using metadata styles */}
      <LabelLayer
        layerId={layerId}
        geoJsonData={geoJsonData}
        metaData={metaData}
      />
    </>
  );
});

GeoJsonLayerWrapper.displayName = "GeoJsonLayerWrapper";
export default GeoJsonLayerWrapper;
