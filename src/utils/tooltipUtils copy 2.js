import { POPUP_CONFIG } from "../constants";

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
 * - Renders image(s) for any property key that ends with "_img_url"
 * - Preserves existing table layout for other properties
 * @param {Object} properties - Feature properties
 * @returns {string} HTML string for properties section
 */
const generatePropertiesSection = (properties = {}) => {
  const entries = Object.entries(properties || {});

  // Separate image properties (keys ending with _img_url) from others
  const imageEntries = entries.filter(([key]) =>
    String(key).toLowerCase().endsWith("_img_url")
  );

  const nonImageEntries = entries.filter(
    ([key]) => !String(key).toLowerCase().endsWith("_img_url")
  );

  // Helper: format keys to human readable
  const formatKey = (key) =>
    String(key)
      .replace(/_img_url$/i, "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .trim();

  // Helper: normalize image urls from a value (string, array, or single)
  const extractImageUrls = (val) => {
    if (!val && val !== 0) return [];
    if (Array.isArray(val))
      return val
        .map(String)
        .map((u) => u.trim())
        .filter(Boolean);
    if (typeof val === "string") {
      // support comma separated lists of urls
      if (val.includes(",")) {
        return val
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
      return [val.trim()];
    }
    // fallback to toString
    return [String(val)];
  };

  // build image gallery HTML (if any)
  const imagesHtml = imageEntries.length
    ? imageEntries
        .map(([key, value]) => {
          const urls = extractImageUrls(value)
            // basic URL validation - ignore entries that don't look like urls
            .filter((u) => {
              try {
                // allow protocol-relative and data URIs as well
                if (u.startsWith("data:")) return true;
                if (u.startsWith("//")) return true;
                new URL(u);
                return true;
              } catch {
                return false;
              }
            });

          if (urls.length === 0) return "";

          const formattedKey = formatKey(key);

          const imgs = urls
            .map(
              (u, i) => `
              <a href="${u}" target="_blank" rel="noopener noreferrer" style="display:inline-block;border-radius:8px;overflow:hidden;box-shadow:0 6px 18px rgba(15,23,42,0.08);margin:6px;">
                <img loading="lazy" src="${u}" alt="${formattedKey} ${
                i + 1
              }" style="display:block;height:120px;width:auto;max-width:180px;object-fit:cover;vertical-align:middle;border:0;">
              </a>
            `
            )
            .join("");

          return `
            <div style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <svg style="width:14px;height:14px;color:#3b82f6;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                  <h4 style="margin:0;font-size:13px;font-weight:600;color:#1e293b;">${formattedKey}</h4>
                </div>
              </div>
              <div style="display:flex;flex-wrap:wrap;align-items:flex-start;gap:8px;">
                ${imgs}
              </div>
            </div>
          `;
        })
        .join("")
    : "";

  // If there are no non-image properties and no image properties -> show placeholder
  if (nonImageEntries.length === 0 && imageEntries.length === 0) {
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

  // Build rows for non-image properties (preserve original table look & behavior)
  const rows = nonImageEntries
    .map(([key, value], index) => {
      const displayValue =
        value !== null && value !== undefined ? String(value) : "—";
      const bgColor = index % 2 === 0 ? "#f8fafc" : "#ffffff";
      const formattedKey = formatKey(key);

      // If the value looks like a URL, make it clickable (keeps UX improvement minimal)
      const isUrlLike =
        typeof value === "string" &&
        /^(https?:\/\/|\/\/|data:)/i.test(value.trim());

      const renderedValue = isUrlLike
        ? `<a href="${String(
            value
          ).trim()}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:underline;">${String(
            value
          )}</a>`
        : displayValue;

      return `
        <tr style="background-color:${bgColor};">
          <td style="font-weight:600;padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#1f2937;font-size:12px;width:40%;">${formattedKey}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#4b5563;font-size:12px;word-break:break-word;width:60%;">${renderedValue}</td>
        </tr>
      `;
    })
    .join("");

  // Compose final properties section: images (if any) + table (if non-image props exist)
  return `
    <div style="padding:0 0 0 0;">
      <div style="display:flex;align-items:center;padding:16px;border-bottom:1px solid #e5e7eb;">
        <svg style="width:16px;height:16px;margin-right:8px;color:#3b82f6;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <h3 style="margin:0;font-size:14px;font-weight:600;color:#1e293b;">Properties</h3>
      </div>

      ${imagesHtml}

      ${
        nonImageEntries.length > 0
          ? `
        <div style="padding:16px;">
          <div style="max-height:250px;overflow-y:auto;">
            <table style="width:100%;border-collapse:collapse;font-family:'Segoe UI',Arial,sans-serif;font-size:12px;">
              <tbody>${rows}</tbody>
            </table>
          </div>
          ${
            nonImageEntries.length < Object.keys(properties).length
              ? `<div style="text-align:center;padding:8px;color:#64748b;font-size:11px;border-top:1px solid #e5e7eb;margin-top:8px;">
              +${
                Object.keys(properties).length - nonImageEntries.length
              } more properties
            </div>`
              : ""
          }
        </div>
      `
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
