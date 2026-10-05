import * as turf from "@turf/turf";
import { convertToMeters } from "../../../../utils";

// Execute a spatial predicate between two geometries
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

// ============================================
// PREDICATE IMPLEMENTATIONS - HANDLE ALL TYPES
// ============================================

// 1. WITHIN - Target is inside Join
export function executeWithin(target, join) {
  try {
    const targetType = target.geometry.type;
    const joinType = join.geometry.type;
    const targetBase = getBaseType(targetType);
    const joinBase = getBaseType(joinType);

    // Point in Polygon/MultiPolygon
    if (targetBase === 'point' && joinBase === 'polygon') {
      return booleanPointInPolygon(target, join);
    }

    // Line in Polygon/MultiPolygon
    if (targetBase === 'line' && joinBase === 'polygon') {
      return booleanLineInPolygon(target, join);
    }

    // Polygon in Polygon/MultiPolygon
    if (targetBase === 'polygon' && joinBase === 'polygon') {
      return booleanPolygonInPolygon(target, join);
    }

    // Point in Line/MultiLine
    if (targetBase === 'point' && joinBase === 'line') {
      return booleanPointInLine(target, join);
    }

    // Same types - check all geometries
    if (targetBase === joinBase) {
      return booleanSameTypeWithin(target, join);
    }

    // Default fallback
    return turf.booleanWithin(target, join);
  } catch (error) {
    console.warn("executeWithin error:", error);
    return false;
  }
}

// 2. CONTAINS - Target contains Join
export function executeContains(target, join) {
  try {
    const targetType = target.geometry.type;
    const joinType = join.geometry.type;
    const targetBase = getBaseType(targetType);
    const joinBase = getBaseType(joinType);

    // Polygon/MultiPolygon contains Point
    if (targetBase === 'polygon' && joinBase === 'point') {
      return booleanPointInPolygon(join, target);
    }

    // Polygon/MultiPolygon contains Line
    if (targetBase === 'polygon' && joinBase === 'line') {
      return booleanLineInPolygon(join, target);
    }

    // Polygon/MultiPolygon contains Polygon
    if (targetBase === 'polygon' && joinBase === 'polygon') {
      return booleanPolygonInPolygon(join, target);
    }

    // Line/MultiLine contains Point
    if (targetBase === 'line' && joinBase === 'point') {
      return booleanPointInLine(join, target);
    }

    // Same types - check all geometries
    if (targetBase === joinBase) {
      return booleanSameTypeContains(target, join);
    }

    // Default fallback
    return turf.booleanContains(target, join);
  } catch (error) {
    console.warn("executeContains error:", error);
    return false;
  }
}

// 3. INTERSECTS
export function executeIntersects(target, join) {
  try {
    const targetGeoms = extractAllGeometries(target);
    const joinGeoms = extractAllGeometries(join);

    for (const targetGeom of targetGeoms) {
      for (const joinGeom of joinGeoms) {
        try {
          if (turf.booleanIntersects(targetGeom, joinGeom)) {
            return true;
          }
        } catch (e) {
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

// 4. TOUCHES
export function executeTouches(target, join) {
  try {
    const targetGeoms = extractAllGeometries(target);
    const joinGeoms = extractAllGeometries(join);

    for (const targetGeom of targetGeoms) {
      for (const joinGeom of joinGeoms) {
        try {
          if (turf.booleanTouches(targetGeom, joinGeom)) {
            return true;
          }
        } catch (e) {
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

// 5. OVERLAPS
export function executeOverlaps(target, join) {
  try {
    const targetGeoms = extractAllGeometries(target);
    const joinGeoms = extractAllGeometries(join);

    for (const targetGeom of targetGeoms) {
      for (const joinGeom of joinGeoms) {
        try {
          const tBase = getBaseType(targetGeom.geometry.type);
          const jBase = getBaseType(joinGeom.geometry.type);
          
          // Overlap only applies to same geometry types
          if (tBase === jBase && turf.booleanOverlap(targetGeom, joinGeom)) {
            return true;
          }
        } catch (e) {
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

// 6. CROSSES
export function executeCrosses(target, join) {
  try {
    const targetGeoms = extractAllGeometries(target);
    const joinGeoms = extractAllGeometries(join);

    for (const targetGeom of targetGeoms) {
      for (const joinGeom of joinGeoms) {
        try {
          const tBase = getBaseType(targetGeom.geometry.type);
          const jBase = getBaseType(joinGeom.geometry.type);
          
          // Line crosses Point
          if ((tBase === 'line' && jBase === 'point') || 
              (tBase === 'point' && jBase === 'line')) {
            if (turf.booleanCrosses(targetGeom, joinGeom)) {
              return true;
            }
          }
          
          // Line crosses Polygon
          if (tBase === 'line' && jBase === 'polygon') {
            if (lineCrossesPolygon(targetGeom, joinGeom)) {
              return true;
            }
          }
          
          if (tBase === 'polygon' && jBase === 'line') {
            if (lineCrossesPolygon(joinGeom, targetGeom)) {
              return true;
            }
          }
        } catch (e) {
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

// 7. WITHIN DISTANCE
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

// 8. NEAREST
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

// ============================================
// SAME TYPE BOOLEAN FUNCTIONS
// ============================================

// Check if target geometries are within join geometries (same base type)
function booleanSameTypeWithin(target, join) {
  const targetGeoms = extractAllGeometries(target);
  const joinGeoms = extractAllGeometries(join);

  // ALL target geometries must be within ANY join geometry
  for (const targetGeom of targetGeoms) {
    let found = false;
    for (const joinGeom of joinGeoms) {
      try {
        if (turf.booleanWithin(targetGeom, joinGeom)) {
          found = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    if (!found) return false;
  }
  return true;
}

// Check if target contains join geometries (same base type)
function booleanSameTypeContains(target, join) {
  const targetGeoms = extractAllGeometries(target);
  const joinGeoms = extractAllGeometries(join);

  // ALL join geometries must be within ANY target geometry
  for (const joinGeom of joinGeoms) {
    let found = false;
    for (const targetGeom of targetGeoms) {
      try {
        if (turf.booleanContains(targetGeom, joinGeom)) {
          found = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    if (!found) return false;
  }
  return true;
}

// ============================================
// SPECIALIZED BOOLEAN FUNCTIONS
// ============================================

// Point in Polygon/MultiPolygon
function booleanPointInPolygon(point, polygon) {
  try {
    // Extract all polygons from the container
    const polygons = extractAllGeometries(polygon);
    
    // Check if point is in ANY polygon
    for (const p of polygons) {
      try {
        if (turf.booleanPointInPolygon(point, p)) {
          return true;
        }
      } catch (e) {
        continue;
      }
    }
    return false;
  } catch (error) {
    console.warn("booleanPointInPolygon error:", error);
    return false;
  }
}

// Point in Line/MultiLine
function booleanPointInLine(point, line) {
  try {
    const lines = extractAllGeometries(line);
    
    for (const l of lines) {
      try {
        const distance = turf.pointToLineDistance(point, l, { units: 'meters' });
        if (distance < 1) { // 1 meter tolerance
          return true;
        }
      } catch (e) {
        continue;
      }
    }
    return false;
  } catch (error) {
    console.warn("booleanPointInLine error:", error);
    return false;
  }
}

// Line in Polygon/MultiPolygon
function booleanLineInPolygon(line, polygon) {
  try {
    const polygons = extractAllGeometries(polygon);
    
    // Check if line is fully contained in any single polygon
    for (const p of polygons) {
      try {
        if (turf.booleanContains(p, line)) {
          return true;
        }
      } catch (e) {
        continue;
      }
    }
    
    // Check if line points are inside (for lines crossing polygon boundaries)
    const linePoints = turf.explode(line);
    let insideCount = 0;
    const totalPoints = linePoints.features.length;
    
    if (totalPoints === 0) return false;
    
    for (const point of linePoints.features) {
      if (booleanPointInPolygon(point, polygon)) {
        insideCount++;
      }
    }
    
    // If more than 90% of points are inside, consider it "within"
    return insideCount / totalPoints > 0.9;
  } catch (error) {
    console.warn("booleanLineInPolygon error:", error);
    return false;
  }
}

// Polygon in Polygon/MultiPolygon
function booleanPolygonInPolygon(polygon, container) {
  try {
    const containers = extractAllGeometries(container);
    
    // Check if polygon is fully contained in any single container
    for (const c of containers) {
      try {
        if (turf.booleanContains(c, polygon)) {
          return true;
        }
      } catch (e) {
        continue;
      }
    }
    
    // Check if all points of polygon are inside container
    const points = turf.explode(polygon);
    for (const point of points.features) {
      if (!booleanPointInPolygon(point, container)) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.warn("booleanPolygonInPolygon error:", error);
    return false;
  }
}

// Line crosses Polygon
function lineCrossesPolygon(line, polygon) {
  try {
    const polygons = extractAllGeometries(polygon);
    
    for (const p of polygons) {
      try {
        const intersection = turf.intersect(turf.featureCollection([
          turf.feature(line.geometry),
          turf.feature(p.geometry)
        ]));
        
        if (intersection) {
          const intType = intersection.geometry.type;
          
          // LineString intersection means it crosses through
          if (intType === 'LineString' || intType === 'MultiLineString') {
            return true;
          }
          
          // Point intersection - check if line enters and exits
          if (intType === 'Point' || intType === 'MultiPoint') {
            const linePoints = turf.explode(line);
            let insideCount = 0;
            let totalPoints = 0;
            
            for (const point of linePoints.features) {
              if (booleanPointInPolygon(point, p)) {
                insideCount++;
              }
              totalPoints++;
            }
            
            if (totalPoints > 0 && insideCount > 0 && insideCount < totalPoints) {
              return true;
            }
          }
        }
      } catch (e) {
        continue;
      }
    }
    return false;
  } catch (error) {
    console.warn("lineCrossesPolygon error:", error);
    return false;
  }
}

// ============================================
// UNIVERSAL GEOMETRY EXTRACTOR
// ============================================

// Extract ALL individual geometries from any geometry type
function extractAllGeometries(feature) {
  const geometries = [];
  
  try {
    const geom = feature.geometry;
    if (!geom) return [feature];
    
    const type = geom.type;
    
    // Handle GeometryCollection
    if (type === 'GeometryCollection') {
      for (const g of geom.geometries) {
        geometries.push(turf.feature(g));
      }
      return geometries;
    }
    
    // Handle Multi types
    if (type === 'MultiPoint') {
      for (const coord of geom.coordinates) {
        geometries.push(turf.point(coord));
      }
      return geometries;
    }
    
    if (type === 'MultiLineString') {
      for (const coord of geom.coordinates) {
        geometries.push(turf.lineString(coord));
      }
      return geometries;
    }
    
    if (type === 'MultiPolygon') {
      for (const coord of geom.coordinates) {
        geometries.push(turf.polygon(coord));
      }
      return geometries;
    }
    
    // Single geometry
    geometries.push(feature);
    
  } catch (error) {
    console.warn("extractAllGeometries error:", error);
    geometries.push(feature);
  }
  
  return geometries;
}

// Get base geometry type (ignore Multi)
function getBaseType(type) {
  if (!type) return 'unknown';
  
  if (type === 'Point' || type === 'MultiPoint') return 'point';
  if (type === 'LineString' || type === 'MultiLineString') return 'line';
  if (type === 'Polygon' || type === 'MultiPolygon') return 'polygon';
  if (type === 'GeometryCollection') return 'collection';
  
  return 'unknown';
}

// ============================================
// COMPATIBILITY FUNCTIONS
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
      polygon: ["intersects", "crosses", "within", "nearest", "within-distance"],
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