import { TOOLTIP_CONFIG, DEFAULT_LABEL_STYLE } from "../constants";

/**
 * Build HTML content for tooltips with CSS custom properties
 * @param {string} name - The label text to display
 * @param {Object} properties - Feature properties for styling
 * @returns {string} HTML string for tooltip
 */
export const buildTooltipHtml = (name, properties = {}) => {
  const labelFontTyp = properties.label_font_typ || DEFAULT_LABEL_STYLE.fontTyp;
  const labelFontSize = properties.label_font_size || DEFAULT_LABEL_STYLE.fontSize;
  const labelColor = properties.label_color || DEFAULT_LABEL_STYLE.color;
  const labelBgColor = properties.label_bg_color || DEFAULT_LABEL_STYLE.bgColor;
  const labelBgStrokeWidth = properties.label_bg_stroke_width || DEFAULT_LABEL_STYLE.bgStrokeWidth;

  return `<div class="tooltip-content" style="
    --label-font-typ: ${labelFontTyp};
    --label-font-size: ${labelFontSize}px;
    --label-color: ${labelColor};
    --label-bg-color: ${labelBgColor};
    --label-bg-stroke-width: ${labelBgStrokeWidth}px;
  ">${name}</div>`;
};

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