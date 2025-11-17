import { TOOLTIP_CONFIG, DEFAULT_LABEL_STYLE } from "../constants";

/**
 * Generate HTML table from feature properties
 * @param {Object} properties - Feature properties
 * @returns {string} HTML table string
 */
const generatePropertiesTable = (properties = {}, title) => {
  const rows = Object.entries(properties)
    .filter(([key]) => !key.startsWith("_")) // Filter out internal properties
    .map(([key, value], index) => {
      const displayValue =
        value !== null && value !== undefined ? String(value) : "—";
      const bgColor = index % 2 === 0 ? "#f9fafb" : "#ffffff";
      const formattedKey = key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());

      return `<tr style="background-color:${bgColor};"><td style="font-weight:600;padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#1f2937;font-size:12px;">${formattedKey}</td><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#4b5563;font-size:12px;word-break:break-word;">${displayValue}</td></tr>`;
    })
    .join("");

  return `
    <div style="width:420px;max-height:350px;overflow-y:auto;border:1px solid #d1d5db;background:#ffffff;border-radius:6px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
      <div style="padding:12px;border-bottom:1px solid #e5e7eb;background:#f3f4f6;border-radius:6px 6px 0 0;">
        <p style="margin:0;font-weight:700;color:#1f2937;font-size:13px;">${title}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;font-family:'Segoe UI',Arial,sans-serif;font-size:12px;">
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
};

/**
 * Bind tooltip to a Leaflet layer
 * @param {Object} layer - Leaflet layer object
 * @param {Object} properties - Feature properties object
 */
export const bindTooltip = (layer, properties = {}, title = "") => {
  if (properties && Object.keys(properties).length > 0) {
    const tableHtml = generatePropertiesTable(properties, title);
    layer.bindPopup(tableHtml, {
      ...TOOLTIP_CONFIG,
      maxWidth: 450,
      maxHeight: 400,
      className: "custom-popup",
    });
  }
};

/**
 * Extract feature name/label from properties
 * @param {Object} properties - Feature properties
 * @param {string} labelColumn - Custom label column name
 * @returns {string} Feature name/label
 */
export const getFeatureName = (properties = {}, labelColumn = null) => {
  return (
    properties[labelColumn] || properties.label_text || properties.name || ""
  );
};
