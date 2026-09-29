// src/features/.../hooks/useChunkProcessor.js
// (place in a shared location, e.g. src/hooks/useChunkProcessor.js
//  or keep in each feature folder and re-export)

import { useCallback } from "react";

/**
 * Generic chunk-processing hook.
 *
 * Responsibility: iterate an array in chunks, yield to the UI,
 * support cancellation, and report progress. It does NOT know
 * anything about joins, features, or aggregation.
 *
 * @param {Object}   options
 * @param {number}   [options.chunkSize=1000]      Items per chunk
 * @param {number}   [options.progressInterval=250] Throttle ms for onProgress
 * @returns {Function} processChunks(items, handlers)
 *
 * processChunks(items, {
 *   signal,               // AbortSignal
 *   onProgress,           // (processed, total) => void
 *   onChunkComplete,      // (chunkItems, chunkIndex, chunkResult) => void
 *   processor,            // (item, globalIndex) => any | Promise<any>
 *   chunkAggregator,      // (chunkResults, chunkItems, chunkIndex) => void  (optional)
 * })
 */
export function useChunkProcessor(options = {}) {
  const {
    chunkSize: defaultChunkSize = 1000,
    progressInterval = 250,
  } = options;

  const processChunks = useCallback(
    async (items, handlers = {}) => {
      const {
        chunkSize = defaultChunkSize,
        signal = null,
        onProgress = null,
        onChunkComplete = null,
        processor,
        chunkAggregator = null,
      } = handlers;

      if (!items || items.length === 0) {
        return [];
      }

      if (typeof processor !== "function") {
        throw new Error("processChunks: `processor` is required");
      }

      const total = items.length;
      const results = [];
      let processed = 0;
      let lastProgressUpdate = 0;

      for (let i = 0; i < total; i += chunkSize) {
        if (signal?.aborted) {
          throw new Error("Operation cancelled");
        }

        const end = Math.min(i + chunkSize, total);
        const chunk = items.slice(i, end);

        // Process each item in the chunk
        const chunkResults = [];
        for (let j = 0; j < chunk.length; j++) {
          if (signal?.aborted) {
            throw new Error("Operation cancelled");
          }

          const result = await processor(chunk[j], i + j);
          if (result !== undefined && result !== null) {
            chunkResults.push(result);
          }
          processed++;
        }

        // Allow feature-specific aggregation over the whole chunk
        if (chunkAggregator) {
          chunkAggregator(chunkResults, chunk, Math.floor(i / chunkSize));
        } else {
          results.push(...chunkResults);
        }

        // Throttled progress update
        const now = Date.now();
        if (
          onProgress &&
          (now - lastProgressUpdate > progressInterval || processed === total)
        ) {
          onProgress(processed, total);
          lastProgressUpdate = now;
        }

        if (onChunkComplete) {
          onChunkComplete(chunk, Math.floor(i / chunkSize), chunkResults);
        }

        // Yield to UI
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      return results;
    },
    [defaultChunkSize, progressInterval]
  );

  return { processChunks };
}