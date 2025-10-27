import { setSelectedFeature, updateViewport } from "../../../store/slices/mapSlice";

const defaultStyleLayerFeature = (feature, layer, dispatch) => {
  if (feature.properties && feature.properties.name) {
    layer.bindTooltip(
      `${feature.properties.name}: ${feature.properties.value}`,
      {
        sticky: true,
      }
    );
  }

  // highlight on mouseover
  layer.on("mouseover", (e) => {
    try {
      e.target.setStyle({
        weight: 2,
        color: "#111827",
        fillOpacity: 0.8,
      });
    } catch {}
  });
  layer.on("mouseout", (e) => {
    try {
      e.target.setStyle(style(feature));
    } catch {}
  });

  // click -> save selected feature and center map viewport on it
  layer.on("click", (e) => {
    dispatch(setSelectedFeature(feature));
    try {
      const bounds = layer.getBounds ? layer.getBounds() : null;
      if (bounds && bounds.isValid && bounds.isValid()) {
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
};


const dynamicStyleLayerFeature = (feature, layer, dispatch) => {
  if (feature.properties && feature.properties.name) {
    layer.bindTooltip(
      `${feature.properties.name}: ${feature.properties.value}`,
      {
        sticky: true,
      }
    );
  }

  // highlight on mouseover
  layer.on("mouseover", (e) => {
    try {
      e.target.setStyle({
        weight: 2,
        color: "#111827",
        fillOpacity: 0.8,
      });
    } catch {}
  });
  layer.on("mouseout", (e) => {
    try {
      e.target.setStyle(style(feature));
    } catch {}
  });

  // click -> save selected feature and center map viewport on it
  layer.on("click", (e) => {
    dispatch(setSelectedFeature(feature));
    try {
      const bounds = layer.getBounds ? layer.getBounds() : null;
      if (bounds && bounds.isValid && bounds.isValid()) {
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
};

export default defaultStyleLayerFeature;
