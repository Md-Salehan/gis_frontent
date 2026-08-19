import * as turf from "@turf/turf";

// Validate GeoJSON geometry
export function isValidGeometry(geometry) {
  if (!geometry) return false;
  if (!geometry.type) return false;
  
  // Check for valid coordinates
  if (geometry.type === "GeometryCollection") {
    return geometry.geometries?.every((g) => isValidGeometry(g)) || false;
  }
  
  if (geometry.type === "Point") {
    return Array.isArray(geometry.coordinates) && geometry.coordinates.length >= 2;
  }
  
  if (geometry.type === "LineString" || geometry.type === "MultiPoint") {
    return Array.isArray(geometry.coordinates) && geometry.coordinates.length >= 2;
  }
  
  if (geometry.type === "Polygon") {
    return (
      Array.isArray(geometry.coordinates) &&
      geometry.coordinates.length > 0 &&
      geometry.coordinates[0].length >= 4
    );
  }
  
  if (geometry.type === "MultiLineString" || geometry.type === "MultiPolygon") {
    return Array.isArray(geometry.coordinates) && geometry.coordinates.length > 0;
  }
  
  return false;
}

// Get geometry type from feature
export function getGeometryType(feature) {
  if (!feature || !feature.geometry) return null;
  
  const geom = feature.geometry;
  if (geom.type === "GeometryCollection") {
    const types = geom.geometries?.map((g) => g.type) || [];
    return types;
  }
  
  return geom.type;
}

// Check if geometry is a point
export function isPoint(geometry) {
  if (!geometry) return false;
  return geometry.type === "Point" || geometry.type === "MultiPoint";
}

// Check if geometry is a line
export function isLine(geometry) {
  if (!geometry) return false;
  return geometry.type === "LineString" || geometry.type === "MultiLineString";
}

// Check if geometry is a polygon
export function isPolygon(geometry) {
  if (!geometry) return false;
  return geometry.type === "Polygon" || geometry.type === "MultiPolygon";
}

// Get number of vertices in geometry
export function getVertexCount(geometry) {
  if (!geometry) return 0;
  
  const countCoords = (coords) => {
    if (Array.isArray(coords)) {
      if (coords.length > 0 && Array.isArray(coords[0])) {
        if (coords.length > 0 && Array.isArray(coords[0][0])) {
          // 3D array (Polygon rings)
          return coords.reduce((sum, ring) => sum + ring.length, 0);
        } else {
          // 2D array (LineString, MultiPoint)
          return coords.length;
        }
      }
    }
    return 0;
  };
  
  if (geometry.type === "GeometryCollection") {
    return geometry.geometries.reduce((sum, g) => sum + getVertexCount(g), 0);
  }
  
  return countCoords(geometry.coordinates);
}

// Get area of geometry (in square meters)
export function getArea(geometry) {
  if (!geometry) return 0;
  
  try {
    const feature = turf.feature(geometry);
    return turf.area(feature);
  } catch {
    return 0;
  }
}

// Get length of geometry (in meters)
export function getLength(geometry) {
  if (!geometry) return 0;
  
  try {
    const feature = turf.feature(geometry);
    return turf.length(feature, { units: "meters" });
  } catch {
    return 0;
  }
}

// Get centroid of geometry
export function getCentroid(geometry) {
  if (!geometry) return null;
  
  try {
    const feature = turf.feature(geometry);
    return turf.centroid(feature);
  } catch {
    return null;
  }
}

// Get bounding box of geometry
export function getBbox(geometry) {
  if (!geometry) return null;
  
  try {
    const feature = turf.feature(geometry);
    return turf.bbox(feature);
  } catch {
    return null;
  }
}

// Check if two geometries are equal
export function areGeometriesEqual(geom1, geom2) {
  if (!geom1 || !geom2) return false;
  
  try {
    // Use turf's equality check
    return turf.booleanEqual(turf.feature(geom1), turf.feature(geom2));
  } catch {
    return false;
  }
}