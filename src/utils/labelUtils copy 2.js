import L from "leaflet";

/**
 * Create a label marker at the centroid of a feature
 * @param {Object} feature - GeoJSON feature
 * @param {L.LatLng} latlng - Leaflet LatLng object (centroid)
 * @param {Object} labelStyle - Label style configuration
 * @param {Object} extraOptions - Extra L.Marker options (e.g. { pane })
 * @returns {L.Marker|null} Leaflet marker with custom label
 */
export const createLabelMarker = (
  feature,
  latlng,
  labelStyle = {},
  extraOptions = {}
) => {
  const {
    label_text = "",
    label_font_type = "Arial",
    label_font_size = 12,
    label_color = "#000000",
    label_bg_color = "#ffffff",
    label_bg_stroke_width = 1,
  } = labelStyle || {};

  if (!label_text) return null;

  const html = `
    <div style="
      font-family: ${label_font_type};
      font-size: ${label_font_size}px;
      color: ${label_color};
      background-color: ${label_bg_color};
      padding: 4px 8px;
      border: ${label_bg_stroke_width}px solid ${label_color};
      border-radius: 4px;
      white-space: nowrap;
      box-shadow: 0 2px 4px rgba(0,0,0,0.08);
      pointer-events: none;
    ">
      ${label_text}
    </div>
  `;

  const icon = L.divIcon({
    className: "geojson-label-marker",
    html,
  });

  const opts = {
    icon,
    interactive: false,
    zIndexOffset: 1000,
    ...extraOptions,
  };

  return L.marker(latlng, opts);
};

/**
 * Calculate centroid of a GeoJSON feature
 * @param {Object} feature - GeoJSON feature
 * @returns {Array|null} [lat, lng] or null if unable to calculate
 */
export const calculateCentroid = (feature) => {
  if (!feature?.geometry) return null;

  const { type, coordinates } = feature.geometry;

  try {
    switch (type) {
      case "Point":
        const [lng, lat] = coordinates;
        return [lat, lng];

      case "LineString":
        return calculateLineStringCentroid(coordinates);

      case "Polygon":
        return calculatePolygonCentroid(coordinates[0]);

      case "MultiPoint":
        return calculateMultiPointCentroid(coordinates);

      case "MultiLineString":
        return calculateLineStringCentroid(coordinates.flat());

      case "MultiPolygon":
        return calculatePolygonCentroid(coordinates[0][0]);

      default:
        return null;
    }
  } catch (err) {
    console.error("Error calculating centroid:", err);
    return null;
  }
};

/**
 * Calculate centroid of a LineString
 * @param {Array} coordinates - Array of [lng, lat] coordinates
 * @returns {Array} [lat, lng] centroid
 */
const calculateLineStringCentroid = (coordinates) => {
  const midIndex = Math.floor(coordinates.length / 2);
  const [lng, lat] = coordinates[midIndex];
  return [lat, lng];
};

/**
 * Calculate centroid of a Polygon (using average of coordinates)
 * @param {Array} coordinates - Array of [lng, lat] coordinates (outer ring)
 * @returns {Array} [lat, lng] centroid
 */
const calculatePolygonCentroid = (coordinates) => {
  let sumLat = 0,
    sumLng = 0;
  const validCoords = coordinates.filter(
    (c) => Array.isArray(c) && c.length === 2
  );

  if (validCoords.length === 0) return null;

  validCoords.forEach(([lng, lat]) => {
    sumLng += lng;
    sumLat += lat;
  });

  return [sumLat / validCoords.length, sumLng / validCoords.length];
};

/**
 * Calculate centroid of MultiPoint
 * @param {Array} coordinates - Array of [lng, lat] coordinates
 * @returns {Array} [lat, lng] centroid
 */
const calculateMultiPointCentroid = (coordinates) => {
  let sumLat = 0,
    sumLng = 0;

  coordinates.forEach(([lng, lat]) => {
    sumLng += lng;
    sumLat += lat;
  });

  return [sumLat / coordinates.length, sumLng / coordinates.length];
};

/**
 * Get label configuration from feature properties and metadata
 * @param {Object} properties - Feature properties
 * @param {Object} metaData - Layer metadata
 * @returns {Object} Label configuration
 */
export const getLabelConfig = (properties = {}, metaData = {}) => {
  const styleConfig = metaData?.style || {};

  // Check if labels are enabled for this layer
  const isLabelEnabled = styleConfig.label_enabled !== false;

  if (!isLabelEnabled) {
    return { label_text: "" };
  }

  const labelColumn = styleConfig.label_column || "name";

  return {
    label_text: properties[labelColumn] || "xxxxx",
    label_font_type: styleConfig.label_font_type || "Arial",
    label_font_size: Number(styleConfig.label_font_size) || 12,
    label_color: styleConfig.label_color || "#000000",
    label_bg_color: styleConfig.label_bg_color || "#ffffff",
    label_bg_stroke_width: Number(styleConfig.label_bg_stroke_width) || 1,
    label_zoom_level: Number(styleConfig.label_zoom_level) || 12,
  };
};
