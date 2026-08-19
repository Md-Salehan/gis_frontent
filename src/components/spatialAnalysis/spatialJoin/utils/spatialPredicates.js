import * as turf from "@turf/turf";

// Execute a spatial predicate between two geometries
export function executePredicate(
  targetGeom,
  joinGeom,
  predicate,
  distance,
  distanceUnit,
) {
  try {
    // Ensure valid geometries
    if (!targetGeom || !joinGeom) return false;

    // Normalize geometry types
    const targetType = targetGeom.type;
    const joinType = joinGeom.type;

    // Handle GeometryCollection
    let target = targetGeom;
    let join = joinGeom;

    if (targetType === "GeometryCollection") {
      const geoms = targetGeom.geometries || [];
      // Try each geometry until one matches
      for (const g of geoms) {
        if (isCompatibleGeometry(g.type, joinType)) {
          target = g;
          break;
        }
      }
      // If no geometry matched, use the first geometry
      if (target === targetGeom && geoms.length > 0) {
        target = geoms[0];
      }
    }

    if (joinType === "GeometryCollection") {
      const geoms = joinGeom.geometries || [];
      for (const g of geoms) {
        if (isCompatibleGeometry(targetType, g.type)) {
          join = g;
          break;
        }
      }
    }

    // Create Feature objects for turf
    const targetFeature = turf.feature(target);
    const joinFeature = turf.feature(join);

    // Execute predicate
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

// Individual predicate implementations
export function executeWithin(target, join) {
  try {
    return turf.booleanWithin(target, join);
  } catch {
    return false;
  }
}

export function executeContains(target, join) {
  try {
    return turf.booleanContains(target, join);
  } catch {
    return false;
  }
}

export function executeIntersects(target, join) {
  try {
    return turf.booleanIntersects(target, join);
  } catch {
    return false;
  }
}

export function executeTouches(target, join) {
  try {
    return turf.booleanTouches(target, join);
  } catch {
    return false;
  }
}

export function executeOverlaps(target, join) {
  try {
    return turf.booleanOverlap(target, join);
  } catch {
    return false;
  }
}

export function executeCrosses(target, join) {
  try {
    return turf.booleanCrosses(target, join);
  } catch {
    return false;
  }
}

export function executeWithinDistance(target, join, distance, unit) {
  try {
    const dist = distance || 100;
    const units = unit || "meters";
    const actualDist = turf.distance(target, join, { units: "meters" });

    // Convert the distance parameter to meters for comparison
    const distanceInMeters = convertToMeters(dist, units);
    return actualDist <= distanceInMeters;
  } catch {
    return false;
  }
}

export function executeNearest(target, join, distance, unit) {
  try {
    const dist = turf.distance(target, join, { units: "meters" });
    const maxDist = convertToMeters(distance || Infinity, unit || "meters");
    // Return the distance with the result
    return {
      result: dist <= maxDist,
      distance: dist,
    };
  } catch {
    return false;
  }
}

function convertToMeters(value, unit) {
  switch (unit) {
    case "kilometers":
      return value * 1000;
    case "miles":
      return value * 1609.34;
    case "meters":
    default:
      return value;
  }
}

// Helper: Check if geometry types are compatible
export function isGeometryTypeCompatible(targetType, joinType, predicate) {
  // Normalize types
  const t = normalizeGeometryType(targetType);
  const j = normalizeGeometryType(joinType);

  // Check compatibility matrix
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

// Helper: Normalize geometry type
function normalizeGeometryType(type) {
  if (!type) return "unknown";

  const normalized = type.replace("Multi", "");
  const mapping = {
    Point: "point",
    LineString: "line",
    Polygon: "polygon",
    MultiPoint: "point",
    MultiLineString: "line",
    MultiPolygon: "polygon",
  };

  return mapping[normalized] || "unknown";
}

// Helper: Check if two geometry types are compatible
function isCompatibleGeometry(type1, type2) {
  const t1 = normalizeGeometryType(type1);
  const t2 = normalizeGeometryType(type2);
  return t1 !== "unknown" && t2 !== "unknown";
}
