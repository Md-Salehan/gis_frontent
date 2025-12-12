import React, { memo, useCallback } from "react";
import { GeoJSON } from "react-leaflet";
import L from "leaflet";
import { useDispatch, useSelector } from "react-redux";
import { bindTooltip } from "../../utils";
import { HOVER_STYLE_CONFIG } from "../../constants";
import { updateViewport } from "../../store/slices/mapSlice";

const RED_STYLE = {
  color: "#ff0000",
  weight: 2,
  opacity: 1,
  fillColor: "#ff0000",
  fillOpacity: 0.25,
};

const BufferGeoJsonLayer = memo(({ layerId, geoJsonData, metaData, pane }) => {
  const dispatch = useDispatch();
  const viewport = useSelector((s) => s.map.viewport);

  const style = useCallback(() => {
    return RED_STYLE;
  }, []);

  const onEachFeature = useCallback(
    (feature, layer) => {
    //   if (feature.properties) {
    //     const title = "Buffer";
    //     const geometryType = feature.geometry?.type?.toLowerCase();
    //     let coordinates = null;
    //     if (geometryType === "point" && feature.geometry?.coordinates) {
    //       const [lng, lat] = feature.geometry.coordinates;
    //       coordinates = L.latLng(lat, lng);
    //     }
    //     bindTooltip(layer, feature.properties, title, coordinates, geometryType);
    //   }

      layer.on("mouseover", (e) => {
        const current = style(feature);
        e.target.setStyle({
          ...current,
          weight: (current.weight || 2) + (HOVER_STYLE_CONFIG.weightIncrease || 1),
          fillOpacity: (current.fillOpacity || 0) + (HOVER_STYLE_CONFIG.fillOpacityIncrease || 0.1),
        });
      });

      layer.on("mouseout", (e) => {
        e.target.setStyle(style(feature));
      });

      // layer.on("click", (e) => {
      //   try {
      //     const bounds = layer.getBounds?.();
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
    },
    [dispatch, style, viewport.zoom]
  );

  const pointToLayer = useCallback((feature, latlng) => {
    // use a visible red circle marker for point buffers
    return L.circleMarker(latlng, {
      radius: 8,
      color: "#ff0000",
      fillColor: "#ff0000",
      fillOpacity: 0.35,
      weight: 2,
    });
  }, []);

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

BufferGeoJsonLayer.displayName = "BufferGeoJsonLayer";
export default BufferGeoJsonLayer;