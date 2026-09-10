import { CACHE_MAX_ENTRIES, CACHE_MAX_MEMORY_MB } from '../constants';

class JoinCacheService {
  constructor() {
    this.cache = new Map();
    this.accessOrder = [];
    this.totalMemoryBytes = 0;
    this.maxEntries = CACHE_MAX_ENTRIES;
    this.maxMemoryBytes = CACHE_MAX_MEMORY_MB * 1024 * 1024;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Update access order
    this.updateAccessOrder(key);
    entry.hitCount = (entry.hitCount || 0) + 1;
    entry.lastUsedAt = Date.now();

    return entry.data;
  }

  set(key, data, metadata = {}) {
    // Check if we need to evict
    while (
      this.cache.size >= this.maxEntries ||
      this.totalMemoryBytes > this.maxMemoryBytes
    ) {
      this.evictOldest();
    }

    const entry = {
      data,
      metadata: {
        ...metadata,
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
        hitCount: 0,
        estimatedMemoryBytes: this.estimateMemoryUsage(data),
      },
    };

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
    this.totalMemoryBytes += entry.metadata.estimatedMemoryBytes || 0;
  }

  invalidate(layerId) {
    const keysToRemove = [];
    for (const [key, entry] of this.cache) {
      if (entry.metadata?.layerId === layerId) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      this.delete(key);
    }
  }

  invalidateAll() {
    this.cache.clear();
    this.accessOrder = [];
    this.totalMemoryBytes = 0;
  }

  delete(key) {
    const entry = this.cache.get(key);
    if (entry) {
      this.totalMemoryBytes -= entry.metadata?.estimatedMemoryBytes || 0;
      this.cache.delete(key);
    }
  }

  evictOldest() {
    if (this.accessOrder.length === 0) return;

    const oldest = this.accessOrder.shift();
    this.delete(oldest);
  }

  updateAccessOrder(key) {
    this.accessOrder = this.accessOrder.filter((k) => k !== key);
    this.accessOrder.push(key);
  }

  estimateMemoryUsage(data) {
    try {
      const json = JSON.stringify(data);
      return json.length * 2; // Approximate UTF-16 bytes
    } catch {
      return 1024 * 1024; // Default 1MB if can't estimate
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      memoryBytes: this.totalMemoryBytes,
      maxMemoryBytes: this.maxMemoryBytes,
      accessOrder: this.accessOrder.slice(0, 10),
    };
  }
}

// Singleton instance
const cacheService = new JoinCacheService();

export function getJoinCache(key) {
  return cacheService.get(key);
}

export function setJoinCache(key, data, metadata = {}) {
  cacheService.set(key, data, metadata);
}

export function invalidateJoinCache(layerId) {
  cacheService.invalidate(layerId);
}

export function invalidateAllJoinCache() {
  cacheService.invalidateAll();
}

export function getJoinCacheStats() {
  return cacheService.getStats();
}