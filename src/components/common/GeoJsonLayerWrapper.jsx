import React from "react";
import { memo, useCallback } from "react";
import { GeoJSON } from "react-leaflet";
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

const GeoJsonLayerWrapper = memo(({ layerId, geoJsonData, metaData, pane }) => {
  const dispatch = useDispatch();
  const viewport = useSelector((state) => state.map.viewport);

  // Memoize style function
  const style = useCallback((feature) => {
    const props = metaData?.style || {};

    // Get styles from properties
    const customStyle = {
      color: props.stroke_color || DEFAULT_STYLES.color,
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
          radius: props.marker_size || 8,
          color:
            props.marker_color || props.stroke_color || DEFAULT_STYLES.color,
          fillColor: props.fill_color || DEFAULT_STYLES.fillColor,
          fillOpacity: props.fill_opacity || DEFAULT_STYLES.fillOpacity,
          weight: props.stroke_width || DEFAULT_STYLES.weight,
        };
      default:
        return DEFAULT_STYLES;
    }
  }, []);

  // handle feature events
  const onEachFeature = useCallback(
    (feature, layer) => {
      if (feature.properties) {
        const title = "Tooltip";
        const geometryType = feature.geometry?.type?.toLowerCase();
        let coordinates = null;

        // Extract coordinates for points
        if (geometryType === "point" && feature.geometry?.coordinates) {
          const [lng, lat] = feature.geometry.coordinates;
          coordinates = L.latLng(lat, lng);
        }

        bindTooltip(
          layer,
          feature.properties,
          title,
          coordinates,
          geometryType
        );
      }

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
    },
    [dispatch, style, viewport.zoom]
  );

  const pointToLayer = useCallback(
    (feature, latlng) => {
      const props = metaData?.style || {};
      const iconName = props.marker_fa_icon_name;
      const markerSize = Number(props.marker_size) || 18; // px
      const markerColor = props.marker_color || "#2c3e50";

      if (iconName) {
        // Build inline-styled FA icon so color/size are dynamic
        const html = `<i class="${iconName}" style="font-size:${markerSize}px;color:${markerColor};line-height:1;"></i>`;
        const icon = L.divIcon({
          className: "fa-icon-marker",
          html,
          iconSize: [markerSize, markerSize],
          iconAnchor: [Math.round(markerSize / 2), Math.round(markerSize / 2)],
        });
        return L.marker(latlng, { icon });
      }
      // fallback to Leaflet circle marker for non-font-awesome points
      return L.circleMarker(latlng, style(feature));
    },
    [style]
  );

  return (
    <GeoJSON
      key={layerId}
      data={geoJsonData}
      style={style}
      pointToLayer={pointToLayer}
      onEachFeature={onEachFeature}
      pane={pane}
    />
  );
});

GeoJsonLayerWrapper.displayName = "GeoJsonLayerWrapper";
export default GeoJsonLayerWrapper;
