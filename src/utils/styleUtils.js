import { DEFAULT_STYLES } from "../constants";

/**
 * Build style object for a feature based on geometry type
 * @param {Object} feature - GeoJSON feature
 * @param {Object} defaultStyle - Default style fallback
 * @returns {Object} Leaflet style object
 */
export const buildFeatureStyle = (feature, defaultStyle = DEFAULT_STYLES) => {
  const props = feature?.properties || {};
  const geomType = props.geom_typ;

  const customStyle = {
    color: props.stroke_color || defaultStyle.color,
    weight: props.stroke_width || defaultStyle.weight,
    opacity: props.stroke_opacity || defaultStyle.opacity,
    fillOpacity: props.fill_opacity || defaultStyle.fillOpacity,
    fillColor: props.fill_color || defaultStyle.fillColor,
  };

  // Apply geometry-specific adjustments
  switch (geomType) {
    case "G": // Polygon
      return customStyle;
    case "L": // Line
      return { ...customStyle, fillOpacity: 0 };
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
};

/**
 * Apply hover effect to a Leaflet layer
 * @param {Object} layer - Leaflet layer
 * @param {Object} currentStyle - Current style object
 * @param {Object} hoverSettings - Hover modifications (default adds weight + fillOpacity)
 */
export const applyHoverStyle = (
  layer,
  currentStyle,
  hoverSettings = { weightIncrease: 1, fillOpacityIncrease: 0.2 }
) => {
  layer.setStyle({
    ...currentStyle,
    weight: currentStyle.weight + hoverSettings.weightIncrease,
    fillOpacity: (currentStyle.fillOpacity || 0) + hoverSettings.fillOpacityIncrease,
  });
};

/**
 * Reset layer to original style
 * @param {Object} layer - Leaflet layer
 * @param {Object} originalStyle - Original style to restore
 */
export const resetLayerStyle = (layer, originalStyle) => {
  layer.setStyle(originalStyle);
};