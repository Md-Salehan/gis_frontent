import { TOOLTIP_CONFIG, DEFAULT_LABEL_STYLE } from "../constants";




/**
 * Bind tooltip to a Leaflet layer
 * @param {Object} layer - Leaflet layer object
 * @param {string} tooltipHtml - HTML content for tooltip
 */
export const bindTooltip = (layer, tooltipHtml) => {
  if (tooltipHtml) {
    layer.bindTooltip(tooltipHtml, TOOLTIP_CONFIG);
  }
};

/**
 * Extract feature name/label from properties
 * @param {Object} properties - Feature properties
 * @param {string} labelColumn - Custom label column name
 * @returns {string} Feature name/label
 */
export const getFeatureName = (properties = {}, labelColumn = null) => {
  return properties[labelColumn] || properties.label_text || properties.name || "";
};