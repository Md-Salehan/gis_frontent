// spatialQuery/utils/spatialPredicates.js
import * as turf from "@turf/turf";
import { convertToMeters } from "../../../../utils";

export function executePredicate(
  sourceGeom,
  targetGeom,
  predicate,
  distance,
  distanceUnit,
) {
  try {
    if (!sourceGeom || !targetGeom) return false;

    const sourceFeature = turf.feature(sourceGeom);
    const targetFeature = turf.feature(targetGeom);

    switch (predicate) {
      case "within":
        return executeWithin(sourceFeature, targetFeature);
      case "contains":
        return executeContains(sourceFeature, targetFeature);
      case "intersects":
        return executeIntersects(sourceFeature, targetFeature);
      case "touches":
        return executeTouches(sourceFeature, targetFeature);
      case "overlaps":
        return executeOverlaps(sourceFeature, targetFeature);
      case "crosses":
        return executeCrosses(sourceFeature, targetFeature);
      case "disjoint":
        return executeDisjoint(sourceFeature, targetFeature);
      case "within-distance":
        return executeWithinDistance(
          sourceFeature,
          targetFeature,
          distance,
          distanceUnit,
        );
      case "nearest":
        return executeNearest(
          sourceFeature,
          targetFeature,
          distance,
          distanceUnit,
        );
      default:
        return false;
    }
  } catch (error) {
    console.warn("Predicate execution error:", error);
    return false;
  }
}

// ============================================
// WITHIN
// ============================================

export function executeWithin(source, target) {
  try {
    const sBase = getBaseType(source.geometry.type);
    const tBase = getBaseType(target.geometry.type);

    if (sBase === "point" && tBase === "polygon") {
      return pointWithinPolygon(source, target);
    }
    if (sBase === "line" && tBase === "polygon") {
      return lineWithinPolygon(source, target);
    }
    if (sBase === "polygon" && tBase === "polygon") {
      return polygonWithinPolygon(source, target);
    }
    if (sBase === "point" && tBase === "line") {
      return pointWithinLine(source, target);
    }
    if (sBase === tBase) {
      return sameTypeWithin(source, target);
    }
    return turf.booleanWithin(source, target);
  } catch (error) {
    console.warn("executeWithin error:", error);
    return false;
  }
}

// ============================================
// CONTAINS
// ============================================

export function executeContains(source, target) {
  try {
    const sBase = getBaseType(source.geometry.type);
    const tBase = getBaseType(target.geometry.type);

    if (sBase === "polygon" && tBase === "point") {
      return pointWithinPolygon(target, source);
    }
    if (sBase === "polygon" && tBase === "line") {
      return lineWithinPolygon(target, source);
    }
    if (sBase === "polygon" && tBase === "polygon") {
      return polygonWithinPolygon(target, source);
    }
    if (sBase === "line" && tBase === "point") {
      return pointWithinLine(target, source);
    }
    if (sBase === tBase) {
      return sameTypeContains(source, target);
    }
    return turf.booleanContains(source, target);
  } catch (error) {
    console.warn("executeContains error:", error);
    return false;
  }
}

// ============================================
// INTERSECTS / TOUCHES / OVERLAPS / CROSSES
// ============================================

export function executeIntersects(source, target) {
  const sParts = explode(source);
  const tParts = explode(target);
  for (const s of sParts) {
    for (const t of tParts) {
      try {
        if (turf.booleanIntersects(s, t)) return true;
      } catch {
        continue;
      }
    }
  }
  return false;
}

export function executeTouches(source, target) {
  const sParts = explode(source);
  const tParts = explode(target);
  for (const s of sParts) {
    for (const t of tParts) {
      try {
        if (turf.booleanTouches(s, t)) return true;
      } catch {
        continue;
      }
    }
  }
  return false;
}

export function executeOverlaps(source, target) {
  const sParts = explode(source);
  const tParts = explode(target);
  for (const s of sParts) {
    for (const t of tParts) {
      try {
        if (turf.booleanOverlap(s, t)) return true;
      } catch {
        continue;
      }
    }
  }
  return false;
}

export function executeCrosses(source, target) {
  const sParts = explode(source);
  const tParts = explode(target);
  for (const s of sParts) {
    for (const t of tParts) {
      try {
        if (turf.booleanCrosses(s, t)) return true;
      } catch {
        continue;
      }
    }
  }
  return false;
}

// ============================================
// DISJOINT
// ============================================

export function executeDisjoint(source, target) {
  return !executeIntersects(source, target);
}

// ============================================
// DISTANCE PREDICATES
// ============================================

export function executeWithinDistance(source, target, distance, unit) {
  try {
    const maxMeters = convertToMeters(distance || 100, unit || "meters");
    const actualMeters = turf.distance(source, target, { units: "meters" });
    return actualMeters <= maxMeters;
  } catch (error) {
    console.warn("executeWithinDistance error:", error);
    return false;
  }
}

export function executeNearest(source, target, distance, unit) {
  try {
    const actualMeters = turf.distance(source, target, { units: "meters" });
    const maxMeters = convertToMeters(distance || Infinity, unit || "meters");
    return { result: actualMeters <= maxMeters, distance: actualMeters };
  } catch (error) {
    console.warn("executeNearest error:", error);
    return false;
  }
}

// ============================================
// INTERNAL HELPERS
// ============================================

/**
 * Point-in-polygon using raw coordinates.
 * Turf v7 requires the first arg to be a Coord, not a Feature.
 */
function pointWithinPolygon(pointFeature, polygonFeature) {
  const coord = getPointCoord(pointFeature);
  if (!coord) return false;

  const polygons = explode(polygonFeature);
  for (const poly of polygons) {
    const rings = polygonRings(poly);
    if (rings.length && coordInPolygon(coord, rings)) return true;
  }
  return false;
}

function polygonRings(polygonFeature) {
  const geom = polygonFeature.geometry;
  if (!geom || geom.type !== "Polygon") return [];   // callers explode() Multi* first
  return geom.coordinates;                            // [outerRing, ...holes]
}

function coordInPolygon(coord, rings) {
  if (!rings.length) return false;
  const [x, y] = coord;
  if (!pointInRing(x, y, rings[0])) return false;
  for (let i = 1; i < rings.length; i++) {
    if (pointInRing(x, y, rings[i])) return false;
  }
  return true;
}

function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointWithinLine(pointFeature, lineFeature) {
  const coord = getPointCoord(pointFeature);
  if (!coord) return false;
  const lines = explode(lineFeature);
  for (const line of lines) {
    try {
      const dist = turf.pointToLineDistance(coord, line, { units: "meters" });
      if (dist <= 1) return true;
    } catch {
      continue;
    }
  }
  return false;
}

function lineWithinPolygon(lineFeature, polygonFeature) {
  const lines = explode(lineFeature);
  for (const line of lines) {
    const coords = line.geometry.coordinates || [];
    for (const c of coords) {
      if (!pointWithinPolygon(turf.point(c), polygonFeature)) return false;
    }
  }
  return true;
}

function polygonWithinPolygon(source, target) {
  const polys = explode(source);
  for (const poly of polys) {
    const rings = polygonRings(poly);
    for (const ring of rings) {
      for (const c of ring) {
        if (!pointWithinPolygon(turf.point(c), target)) return false;
      }
    }
  }
  return true;
}

function sameTypeWithin(source, target) {
  const sParts = explode(source);
  const tParts = explode(target);
  for (const s of sParts) {
    let found = false;
    for (const t of tParts) {
      try {
        if (turf.booleanWithin(s, t)) {
          found = true;
          break;
        }
      } catch {
        continue;
      }
    }
    if (!found) return false;
  }
  return true;
}

function sameTypeContains(source, target) {
  const sParts = explode(source);
  const tParts = explode(target);
  for (const t of tParts) {
    let found = false;
    for (const s of sParts) {
      try {
        if (turf.booleanContains(s, t)) {
          found = true;
          break;
        }
      } catch {
        continue;
      }
    }
    if (!found) return false;
  }
  return true;
}

function explode(feature) {
  const geom = feature.geometry;
  if (!geom) return [feature];

  switch (geom.type) {
    case "MultiPoint":
      return geom.coordinates.map((c) => turf.point(c));
    case "MultiLineString":
      return geom.coordinates.map((c) => turf.lineString(c));
    case "MultiPolygon":
      return geom.coordinates.map((c) => turf.polygon(c));
    case "GeometryCollection":
      return (geom.geometries || []).map((g) => turf.feature(g));
    default:
      return [feature];
  }
}

function getPointCoord(feature) {
  const geom = feature.geometry;
  if (!geom) return null;
  if (geom.type === "Point") return geom.coordinates;
  if (geom.type === "MultiPoint") return geom.coordinates[0] || null;
  return null;
}

function getBaseType(type) {
  if (!type) return "unknown";
  if (type === "Point" || type === "MultiPoint") return "point";
  if (type === "LineString" || type === "MultiLineString") return "line";
  if (type === "Polygon" || type === "MultiPolygon") return "polygon";
  return "unknown";
}

// ============================================
// COMPATIBILITY (unchanged API)
// ============================================

export function isGeometryTypeCompatible(targetType, joinType, predicate) {
  const t = normalizeGeometryType(targetType);
  const j = normalizeGeometryType(joinType);

  const compatMatrix = {
    point: {
      point: ["nearest", "within-distance"],
      line: ["nearest", "within-distance", "intersects"],
      polygon: ["within", "intersects", "within-distance"],
    },
    line: {
      point: ["nearest", "within-distance", "intersects"],
      line: ["intersects", "crosses", "nearest", "within-distance"],
      polygon: [
        "intersects",
        "crosses",
        "within",
        "nearest",
        "within-distance",
      ],
    },
    polygon: {
      point: ["contains", "intersects", "within-distance"],
      line: ["contains", "intersects", "nearest", "within-distance"],
      polygon: ["within", "contains", "intersects", "overlaps", "touches"],
    },
  };

  const compatible = compatMatrix[t]?.[j] || [];
  return compatible.includes(predicate);
}

function normalizeGeometryType(type) {
  if (!type) return "unknown";
  const mapping = {
    Point: "point",
    MultiPoint: "point",
    LineString: "line",
    MultiLineString: "line",
    Polygon: "polygon",
    MultiPolygon: "polygon",
  };
  return mapping[type] || "unknown";
}