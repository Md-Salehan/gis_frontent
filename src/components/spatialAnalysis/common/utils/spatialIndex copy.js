// hooks/useSpatialIndex.js
import * as turf from "@turf/turf";
import Flatbush from "flatbush";

export async function buildSpatialIndex(features, { signal } = {}) {
  if (!features || features.length === 0) {
    return { index: null, features: [] };
  }

  // Extract bboxes for all features
  const items = features.map((feature, index) => {
    let bbox;
    try {
      bbox = turf.bbox(feature);
    } catch (error) {
      // If bbox calculation fails, use a default bbox
      console.warn(`Failed to calculate bbox for feature ${index}:`, error);
      bbox = [0, 0, 0, 0];
    }
    
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

  // Calculate overall bbox
  let globalMinX = Infinity;
  let globalMinY = Infinity;
  let globalMaxX = -Infinity;
  let globalMaxY = -Infinity;

  for (const item of items) {
    globalMinX = Math.min(globalMinX, item.bbox.minX);
    globalMinY = Math.min(globalMinY, item.bbox.minY);
    globalMaxX = Math.max(globalMaxX, item.bbox.maxX);
    globalMaxY = Math.max(globalMaxY, item.bbox.maxY);
  }

  // Check if features exist and have valid bbox
  if (globalMinX === Infinity || globalMaxX === -Infinity) {
    return { index: null, features: [] };
  }

  // Create Flatbush index
  // Flatbush expects [minX, minY, maxX, maxY] for each item
  const index = new Flatbush(features.length);
  
  // Add each feature's bbox to the index
  for (const item of items) {
    const { minX, minY, maxX, maxY } = item.bbox;
    index.add(minX, minY, maxX, maxY);
  }

  // Build the index
  index.finish();

  // Search function using Flatbush
  const search = (bbox) => {
    try {
      const [minX, minY, maxX, maxY] = bbox;
      // Use flatbush's search which returns indices
      const results = index.search(minX, minY, maxX, maxY);
      return results;
    } catch (error) {
      console.warn("Search error:", error);
      return [];
    }
  };

  // Neighborhood search (for distance-based queries)
  const searchNeighbors = (point, radius) => {
    try {
      const [x, y] = point;
      const minX = x - radius;
      const minY = y - radius;
      const maxX = x + radius;
      const maxY = y + radius;
      return index.search(minX, minY, maxX, maxY);
    } catch (error) {
      console.warn("Neighbor search error:", error);
      return [];
    }
  };

  return {
    index: {
      search,
      searchNeighbors,
      bbox: {
        minX: globalMinX,
        minY: globalMinY,
        maxX: globalMaxX,
        maxY: globalMaxY,
      },
      size: items.length,
    },
    features,
    items, // Keep items for reference
  };
}