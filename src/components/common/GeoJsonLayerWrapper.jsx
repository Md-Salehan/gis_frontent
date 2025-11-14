import React from "react";
import { memo, useCallback, useState } from "react";
import { GeoJSON } from "react-leaflet";
import { useDispatch, useSelector } from "react-redux";
import {
  updateViewport,
  setSelectedFeatures,
  setSelectedFeature,
} from "../../store/slices/mapSlice";
import { bindTooltip, getFeatureName } from "../../utils/tooltipUtils";
import FeatureDetailsPopup from "../map/FeatureDetailsPopup";
import L from "leaflet";

const GeoJsonLayerWrapper = memo(({ layerId, geoJsonData, metaData, pane }) => {
  const dispatch = useDispatch();
  const viewport = useSelector((state) => state.map.viewport);
  const [popupFeature, setPopupFeature] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);

  // Memoize style function
  const style = useCallback((feature) => {
    const props = feature?.properties || {};
    const defaultStyle = {
      color: "#000000",
      weight: 1,
      opacity: 1,
      fillOpacity: 1,
      fillColor: "none",
    };

    const customStyle = {
      color: props.stroke_color || defaultStyle.color,
      weight: props.stroke_width || defaultStyle.weight,
      opacity: props.stroke_opacity || defaultStyle.opacity,
      fillOpacity: props.fill_opacity || defaultStyle.fillOpacity,
      fillColor: props.fill_color || defaultStyle.fillColor,
    };

    switch (props.geom_typ) {
      case "G":
        return customStyle;
      case "L":
        return { ...customStyle, fillOpacity: 0 };
      case "P":
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

  // Handle feature events
  const onEachFeature = useCallback(
    (feature, layer) => {
      if (feature.properties) {
        // Add hover tooltip with feature name only
        const labelColumn = metaData?.portal_layer_map?.label_text_col_nm;
        const featureName = getFeatureName(feature.properties, labelColumn);
        bindTooltip(layer, featureName);
      }

      // Highlight on mouseover
      layer.on("mouseover", () => {
        const currentStyle = style(feature);
        layer.setStyle({
          ...currentStyle,
          weight: (currentStyle.weight || 1) + 1,
          fillOpacity: (currentStyle.fillOpacity || 0) + 0.2,
        });
      });

      layer.on("mouseout", () => {
        layer.setStyle(style(feature));
      });

      // Click -> Open detailed popup
      layer.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        const labelColumn = metaData?.portal_layer_map?.label_text_col_nm;
        const featureName = getFeatureName(feature.properties, labelColumn);

        setPopupFeature(feature);
        setPopupVisible(true);

        // Update Redux state
        dispatch(setSelectedFeatures([feature]));
        dispatch(setSelectedFeature(feature));
      });
    },
    [dispatch, style, metaData]
  );

  const pointToLayer = useCallback(
    (feature, latlng) => {
      const props = feature.properties || {};
      const iconName = props.marker_fa_icon_name;
      const markerSize = Number(props.marker_size) || 18;
      const markerColor = props.marker_color || "#2c3e50";

      if (iconName) {
        const html = `<i class="${iconName}" style="font-size:${markerSize}px;color:${markerColor};line-height:1;"></i>`;
        const icon = L.divIcon({
          className: "fa-icon-marker",
          html,
          iconSize: [markerSize, markerSize],
          iconAnchor: [Math.round(markerSize / 2), Math.round(markerSize / 2)],
        });
        return L.marker(latlng, { icon });
      }

      return L.circleMarker(latlng, style(feature));
    },
    [style]
  );

  const featureName = popupFeature
    ? getFeatureName(
        popupFeature.properties,
        metaData?.portal_layer_map?.label_text_col_nm
      )
    : "";

  return (
    <>
      <GeoJSON
        key={layerId}
        data={geoJsonData}
        style={style}
        pointToLayer={pointToLayer}
        onEachFeature={onEachFeature}
        pane={pane}
      />
      <FeatureDetailsPopup
        feature={popupFeature}
        visible={popupVisible}
        onClose={() => setPopupVisible(false)}
        featureName={featureName}
      />
    </>
  );
});

GeoJsonLayerWrapper.displayName = "GeoJsonLayerWrapper";
export default GeoJsonLayerWrapper;
