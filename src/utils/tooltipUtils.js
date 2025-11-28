import { POPUP_CONFIG } from "../constants";

/**
 * Generate coordinates section HTML
 * @param {Object} latlng - Leaflet LatLng object
 * @returns {string} HTML string for coordinates section
 */  
const generateCoordinatesSection = (latlng) => {
  if (!latlng) return '';
  
  const lat = latlng.lat?.toFixed(6) || 'N/A';
  const lng = latlng.lng?.toFixed(6) || 'N/A';
  
  return `
    <div style="padding:16px;border-bottom:1px solid #e5e7eb;background:#f8fafc;">
      <div style="display:flex;align-items:center;margin-bottom:8px;">
        <svg style="width:16px;height:16px;margin-right:8px;color:#3b82f6;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
        <h3 style="margin:0;font-size:14px;font-weight:600;color:#1e293b;">Coordinates</h3>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12px;">
        <div>
          <span style="font-weight:500;color:#64748b;">Latitude:</span>
          <div style="color:#1e293b;font-weight:600;margin-top:2px;">${lat}</div>
        </div>
        <div>
          <span style="font-weight:500;color:#64748b;">Longitude:</span>
          <div style="color:#1e293b;font-weight:600;margin-top:2px;">${lng}</div>
        </div>
      </div>
    </div>
  `;
};

/**
 * Generate properties section HTML
 * @param {Object} properties - Feature properties
 * @returns {string} HTML string for properties section
 */
const generatePropertiesSection = (properties = {}) => {
  const filteredProperties = Object.entries(properties)
    .filter(([key]) => !key.startsWith("_")) // Filter out internal properties
    // .slice(0, 10); // Limit to first 10 properties for better UX

  if (filteredProperties.length === 0) {
    return `
      <div style="padding:16px;">
        <div style="display:flex;align-items:center;margin-bottom:12px;">
          <svg style="width:16px;height:16px;margin-right:8px;color:#3b82f6;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <h3 style="margin:0;font-size:14px;font-weight:600;color:#1e293b;">Properties</h3>
        </div>
        <div style="text-align:center;padding:20px;color:#64748b;font-size:12px;">
          No properties available
        </div>
      </div>
    `;
  }

  const rows = filteredProperties
    .map(([key, value], index) => {
      const displayValue = value !== null && value !== undefined ? String(value) : "—";
      const bgColor = index % 2 === 0 ? "#f8fafc" : "#ffffff";
      const formattedKey = key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());

      return `
        <tr style="background-color:${bgColor};">
          <td style="font-weight:600;padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#1f2937;font-size:12px;width:40%;">${formattedKey}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#4b5563;font-size:12px;word-break:break-word;width:60%;">${displayValue}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div style="padding:16px;">
      <div style="display:flex;align-items:center;margin-bottom:12px;">
        <svg style="width:16px;height:16px;margin-right:8px;color:#3b82f6;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <h3 style="margin:0;font-size:14px;font-weight:600;color:#1e293b;">Properties</h3>
      </div>
      <div style="max-height:250px;overflow-y:auto;">
        <table style="width:100%;border-collapse:collapse;font-family:'Segoe UI',Arial,sans-serif;font-size:12px;">
          <tbody>${rows}</tbody>
        </table>
      </div>
      ${filteredProperties.length < Object.keys(properties).length ? 
        `<div style="text-align:center;padding:8px;color:#64748b;font-size:11px;border-top:1px solid #e5e7eb;margin-top:8px;">
          +${Object.keys(properties).length - filteredProperties.length} more properties
        </div>` : ''}
    </div>
  `;
};

/**
 * Generate complete tooltip HTML
 * @param {Object} properties - Feature properties
 * @param {Object} latlng - Leaflet LatLng object (for points)
 * @param {string} geometryType - Geometry type (point, line, polygon)
 * @returns {string} Complete HTML tooltip
 */
const generateTooltipHTML = (properties = {}, latlng = null, geometryType = '') => {
  const isPoint = geometryType === 'point' || geometryType === 'P';
  
  return `
    <div style="width:380px;max-height:400px;background:#ffffff;border-radius:8px;box-shadow:0 10px 25px rgba(0,0,0,0.15);overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);padding:16px;">
        <h2 style="margin:0;font-size:16px;font-weight:700;color:white;display:flex;align-items:center;gap:8px;">
          <svg style="width:18px;height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Feature Details
        </h2>
      </div>
      ${isPoint && latlng ? generateCoordinatesSection(latlng) : ''}
      ${generatePropertiesSection(properties)}
    </div>
  `;
};


/**
 * Bind tooltip to a Leaflet layer
 * @param {Object} layer - Leaflet layer object
 * @param {Object} properties - Feature properties object
 * @param {string} title - Tooltip title (deprecated, kept for compatibility)
 * @param {Object} latlng - Leaflet LatLng object (for points)
 * @param {string} geometryType - Geometry type
 */
export const bindTooltip = (layer, properties = {}, title = "", latlng = null, geometryType = '') => {
  if (properties && Object.keys(properties).length > 0) {
    const tooltipHtml = generateTooltipHTML(properties, latlng, geometryType);
    layer.bindPopup(tooltipHtml, {
      ...POPUP_CONFIG,
      className: "enhanced-tooltip"
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