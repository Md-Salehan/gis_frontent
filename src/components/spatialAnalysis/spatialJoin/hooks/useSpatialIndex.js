import * as turf from "@turf/turf";

// Simple spatial index using KDBush-like approach
// For production, consider using a proper R-tree library

export async function buildSpatialIndex(features, { signal } = {}) {
  if (!features || features.length === 0) {
    return { index: null, features: [] };
  }

  // Extract bboxes for all features
  const items = features.map((feature, index) => {
    const bbox = turf.bbox(feature);
    return {
      id: index,
      feature,
      bbox: {
        minX: bbox[0],
        minY: bbox[1],
        maxX: bbox[2],
        maxY: bbox[3],
      },
    };
  });

  // Build flat array for spatial index
  // Using a simple flat array with min/max bounds
  // For production, use a proper R-tree implementation

  const data = {
    items,
    bbox: {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    },
  };

  // Calculate overall bbox
  for (const item of items) {
    data.bbox.minX = Math.min(data.bbox.minX, item.bbox.minX);
    data.bbox.minY = Math.min(data.bbox.minY, item.bbox.minY);
    data.bbox.maxX = Math.max(data.bbox.maxX, item.bbox.maxX);
    data.bbox.maxY = Math.max(data.bbox.maxY, item.bbox.maxY);
  }

  // Simple search function (linear scan with bbox pre-filter)
  // For production, use a proper R-tree
  const search = (bbox) => {
    const results = [];
    const [searchMinX, searchMinY, searchMaxX, searchMaxY] = bbox;

    for (const item of items) {
      // BBox overlap check - using the correct variable names
      if (item.bbox.maxX < searchMinX || item.bbox.minX > searchMaxX) continue;
      if (item.bbox.maxY < searchMinY || item.bbox.minY > searchMaxY) continue;
      results.push(item.id);
    }

    return results;
  };

  return {
    index: {
      search,
      bbox: data.bbox,
      size: items.length,
    },
    features,
  };
}
