import * as turf from "@turf/turf";
import { convertToMeters } from "../../../../utils";
import { getCompatiblePredicates } from "./compatibilityMatrix";

// ---------------------------------------------------------------------------
// EXPORTS PRESERVED FROM ORIGINAL (do not rename, do not change semantics)
// ---------------------------------------------------------------------------

/**
 * Geometry-type compatibility check.
 * Preserved export: used by spatialJoin/hooks/useSpatialJoin.js.
 */
export function isGeometryTypeCompatible(targetType, joinType, predicate) {
  return getCompatiblePredicates(targetType, joinType).includes(predicate);
}

// ---------------------------------------------------------------------------
// NEW: true minimum distance between two geometries (meters).
// Used by spatialQuery. Not used by spatialJoin to preserve join behavior.
// ---------------------------------------------------------------------------
export function minDistanceMeters(a, b) {
  const fa = turf.feature(a.geometry || a);
  const fb = turf.feature(b.geometry || b);
  const ta = fa.geometry?.type;
  const tb = fb.geometry?.type;
  if (!ta || !tb) return Infinity;

  const aBase = getBaseType(ta);
  const bBase = getBaseType(tb);

  // Fast path: if they intersect at all, distance is 0.
  try {
    if (turf.booleanIntersects(fa, fb)) return 0;
  } catch (_) {}

  if (aBase === "point" && bBase === "point") {
    return turf.distance(fa, fb, { units: "meters" });
  }
  if (aBase === "point" && bBase === "line") return minPointToLine(fa, fb);
  if (aBase === "line" && bBase === "point") return minPointToLine(fb, fa);
  if (aBase === "point" && bBase === "polygon") return minPointToPolygon(fa, fb);
  if (aBase === "polygon" && bBase === "point") return minPointToPolygon(fb, fa);

  const aPts = collectVertices(fa);
  const bPts = collectVertices(fb);
  if (!aPts.length || !bPts.length) return Infinity;

  let best = Infinity;
  for (const pt of aPts) {
    const d = minPointToGeom(pt, fb, bBase);
    if (d < best) best = d;
    if (best === 0) return 0;
  }
  for (const pt of bPts) {
    const d = minPointToGeom(pt, fa, aBase);
    if (d < best) best = d;
    if (best === 0) return 0;
  }
  return best;
}

function minPointToGeom(pt, geomFeature, baseType) {
  if (baseType === "line") return minPointToLine(pt, geomFeature);
  if (baseType === "polygon") return minPointToPolygon(pt, geomFeature);
  if (baseType === "point") {
    return turf.distance(turf.getCoord(pt), turf.getCoord(geomFeature), {
      units: "meters",
    });
  }
  return Infinity;
}

function minPointToLine(pointFeature, lineFeature) {
  try {
    if (
      turf.booleanPointOnLine(pointFeature, lineFeature, {
        ignoreEndVertices: false,
      })
    ) {
      return 0;
    }
  } catch (_) {}
  try {
    return turf.pointToLineDistance(pointFeature, lineFeature, {
      units: "meters",
    });
  } catch (_) {
    const linePts = collectVertices(lineFeature);
    const p = turf.getCoord(pointFeature);
    let best = Infinity;
    for (const v of linePts) {
      const d = turf.distance(p, v, { units: "meters" });
      if (d < best) best = d;
    }
    return best;
  }
}

function minPointToPolygon(pointFeature, polygonFeature) {
  try {
    if (turf.booleanPointInPolygon(pointFeature, polygonFeature)) return 0;
  } catch (_) {}
  try {
    return turf.pointToPolygonDistance(pointFeature, polygonFeature, {
      units: "meters",
    });
  } catch (_) {
    const rings = collectVertices(polygonFeature);
    const p = turf.getCoord(pointFeature);
    let best = Infinity;
    for (const v of rings) {
      const d = turf.distance(p, v, { units: "meters" });
      if (d < best) best = d;
    }
    return best;
  }
}

function collectVertices(feature) {
  const out = [];
  const geom = feature.geometry || feature;
  if (!geom) return out;
  const walk = (coords) => {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === "number") {
      out.push(coords);
      return;
    }
    coords.forEach(walk);
  };
  if (geom.coordinates) walk(geom.coordinates);
  return out;
}

// ---------------------------------------------------------------------------
// PREDICATE DISPATCH
// ---------------------------------------------------------------------------
// Original contract preserved:
//   - returns boolean for every predicate EXCEPT "nearest"
//   - for "nearest", returns { result: boolean, distance: number }
//     (this is the original shape; do not change — spatialJoin relies on
//      truthiness of the return value)
//
// Semantics: `target` is the first arg, `join` is the second arg.
//   - "within"   => target is within join
//   - "contains" => target contains join
// This matches both:
//   - spatialJoin: executePredicate(targetGeom, joinGeom, ...)
//   - spatialQuery: executePredicate(srcGeom, tgtGeom, ...) where
//     "within" means "source within target" (source plays the `target`
//     role here). Documented, not changed.
// ---------------------------------------------------------------------------
export function executePredicate(
  targetGeom,
  joinGeom,
  predicate,
  distance,
  distanceUnit,
) {
  try {
    if (!targetGeom || !joinGeom) return false;

    const targetFeature = turf.feature(targetGeom);
    const joinFeature = turf.feature(joinGeom);

    switch (predicate) {
      case "within":
        return executeWithin(targetFeature, joinFeature);
      case "contains":
        return executeContains(targetFeature, joinFeature);
      case "intersects":
        return executeIntersects(targetFeature, joinFeature);
      case "touches":
        return executeTouches(targetFeature, joinFeature);
      case "overlaps":
        return executeOverlaps(targetFeature, joinFeature);
      case "crosses":
        return executeCrosses(targetFeature, joinFeature);
      case "disjoint":
        return executeDisjoint(targetFeature, joinFeature);
      case "within-distance":
        return executeWithinDistance(
          targetFeature,
          joinFeature,
          distance,
          distanceUnit,
        );
      case "nearest":
        return executeNearest(
          targetFeature,
          joinFeature,
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

// ---------------------------------------------------------------------------
// ORIGINAL PREDICATE IMPLEMENTATIONS (semantics preserved)
// ---------------------------------------------------------------------------

export function executeWithin(target, join) {
  try {
    const targetType = target.geometry.type;
    const joinType = join.geometry.type;
    const targetBase = getBaseType(targetType);
    const joinBase = getBaseType(joinType);

    if (targetBase === "point" && joinBase === "polygon") {
      return booleanPointInPolygon(target, join);
    }
    if (targetBase === "line" && joinBase === "polygon") {
      return booleanLineInPolygon(target, join);
    }
    if (targetBase === "polygon" && joinBase === "polygon") {
      return booleanPolygonInPolygon(target, join);
    }
    if (targetBase === "point" && joinBase === "line") {
      return booleanPointInLine(target, join);
    }
    if (targetBase === joinBase) {
      return booleanSameTypeWithin(target, join);
    }
    return turf.booleanWithin(target, join);
  } catch (error) {
    console.warn("executeWithin error:", error);
    return false;
  }
}

export function executeContains(target, join) {
  try {
    const targetType = target.geometry.type;
    const joinType = join.geometry.type;
    const targetBase = getBaseType(targetType);
    const joinBase = getBaseType(joinType);

    if (targetBase === "polygon" && joinBase === "point") {
      return booleanPointInPolygon(join, target);
    }
    if (targetBase === "polygon" && joinBase === "line") {
      return booleanLineInPolygon(join, target);
    }
    if (targetBase === "polygon" && joinBase === "polygon") {
      return booleanPolygonInPolygon(join, target);
    }
    if (targetBase === "line" && joinBase === "point") {
      return booleanPointInLine(join, target);
    }
    if (targetBase === joinBase) {
      return booleanSameTypeContains(target, join);
    }
    return turf.booleanContains(target, join);
  } catch (error) {
    console.warn("executeContains error:", error);
    return false;
  }
}

export function executeIntersects(target, join) {
  try {
    const targetGeoms = extractAllGeometries(target);
    const joinGeoms = extractAllGeometries(join);

    for (const tg of targetGeoms) {
      for (const jg of joinGeoms) {
        try {
          if (turf.booleanIntersects(tg, jg)) return true;
        } catch (_) {
          continue;
        }
      }
    }
    return false;
  } catch (error) {
    console.warn("executeIntersects error:", error);
    return false;
  }
}

export function executeTouches(target, join) {
  try {
    const targetGeoms = extractAllGeometries(target);
    const joinGeoms = extractAllGeometries(join);

    for (const tg of targetGeoms) {
      for (const jg of joinGeoms) {
        try {
          if (turf.booleanTouches(tg, jg)) return true;
        } catch (_) {
          continue;
        }
      }
    }
    return false;
  } catch (error) {
    console.warn("executeTouches error:", error);
    return false;
  }
}

export function executeOverlaps(target, join) {
  try {
    const targetGeoms = extractAllGeometries(target);
    const joinGeoms = extractAllGeometries(join);

    for (const tg of targetGeoms) {
      for (const jg of joinGeoms) {
        try {
          const tBase = getBaseType(tg.geometry.type);
          const jBase = getBaseType(jg.geometry.type);
          if (tBase === jBase && turf.booleanOverlap(tg, jg)) return true;
        } catch (_) {
          continue;
        }
      }
    }
    return false;
  } catch (error) {
    console.warn("executeOverlaps error:", error);
    return false;
  }
}

export function executeCrosses(target, join) {
  try {
    const targetGeoms = extractAllGeometries(target);
    const joinGeoms = extractAllGeometries(join);

    for (const tg of targetGeoms) {
      for (const jg of joinGeoms) {
        try {
          const tBase = getBaseType(tg.geometry.type);
          const jBase = getBaseType(jg.geometry.type);

          if (
            (tBase === "line" && jBase === "point") ||
            (tBase === "point" && jBase === "line")
          ) {
            if (turf.booleanCrosses(tg, jg)) return true;
          }
          if (tBase === "line" && jBase === "polygon") {
            if (lineCrossesPolygon(tg, jg)) return true;
          }
          if (tBase === "polygon" && jBase === "line") {
            if (lineCrossesPolygon(jg, tg)) return true;
          }
        } catch (_) {
          continue;
        }
      }
    }
    return false;
  } catch (error) {
    console.warn("executeCrosses error:", error);
    return false;
  }
}

export function executeWithinDistance(target, join, distance, unit) {
  try {
    const dist = distance || 100;
    const units = unit || "meters";
    const actualDist = turf.distance(target, join, { units: "meters" });
    const distanceInMeters = convertToMeters(dist, units);
    return actualDist <= distanceInMeters;
  } catch (error) {
    console.warn("executeWithinDistance error:", error);
    return false;
  }
}

export function executeNearest(target, join, distance, unit) {
  try {
    const dist = turf.distance(target, join, { units: "meters" });
    const maxDist = convertToMeters(distance || Infinity, unit || "meters");
    return {
      result: dist <= maxDist,
      distance: dist,
    };
  } catch (error) {
    console.warn("executeNearest error:", error);
    return false;
  }
}

export function executeDisjoint(target, join) {
  try {
    return !executeIntersects(target, join);
  } catch (error) {
    console.warn("executeDisjoint error:", error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// SAME-TYPE BOOLEAN HELPERS (preserved)
// ---------------------------------------------------------------------------
function booleanSameTypeWithin(target, join) {
  const targetGeoms = extractAllGeometries(target);
  const joinGeoms = extractAllGeometries(join);

  for (const tg of targetGeoms) {
    let found = false;
    for (const jg of joinGeoms) {
      try {
        if (turf.booleanWithin(tg, jg)) {
          found = true;
          break;
        }
      } catch (_) {
        continue;
      }
    }
    if (!found) return false;
  }
  return true;
}

function booleanSameTypeContains(target, join) {
  const targetGeoms = extractAllGeometries(target);
  const joinGeoms = extractAllGeometries(join);

  for (const jg of joinGeoms) {
    let found = false;
    for (const tg of targetGeoms) {
      try {
        if (turf.booleanContains(tg, jg)) {
          found = true;
          break;
        }
      } catch (_) {
        continue;
      }
    }
    if (!found) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// SPECIALIZED BOOLEAN HELPERS (preserved)
// ---------------------------------------------------------------------------
function booleanPointInPolygon(point, polygon) {
  try {
    const polys = extractAllGeometries(polygon);
    for (const p of polys) {
      try {
        if (turf.booleanPointInPolygon(point, p)) return true;
      } catch (_) {}
    }
    return false;
  } catch (error) {
    console.warn("booleanPointInPolygon error:", error);
    return false;
  }
}

function booleanPointInLine(point, line) {
  try {
    const lines = extractAllGeometries(line);
    for (const l of lines) {
      try {
        const d = turf.pointToLineDistance(point, l, { units: "meters" });
        if (d < 1) return true;
      } catch (_) {}
    }
    return false;
  } catch (error) {
    console.warn("booleanPointInLine error:", error);
    return false;
  }
}

function booleanLineInPolygon(line, polygon) {
  try {
    const polys = extractAllGeometries(polygon);
    for (const p of polys) {
      try {
        if (turf.booleanContains(p, line)) return true;
      } catch (_) {}
    }
    const linePoints = turf.explode(line);
    let insideCount = 0;
    const total = linePoints.features.length;
    if (total === 0) return false;
    for (const pt of linePoints.features) {
      if (booleanPointInPolygon(pt, polygon)) insideCount++;
    }
    return insideCount / total > 0.9;
  } catch (error) {
    console.warn("booleanLineInPolygon error:", error);
    return false;
  }
}

function booleanPolygonInPolygon(polygon, container) {
  try {
    const containers = extractAllGeometries(container);
    for (const c of containers) {
      try {
        if (turf.booleanContains(c, polygon)) return true;
      } catch (_) {}
    }
    const points = turf.explode(polygon);
    for (const pt of points.features) {
      if (!booleanPointInPolygon(pt, container)) return false;
    }
    return true;
  } catch (error) {
    console.warn("booleanPolygonInPolygon error:", error);
    return false;
  }
}

function lineCrossesPolygon(line, polygon) {
  try {
    const polys = extractAllGeometries(polygon);
    for (const p of polys) {
      try {
        const intersection = turf.intersect(
          turf.featureCollection([turf.feature(line.geometry), turf.feature(p.geometry)]),
        );
        if (intersection) {
          const intType = intersection.geometry.type;
          if (intType === "LineString" || intType === "MultiLineString") {
            return true;
          }
          if (intType === "Point" || intType === "MultiPoint") {
            const linePoints = turf.explode(line);
            let insideCount = 0;
            let total = 0;
            for (const pt of linePoints.features) {
              if (booleanPointInPolygon(pt, p)) insideCount++;
              total++;
            }
            if (total > 0 && insideCount > 0 && insideCount < total) {
              return true;
            }
          }
        }
      } catch (_) {
        continue;
      }
    }
    return false;
  } catch (error) {
    console.warn("lineCrossesPolygon error:", error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// UNIVERSAL GEOMETRY EXTRACTOR (preserved)
// ---------------------------------------------------------------------------
function extractAllGeometries(feature) {
  const geometries = [];
  try {
    const geom = feature.geometry;
    if (!geom) return [feature];
    const type = geom.type;

    if (type === "GeometryCollection") {
      for (const g of geom.geometries) geometries.push(turf.feature(g));
      return geometries;
    }
    if (type === "MultiPoint") {
      for (const coord of geom.coordinates) geometries.push(turf.point(coord));
      return geometries;
    }
    if (type === "MultiLineString") {
      for (const coord of geom.coordinates) geometries.push(turf.lineString(coord));
      return geometries;
    }
    if (type === "MultiPolygon") {
      for (const coord of geom.coordinates) geometries.push(turf.polygon(coord));
      return geometries;
    }
    geometries.push(feature);
  } catch (error) {
    console.warn("extractAllGeometries error:", error);
    geometries.push(feature);
  }
  return geometries;
}

function getBaseType(type) {
  if (!type) return "unknown";
  if (type === "Point" || type === "MultiPoint") return "point";
  if (type === "LineString" || type === "MultiLineString") return "line";
  if (type === "Polygon" || type === "MultiPolygon") return "polygon";
  if (type === "GeometryCollection") return "collection";
  return "unknown";
}