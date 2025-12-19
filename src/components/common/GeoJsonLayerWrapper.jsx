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

const GeoJsonLayerWrapper = memo(({ layerId, geoJsonData, metaData, pane }) => {
  const dispatch = useDispatch();
  const viewport = useSelector((state) => state.map.viewport);
  const map = useMap();
  // FIXED: Check if print modal is open
  const isPrintModalOpen = useSelector((state) => state.ui.isPrintModalOpen);

  // Optimized canvas renderer for print
  const canvasRenderer = useMemo(() => {
    const key = `__canvas_renderer_for_${pane}`;
    if (!map[key]) {
      map[key] = L.canvas({ 
        padding: 0.5, 
        pane,
        tolerance: 0 // Higher precision for print
      });
    }
    return map[key];
  }, [map, pane]);

  // Memoize style function with print optimization
  const style = useCallback((feature) => {
    const props = metaData?.style || {};

    // Enhanced styles for print (slightly bolder)
    const printStyle = {
      color: props.stroke_color || DEFAULT_STYLES.color,
      weight: Math.max(1, (props.stroke_width || DEFAULT_STYLES.weight) * (isPrintModalOpen ? 1.2 : 1)), // 20% thicker for print
      opacity: Math.min(1, (props.stroke_opacity || DEFAULT_STYLES.opacity) * (isPrintModalOpen ? 1.1 : 1)),
      fillOpacity: Math.min(1, (props.fill_opacity || DEFAULT_STYLES.fillOpacity) * (isPrintModalOpen ? 1.1 : 1)),
      fillColor: props.fill_color || DEFAULT_STYLES.fillColor,
      
      // Print-specific optimizations
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: isPrintModalOpen ? null : undefined, // Remove dashes for print clarity
    };

    // Apply styles based on geometry type
    switch (props.geom_typ) {
      case GEOMETRY_TYPES.POLYGON:
        return printStyle;
      case GEOMETRY_TYPES.LINE:
        return {
          ...printStyle,
          ...LINE_STYLE,
          weight: Math.max(2, printStyle.weight * (isPrintModalOpen ? 1.3 : 1)), // Lines even thicker for print
        };
      case GEOMETRY_TYPES.POINT:
        return {
          radius: Math.max(4, (props.marker_size || DEFAULT_STYLES.radius) * (isPrintModalOpen ? 1.2 : 1)),
          color: props.stroke_color || DEFAULT_STYLES.color,
          fillColor: props.fill_color || DEFAULT_STYLES.markerFillColor,
          fillOpacity: Math.min(1, (props.fill_opacity || DEFAULT_STYLES.fillOpacity) * (isPrintModalOpen ? 1.2 : 1)),
          weight: Math.max(1, (props.stroke_width || DEFAULT_STYLES.weight) * (isPrintModalOpen ? 1.2 : 1)),
        };
      default:
        return {
          ...DEFAULT_STYLES,
          weight: DEFAULT_STYLES.weight * (isPrintModalOpen ? 1.2 : 1),
        };
    }
  }, [metaData, isPrintModalOpen]);

  // Simplified onEachFeature for print (no interactivity)
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
          { ...feature.properties },
          title,
          coordinates,
          geometryType
        );
      }

      // Disable hover effects and click for print
      if (isPrintModalOpen) {
        layer.off('mouseover');
        layer.off('mouseout');
        layer.off('click');
      } else {
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
        // layer.on("click", (e) => {
        //   try {
        //     const bounds = layer.getBounds?.();
        //     console.log(bounds, "bounds");
            
        //     if (bounds?.isValid()) {
        //       const center = bounds.getCenter();
        //       dispatch(
        //         updateViewport({
        //           center: [center.lat, center.lng],
        //           zoom: Math.min(16, viewport.zoom || 13),
        //         })
        //       );
        //     } else if (feature.geometry?.coordinates) {
        //       const [lng, lat] = feature.geometry.coordinates;
        //       dispatch(updateViewport({ center: [lat, lng] }));
        //     }
        //   } catch (err) {
        //     // ignore
        //   }
        // });
      }
    },
    [dispatch, style, viewport.zoom, isPrintModalOpen]
  );

  const pointToLayer = useCallback(
    (feature, latlng) => {
      const props = metaData?.style || {};
      const iconName = props.marker_fa_icon_name;
      const iconImg = props.marker_img_url;
      const markerSize = Math.max(8, Number(props.marker_size) || 18) * (isPrintModalOpen ? 1.2 : 1);
      const markerColor = props.marker_color || "#2c3e50";

      if(iconImg){
        const icon = L.icon({
          iconUrl: iconImg,
          iconSize: [markerSize, markerSize],
          iconAnchor: [markerSize / 2, markerSize / 2],
          className: isPrintModalOpen ? 'print-marker-icon' : ''
        });
        return L.marker(latlng, { icon });
      }

      if (iconName) {
        const html = `<i class="${iconName}" style="font-size:${markerSize}px;color:${markerColor};line-height:1;${isPrintModalOpen ? 'filter: drop-shadow(1px 1px 1px rgba(0,0,0,0.3));' : ''}"></i>`;
        const icon = L.divIcon({
          className: `fa-icon-marker ${isPrintModalOpen ? 'print-marker' : ''}`,
          html,
          iconSize: [markerSize, markerSize],
          iconAnchor: [Math.round(markerSize / 2), Math.round(markerSize / 2)],
        });
        return L.marker(latlng, { icon });
      }
      
      // Enhanced circle marker for print
      return L.circleMarker(latlng, {
        ...style(feature),
        radius: Math.max(4, (props.marker_size || 8) * (isPrintModalOpen ? 1.2 : 1)),
      });
    },
    [style, metaData, isPrintModalOpen]
  );

  return (
    <>
      <GeoJSON
        key={`${layerId}-${isPrintModalOpen ? 'print' : 'normal'}`}
        data={geoJsonData}
        style={style}
        pointToLayer={pointToLayer}
        onEachFeature={onEachFeature}
        pane={pane}
        // renderer={canvasRenderer}
        interactive={!isPrintModalOpen} // Disable interactivity for print
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