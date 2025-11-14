import React from "react";
import { memo, useCallback } from "react";
import { GeoJSON, CircleMarker } from "react-leaflet";
import { useDispatch, useSelector } from "react-redux";
import {
  setSelectedFeature,
  updateViewport,
  setSelectedFeatures,
} from "../../store/slices/mapSlice";
import L, { circleMarker } from "leaflet";
import { bindTooltip } from "../../utils";

const GeoJsonLayerWrapper = memo(({ layerId, geoJsonData, metaData, pane }) => {
  const dispatch = useDispatch();
  const viewport = useSelector((state) => state.map.viewport);

  // Memoize style function
  const style = useCallback((feature) => {
    const props = feature?.properties || {};

    // Default styles if properties are missing
    const defaultStyle = {
      color: "#000000",
      weight: 1,
      opacity: 1,
      fillOpacity: 1,
      fillColor: "none",
    };

    // Get styles from properties
    const customStyle = {
      color: props.stroke_color || defaultStyle.color,
      weight: props.stroke_width || defaultStyle.weight,
      opacity: props.stroke_opacity || defaultStyle.opacity,
      fillOpacity: props.fill_opacity || defaultStyle.fillOpacity,
      fillColor: props.fill_color || defaultStyle.fillColor,
    };

    // Apply styles based on geometry type
    switch (props.geom_typ) {
      case "G": // Polygon
        return customStyle;
      case "L": // Line
        return {
          ...customStyle,
          fillOpacity: 0, // Lines don't need fill
        };
      case "P": // Point
        return {
          radius: props.marker_size || 8,
          color: props.marker_color || props.stroke_color || defaultStyle.color,
          fillColor: props.fill_color || defaultStyle.fillColor,
          fillOpacity: props.fill_opacity || defaultStyle.fillOpacity,
          weight: props.stroke_width || defaultStyle.weight,
        };
      default:
        return defaultStyle;
    }
  }, []);

  // handle feature events
  const onEachFeature = useCallback(
    (feature, layer) => {
      if (feature.properties) {
        const name =
          feature.properties[metaData?.portal_layer_map?.label_text_col_nm] ||
          "";
        bindTooltip(layer, name);
      }

      // highlight on mouseover
      layer.on("mouseover", (e) => {
        const currentStyle = style(feature);
        e.target.setStyle({
          ...currentStyle,
          weight: currentStyle.weight + 1,
          fillOpacity: (currentStyle.fillOpacity || 0) + 0.2,
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
      const props = feature.properties || {};
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
