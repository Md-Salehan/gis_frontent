import { POPUP_CONFIG } from "../constants";

/**
 * Simple HTML-escape to reduce injection risk when inserting text nodes
 * (we still produce HTML for images intentionally)
 */
const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

/**
 * Detect if a string/value looks like an image URL or data URI
 */
const isImageUrl = (val) => {
  if (typeof val !== "string") return false;
  const trimmed = val.trim();
  // data URI or absolute/relative http(s) + common image extensions
  return (
    /^data:image\/[a-zA-Z0-9+.-]+;base64,/.test(trimmed) ||
    (/^(https?:\/\/|\/)/i.test(trimmed) &&
      /\.(png|jpe?g|gif|webp|svg|bmp|tiff?)($|\?)/i.test(trimmed))
  );
};

/**
 * Heuristic: key suggests an image (img, image, photo, thumb, thumbnail, picture, avatar, logo, media)
 */
const isImageKey = (key = "") =>
  typeof key === "string" &&
  /(img|image|photo|thumb|thumbnail|picture|avatar|logo|media)/i.test(key);

/**
 * Render one or multiple images into an HTML fragment
 */
const renderImagesHtml = (images) => {
  const imgs = Array.isArray(images) ? images : [images];
  const valid = imgs.filter((i) => isImageUrl(i));
  if (valid.length === 0) return "";
  if (valid.length === 1) {
    const src = escapeHtml(valid[0]);
    return `
      <div style="display:flex;justify-content:center;align-items:center;padding:8px 0;">
        <a href="${src}" target="_blank" rel="noopener noreferrer" style="display:inline-block;max-width:100%;">
          <img src="${src}" alt="image" loading="lazy" style="max-width:100%;max-height:160px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;"/>
        </a>
      </div>
    `;
  }

  // multiple thumbnails grid
  const thumbs = valid
    .map(
      (s) => `<a href="${escapeHtml(
        s
      )}" target="_blank" rel="noopener noreferrer" style="display:inline-block;">
        <img src="${escapeHtml(
          s
        )}" alt="image" loading="lazy" style="width:100px;height:70px;object-fit:cover;border-radius:4px;border:1px solid #e5e7eb;margin:4px;"/>
      </a>`
    )
    .join("");

  return `<div style="display:flex;flex-wrap:wrap;justify-content:flex-start;padding:8px 0;">${thumbs}</div>`;
};

/**
 * Generate coordinates section HTML
 * @param {Object} latlng - Leaflet LatLng object
 * @returns {string} HTML string for coordinates section
 */
const generateCoordinatesSection = (latlng) => {
  if (!latlng) return "";

  const lat = latlng.lat?.toFixed(6) || "N/A";
  const lng = latlng.lng?.toFixed(6) || "N/A";

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
  const filteredProperties = Object.entries(properties).filter(
    ([key]) => !key.startsWith("_")
  ); // Filter out internal properties
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
      // handle images (single url, array of urls, or objects with url prop)
      let imageHtml = "";
      const normalizedValue =
        value && typeof value === "object" && !Array.isArray(value)
          ? // possible { url: "...", src: "...", href: "..." }
            value.url ||
            value.src ||
            value.href ||
            value.path ||
            value.link ||
            value
          : value;

      if (
        (isImageKey(key) &&
          (isImageUrl(normalizedValue) ||
            (Array.isArray(normalizedValue) &&
              normalizedValue.some(isImageUrl)))) ||
        (Array.isArray(normalizedValue) && normalizedValue.every(isImageUrl))
      ) {
        imageHtml = renderImagesHtml(normalizedValue);
      } else if (
        // also treat any string value that looks like an image URL as image (even if key not obviously image)
        typeof normalizedValue === "string" &&
        isImageUrl(normalizedValue)
      ) {
        imageHtml = renderImagesHtml(normalizedValue);
      }

      // if imageHtml present, render a single-row image block spanning both columns
      if (imageHtml) {
        return `
          <tr style="background-color:${
            index % 2 === 0 ? "#f8fafc" : "#ffffff"
          };">
            <td colspan="2" style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">
              <div style="font-size:12px;color:#64748b;margin-bottom:6px;font-weight:500;">${escapeHtml(
                key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
              )}</div>
              ${imageHtml}
            </td>
          </tr>
        `;
      }

      const displayValue =
        normalizedValue !== null && normalizedValue !== undefined
          ? escapeHtml(
              typeof normalizedValue === "object"
                ? JSON.stringify(normalizedValue)
                : String(normalizedValue)
            )
          : "—";
      const bgColor = index % 2 === 0 ? "#f8fafc" : "#ffffff";
      const formattedKey = escapeHtml(
        key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
      );

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
      ${
        filteredProperties.length < Object.keys(properties).length
          ? `<div style="text-align:center;padding:8px;color:#64748b;font-size:11px;border-top:1px solid #e5e7eb;margin-top:8px;">
          +${
            Object.keys(properties).length - filteredProperties.length
          } more properties
        </div>`
          : ""
      }
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
const generateTooltipHTML = (
  properties = {},
  latlng = null,
  geometryType = ""
) => {
  const isPoint = geometryType === "point" || geometryType === "P";

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
      ${isPoint && latlng ? generateCoordinatesSection(latlng) : ""}
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
export const bindTooltip = (
  layer,
  properties = {},
  title = "",
  latlng = null,
  geometryType = ""
) => {
  if (properties && Object.keys(properties).length > 0) {
    const tooltipHtml = generateTooltipHTML(properties, latlng, geometryType);
    layer.bindPopup(tooltipHtml, {
      ...POPUP_CONFIG,
      className: "enhanced-tooltip",
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
