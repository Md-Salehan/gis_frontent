// spatialQuery/utils/queryValidator.js
import { getCompatiblePredicates } from "../../common/utils/compatibilityMatrix";

export function validateQuery(normalized, ctx) {
  const errors = [];
  const { source, target, operation, distance } = normalized || {};
  const { sourceLayerMeta, targetLayerMeta } = ctx || {};

  if (!source?.layerId) errors.push("Please select a Source layer.");
  if (!source?.items?.length)
    errors.push("Please select at least one Source feature.");
  if (!sourceLayerMeta?.geometryTypes?.length)
    errors.push("Source layer has no geometry information.");

  if (!target?.layerId) errors.push("Please select a Target layer.");
  if (!target?.items?.length)
    errors.push("Please select at least one Target feature.");
  if (!targetLayerMeta?.geometryTypes?.length)
    errors.push("Target layer has no geometry information.");

  // Cross-layer leakage checks
  if (
    source?.layerId &&
    source.items?.some((it) => it.layerId !== source.layerId)
  ) {
    errors.push(
      "One or more selected Source features do not belong to the selected Source layer.",
    );
  }
  if (
    target?.layerId &&
    target.items?.some((it) => it.layerId !== target.layerId)
  ) {
    errors.push(
      "One or more selected Target features do not belong to the selected Target layer.",
    );
  }

  // Multi-layer rejection (defensive)
  if (source?.layerIds?.length > 1) {
    errors.push("A Spatial Query may contain exactly one Source layer.");
  }
  if (target?.layerIds?.length > 1) {
    errors.push("A Spatial Query may contain exactly one Target layer.");
  }

  // Operation compatibility
  let compatibleOperations = [];
  if (
    sourceLayerMeta?.geometryTypes?.length &&
    targetLayerMeta?.geometryTypes?.length
  ) {
    const sets = [];
    for (const s of sourceLayerMeta.geometryTypes) {
      for (const t of targetLayerMeta.geometryTypes) {
        sets.push(new Set(getCompatiblePredicates(s, t)));
      }
    }
    if (sets.length) {
      compatibleOperations = [...sets[0]];
      for (let i = 1; i < sets.length; i++) {
        compatibleOperations = compatibleOperations.filter((p) =>
          sets[i].has(p),
        );
      }
    }
  }

  if (!operation) {
    errors.push("Select a spatial operation.");
  } else if (!compatibleOperations.includes(operation)) {
    errors.push(
      "This spatial operation is not supported for the selected geometry types.",
    );
  }

  if (
    (operation === "within-distance" || operation === "nearest") &&
    (distance === null || distance === undefined || distance <= 0)
  ) {
    errors.push("Please enter a valid distance greater than or equal to 0.");
  }

  return { ok: errors.length === 0, errors, compatibleOperations };
}