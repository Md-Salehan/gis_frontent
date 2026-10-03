// compatibilityMatrix.js
// KEYING: MATRIX[targetType][joinType] (matches original signature)
//   getCompatiblePredicates(targetType, joinType)

export const COMPATIBILITY_MATRIX = {
  point: {
    point: ["nearest", "within-distance", "disjoint"],
    line: ["nearest", "within-distance", "intersects", "disjoint"],
    polygon: ["within", "intersects", "within-distance", "disjoint"],
    multiPoint: ["nearest", "within-distance", "disjoint"],
    multiLineString: [
      "nearest",
      "within-distance",
      "intersects",
      "disjoint",
    ],
    multiPolygon: ["within", "intersects", "within-distance", "disjoint"],
  },
  line: {
    point: ["nearest", "within-distance", "intersects", "disjoint"],
    line: ["intersects", "crosses", "nearest", "within-distance", "disjoint"],
    polygon: [
      "intersects",
      "crosses",
      "within",
      "nearest",
      "within-distance",
      "disjoint",
    ],
    multiPoint: ["nearest", "within-distance", "intersects", "disjoint"],
    multiLineString: [
      "intersects",
      "crosses",
      "nearest",
      "within-distance",
      "disjoint",
    ],
    multiPolygon: [
      "intersects",
      "crosses",
      "within",
      "nearest",
      "within-distance",
      "disjoint",
    ],
  },
  polygon: {
    point: ["contains", "intersects", "within-distance", "disjoint"],
    line: ["contains", "intersects", "nearest", "within-distance", "disjoint"],
    polygon: [
      "within",
      "contains",
      "intersects",
      "overlaps",
      "touches",
      "disjoint",
    ],
    multiPoint: ["contains", "intersects", "within-distance", "disjoint"],
    multiLineString: [
      "contains",
      "intersects",
      "nearest",
      "within-distance",
      "disjoint",
    ],
    multiPolygon: [
      "within",
      "contains",
      "intersects",
      "overlaps",
      "touches",
      "disjoint",
    ],
  },
  multiPoint: {
    point: ["nearest", "within-distance", "disjoint"],
    line: ["nearest", "within-distance", "intersects", "disjoint"],
    polygon: ["within", "intersects", "within-distance", "disjoint"],
    multiPoint: ["nearest", "within-distance", "disjoint"],
    multiLineString: [
      "nearest",
      "within-distance",
      "intersects",
      "disjoint",
    ],
    multiPolygon: ["within", "intersects", "within-distance", "disjoint"],
  },
  multiLineString: {
    point: ["nearest", "within-distance", "intersects", "disjoint"],
    line: ["intersects", "crosses", "nearest", "within-distance", "disjoint"],
    polygon: [
      "intersects",
      "crosses",
      "within",
      "nearest",
      "within-distance",
      "disjoint",
    ],
    multiPoint: ["nearest", "within-distance", "intersects", "disjoint"],
    multiLineString: [
      "intersects",
      "crosses",
      "nearest",
      "within-distance",
      "disjoint",
    ],
    multiPolygon: [
      "intersects",
      "crosses",
      "within",
      "nearest",
      "within-distance",
      "disjoint",
    ],
  },
  multiPolygon: {
    point: ["contains", "intersects", "within-distance", "disjoint"],
    line: ["contains", "intersects", "nearest", "within-distance", "disjoint"],
    polygon: [
      "within",
      "contains",
      "intersects",
      "overlaps",
      "touches",
      "disjoint",
    ],
    multiPoint: ["contains", "intersects", "within-distance", "disjoint"],
    multiLineString: [
      "contains",
      "intersects",
      "nearest",
      "within-distance",
      "disjoint",
    ],
    multiPolygon: [
      "within",
      "contains",
      "intersects",
      "overlaps",
      "touches",
      "disjoint",
    ],
  },
};

export const ALL_PREDICATES = [
  { value: "within", label: "Within" },
  { value: "contains", label: "Contains" },
  { value: "intersects", label: "Intersects" },
  { value: "touches", label: "Touches" },
  { value: "overlaps", label: "Overlaps" },
  { value: "crosses", label: "Crosses" },
  { value: "disjoint", label: "Disjoint" },
  { value: "within-distance", label: "Within Distance" },
  { value: "nearest", label: "Nearest" },
];

// Signature unchanged: (targetType, joinType)
export function getCompatiblePredicates(targetType, joinType) {
  const normalizedTarget = normalizeType(targetType);
  const normalizedJoin = normalizeType(joinType);
  const matrix = COMPATIBILITY_MATRIX[normalizedTarget] || {};
  const predicates = matrix[normalizedJoin] || [];
  return ALL_PREDICATES.filter((p) => predicates.includes(p.value)).map(
    (p) => p.value,
  );
}

export function isPredicateCompatible(targetType, joinType, predicate) {
  return getCompatiblePredicates(targetType, joinType).includes(predicate);
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