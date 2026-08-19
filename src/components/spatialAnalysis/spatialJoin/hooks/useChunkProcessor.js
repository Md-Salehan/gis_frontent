export async function processInChunks(
  features,
  options,
  processor
) {
  const {
    chunkSize = 500,
    signal = null,
    onProgress = null,
    onChunkComplete = null,
  } = options;

  if (!features || features.length === 0) {
    return [];
  }

  const results = [];
  let processed = 0;
  let totalMatches = 0;

  for (let i = 0; i < features.length; i += chunkSize) {
    if (signal && signal.aborted) {
      throw new Error("Operation cancelled");
    }

    const chunk = features.slice(i, Math.min(i + chunkSize, features.length));
    let chunkMatchCount = 0;

    // Process chunk synchronously
    for (let j = 0; j < chunk.length; j++) {
      if (signal && signal.aborted) {
        throw new Error("Operation cancelled");
      }

      const feature = chunk[j];
      const globalIndex = i + j;
      
      try {
        const matchCount = await processor(feature, globalIndex);
        if (matchCount > 0) {
          chunkMatchCount += matchCount;
          totalMatches += matchCount;
        }
      } catch (err) {
        console.warn(`Error processing feature ${globalIndex}:`, err);
        // No matches counted for this feature
      }

      processed++;

      // Progress update
      if (onProgress && processed % 50 === 0) {
        onProgress(processed, features.length, totalMatches);
      }
    }

    if (onChunkComplete) {
      onChunkComplete(chunk, Math.floor(i / chunkSize), chunkMatchCount);
    }

    // Yield to UI between chunks
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  // Final progress update
  if (onProgress) {
    onProgress(features.length, features.length, totalMatches);
  }

  return results;
}