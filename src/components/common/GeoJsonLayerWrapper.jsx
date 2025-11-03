import React from "react";
import { memo, useCallback } from "react";
import { GeoJSON, CircleMarker } from "react-leaflet";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedFeature, updateViewport } from "../../store/slices/mapSlice";
import { circleMarker } from "leaflet";

const GeoJsonLayerWrapper = memo(({ layerId, geoJsonData }) => {
  const dispatch = useDispatch();
  const viewport = useSelector((state) => state.map.viewport);

  // Memoize style function
  const style = useCallback((feature) => {
    const props = feature?.properties || {};
    
    // Default styles if properties are missing
    const defaultStyle = {
      color: "#000000",
      weight: 1,
      opacity: 0.8,
      fillOpacity: 0.6,
      fillColor: "#3bf6ae"
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
      case 'G': // Polygon
        return customStyle;
      case 'L': // Line
        return {
          ...customStyle,
          fillOpacity: 0 // Lines don't need fill
        };
      case 'P': // Point
        return {
          radius: props.marker_size || 8,
          color: props.marker_color || props.stroke_color || defaultStyle.color,
          fillColor: props.fill_color || defaultStyle.fillColor,
          fillOpacity: props.fill_opacity || defaultStyle.fillOpacity,
          weight: props.stroke_width || defaultStyle.weight
        };
      default:
        return defaultStyle;
    }
  }, []);

  // handle feature events
  const onEachFeature = useCallback(
    (feature, layer) => {
      if (feature.properties) {
        const name = feature.properties.ac_nm || feature.properties.blknm || 'xvfbvgfdbdgbgdbnagdabn gfbagfbngfnb athe thth ht4hth 4qt4q 53htht';
        layer.bindTooltip(name, {
          // sticky: true,
          className: 'custom-tooltip',
          style: {
            color: feature.properties.label_color || '#000000',
            backgroundColor: feature.properties.label_bg_color || '#FFFFFF'
          }
        });
      }

      // highlight on mouseover
      layer.on("mouseover", (e) => {
        const currentStyle = style(feature);
        e.target.setStyle({
          ...currentStyle,
          weight: currentStyle.weight + 1,
          fillOpacity: (currentStyle.fillOpacity || 0) + 0.2
        });
      });

      layer.on("mouseout", (e) => {
        e.target.setStyle(style(feature));
      });

      // click -> save selected feature and center map viewport on it
      layer.on("click", (e) => {
        dispatch(setSelectedFeature(feature));
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

  // Point features need special handling
  const pointToLayer = useCallback((feature, latlng) => {
    return new circleMarker(latlng, style(feature));
  }, [style]);

  return (
    <GeoJSON
      key={layerId}
      data={geoJsonData}
      style={style}
      pointToLayer={pointToLayer}
      onEachFeature={onEachFeature}
    />
  );
});

GeoJsonLayerWrapper.displayName = "GeoJsonLayerWrapper";
export default GeoJsonLayerWrapper;