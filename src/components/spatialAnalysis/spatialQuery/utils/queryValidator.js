//spatialQuery/utils/queryValidator.js
import { getCompatiblePredicates } from "../../common/utils/compatibilityMatrix";

/**
 * Validate a normalized query before execution.
 *
 * @param {Object} normalized - { source, target, operation, distance, distanceUnit }
 * @param {Object} ctx - { sourceLayerMeta, targetLayerMeta }
 * @returns {{ ok: boolean, errors: string[], compatibleOperations: string[] }}
 */
export function validateQuery(normalized, ctx) {
  const errors = [];
  const { source, target, operation, distance } = normalized || {};
  const { sourceLayerMeta, targetLayerMeta } = ctx || {};

  if (!source?.layerId) errors.push("Source layer is required.");
  if (!source?.items?.length) errors.push("Select at least one source feature.");
  if (!sourceLayerMeta?.geometryTypes?.length)
    errors.push("Source layer has no geometry information.");

  if (!target?.layerId) errors.push("Target layer is required.");
  if (!target?.items?.length) errors.push("Select at least one target feature.");
  if (!targetLayerMeta?.geometryTypes?.length)
    errors.push("Target layer has no geometry information.");

  // Same layer with identical feature sets is likely a mistake.
  if (
    source?.layerId &&
    target?.layerId &&
    source.layerId === target.layerId &&
    source.items?.length &&
    target.items?.length
  ) {
    const srcKeys = new Set(
      source.items.map((i) => `${i.layerId}::${i.featureId}`),
    );
    const allSame = target.items.every((i) =>
      srcKeys.has(`${i.layerId}::${i.featureId}`),
    );
    if (allSame) {
      errors.push(
        "Source and target feature sets are identical. The query will be trivial.",
      );
    }
  }

  // Operation compatibility (intersection across all geometry-type pairs).
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
      `Operation "${operation}" is not compatible with the selected geometry types.`,
    );
  }

  if (
    (operation === "within-distance" || operation === "nearest") &&
    (distance === null || distance === undefined || distance <= 0)
  ) {
    errors.push("A positive distance is required for this operation.");
  }

  return { ok: errors.length === 0, errors, compatibleOperations };
}