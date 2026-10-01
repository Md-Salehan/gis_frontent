// Full compatibility matrix for geometry types and predicates
export const COMPATIBILITY_MATRIX = {
  point: {
    point: ["nearest", "within-distance"],
    line: ["nearest", "within-distance", "intersects"],
    polygon: ["within", "intersects", "within-distance"],
    multiPoint: ["nearest", "within-distance"],
    multiLineString: ["nearest", "within-distance", "intersects"],
    multiPolygon: ["within", "intersects", "within-distance"],
  },
  line: {
    point: ["nearest", "within-distance", "intersects"],
    line: ["intersects", "crosses", "nearest", "within-distance"],
    polygon: ["intersects", "crosses", "within", "nearest", "within-distance"],
    multiPoint: ["nearest", "within-distance", "intersects"],
    multiLineString: ["intersects", "crosses", "nearest", "within-distance"],
    multiPolygon: ["intersects", "crosses", "within", "nearest", "within-distance"],
  },
  polygon: {
    point: ["contains", "intersects", "within-distance"],
    line: ["contains", "intersects", "nearest", "within-distance"],
    polygon: ["within", "contains", "intersects", "overlaps", "touches"],
    multiPoint: ["contains", "intersects", "within-distance"],
    multiLineString: ["contains", "intersects", "nearest", "within-distance"],
    multiPolygon: ["within", "contains", "intersects", "overlaps", "touches"],
  },
  multiPoint: {
    point: ["nearest", "within-distance"],
    line: ["nearest", "within-distance", "intersects"],
    polygon: ["within", "intersects", "within-distance"],
    multiPoint: ["nearest", "within-distance"],
    multiLineString: ["nearest", "within-distance", "intersects"],
    multiPolygon: ["within", "intersects", "within-distance"],
  },
  multiLineString: {
    point: ["nearest", "within-distance", "intersects"],
    line: ["intersects", "crosses", "nearest", "within-distance"],
    polygon: ["intersects", "crosses", "within", "nearest", "within-distance"],
    multiPoint: ["nearest", "within-distance", "intersects"],
    multiLineString: ["intersects", "crosses", "nearest", "within-distance"],
    multiPolygon: ["intersects", "crosses", "within", "nearest", "within-distance"],
  },
  multiPolygon: {
    point: ["contains", "intersects", "within-distance"],
    line: ["contains", "intersects", "nearest", "within-distance"],
    polygon: ["within", "contains", "intersects", "overlaps", "touches"],
    multiPoint: ["contains", "intersects", "within-distance"],
    multiLineString: ["contains", "intersects", "nearest", "within-distance"],
    multiPolygon: ["within", "contains", "intersects", "overlaps", "touches"],
  },
};

// All available predicates
export const ALL_PREDICATES = [
  { value: "within", label: "Within" },
  { value: "contains", label: "Contains" },
  { value: "intersects", label: "Intersects" },
  { value: "touches", label: "Touches" },
  { value: "overlaps", label: "Overlaps" },
  { value: "crosses", label: "Crosses" },
  { value: "within-distance", label: "Within Distance" },
  { value: "nearest", label: "Nearest" },
];

export function getCompatiblePredicates(targetType, joinType) {
  const normalizedTarget = normalizeType(targetType);
  const normalizedJoin = normalizeType(joinType);
  
  const matrix = COMPATIBILITY_MATRIX[normalizedTarget] || {};
  const predicates = matrix[normalizedJoin] || [];
  
  return ALL_PREDICATES
    .filter((p) => predicates.includes(p.value))
    .map((p) => p.value);
}

export function isPredicateCompatible(targetType, joinType, predicate) {
  const compatible = getCompatiblePredicates(targetType, joinType);
  return compatible.includes(predicate);
}

function normalizeType(type) {
  if (!type) return "unknown";
  
  const mapping = {
    Point: "point",
    MultiPoint: "multiPoint",
    LineString: "line",
    MultiLineString: "multiLineString",
    Polygon: "polygon",
    MultiPolygon: "multiPolygon",
  };
  
  return mapping[type] || "unknown";
}