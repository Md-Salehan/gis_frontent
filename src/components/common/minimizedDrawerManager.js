const registry = [];
const listeners = new Set();

function notify() {
  const snapshot = registry.slice();
  listeners.forEach((cb) => {
    try {
      cb(snapshot);
    } catch (e) {
      // ignore listener errors
    }
  });
}

/**
 * Add an id to the registry and return its index.
 * id should be unique (use timestamp or uuid).
 */
export function registerMinimized(id) {
  if (!id) return -1;
  if (!registry.includes(id)) {
    registry.push(id);
    notify();
  }
  return registry.indexOf(id);
}

/**
 * Remove id from registry.
 */
export function unregisterMinimized(id) {
  const idx = registry.indexOf(id);
  if (idx > -1) {
    registry.splice(idx, 1);
    notify();
  }
}

/**
 * Get current index of id in registry.
 */
export function getMinimizedIndex(id) {
  return registry.indexOf(id);
}

/**
 * Get current registry length
 */
export function getMinimizedCount() {
  return registry.length;
}

/**
 * Subscribe to registry changes. Callback receives current registry array.
 * Returns an unsubscribe function.
 */
export function subscribeMinimizedRegistry(cb) {
  if (typeof cb !== "function") return () => {};
  listeners.add(cb);
  // invoke immediately with current state
  try {
    cb(registry.slice());
  } catch (e) {
    /* ignore */
  }
  return () => {
    listeners.delete(cb);
  };
}
