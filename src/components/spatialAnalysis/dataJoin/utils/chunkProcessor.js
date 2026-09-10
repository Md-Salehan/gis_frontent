
export async function processInChunks(
  items,
  processor,
  options = {}
) {
  const {
    chunkSize = 1000,
    signal = null,
    onProgress = null,
    onChunkComplete = null,
  } = options;

  if (!items || items.length === 0) {
    return [];
  }

  const results = [];
  const total = items.length;
  let processed = 0;
  let lastProgressUpdate = 0;

  for (let i = 0; i < total; i += chunkSize) {
    // Check cancellation
    if (signal && signal.aborted) {
      throw new Error('Operation cancelled');
    }

    const end = Math.min(i + chunkSize, total);
    const chunk = items.slice(i, end);

    // Process chunk
    const chunkResults = [];
    for (let j = 0; j < chunk.length; j++) {
      if (signal && signal.aborted) {
        throw new Error('Operation cancelled');
      }

      const result = await processor(chunk[j], i + j);
      if (result !== undefined && result !== null) {
        chunkResults.push(result);
      }
      processed++;
    }

    results.push(...chunkResults);

    // Update progress (throttled)
    const now = Date.now();
    if (onProgress && (now - lastProgressUpdate > 250 || processed === total)) {
      onProgress(processed, total);
      lastProgressUpdate = now;
    }

    if (onChunkComplete) {
      onChunkComplete(chunk, Math.floor(i / chunkSize), chunkResults.length);
    }

    // Yield to UI
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return results;
}