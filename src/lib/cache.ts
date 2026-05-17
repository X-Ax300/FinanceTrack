const CACHE_PREFIX = 'ft_cache_';
const SYNC_QUEUE = 'ft_sync_queue_';
const memoryCache = new Map<string, CacheEntry<unknown>>();

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface SyncQueueItem {
  id: string;
  type: 'add' | 'update' | 'delete';
  collection: string;
  data: Record<string, unknown>;
  timestamp: number;
}

// Get cache key
function getCacheKey(collection: string, userId?: string): string {
  return `${CACHE_PREFIX}${collection}${userId ? `_${userId}` : ''}`;
}

// Set cache data
export function setCache<T>(collection: string, data: T, userId?: string): void {
  try {
    const key = getCacheKey(collection, userId);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    memoryCache.set(key, entry);
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.warn('Cache write failed:', error);
  }
}

// Get cache data
export function getCache<T>(collection: string, userId?: string): T | null {
  return getCacheEntry<T>(collection, userId)?.data ?? null;
}

export function getCacheEntry<T>(collection: string, userId?: string): CacheEntry<T> | null {
  try {
    const key = getCacheKey(collection, userId);
    const memoryEntry = memoryCache.get(key) as CacheEntry<T> | undefined;
    if (memoryEntry) return memoryEntry;

    const item = localStorage.getItem(key);
    if (!item) return null;
    
    const entry: CacheEntry<T> = JSON.parse(item);
    memoryCache.set(key, entry as CacheEntry<unknown>);
    return entry;
  } catch (error) {
    console.warn('Cache read failed:', error);
    return null;
  }
}

// Clear specific cache
export function clearCache(collection: string, userId?: string): void {
  try {
    const key = getCacheKey(collection, userId);
    memoryCache.delete(key);
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Cache clear failed:', error);
  }
}

// Clear all cache for user
export function clearUserCache(userId: string): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX) && key.includes(`_${userId}`)) {
        memoryCache.delete(key);
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('Cache clear user failed:', error);
  }
}

// Remove an item from all cached arrays in a collection.
// Useful for delete operations that only receive a document id.
export function removeCachedItem(collection: string, itemId: string): void {
  try {
    const prefix = `${CACHE_PREFIX}${collection}_`;
    const keys = Object.keys(localStorage).filter((key) => key.startsWith(prefix));

    keys.forEach((key) => {
      const entry =
        (memoryCache.get(key) as CacheEntry<Array<{ id?: string }>> | undefined) ||
        (JSON.parse(localStorage.getItem(key) || 'null') as CacheEntry<Array<{ id?: string }>> | null);

      if (!entry || !Array.isArray(entry.data)) return;

      const next = entry.data.filter((item) => item.id !== itemId);
      if (next.length === entry.data.length) return;

      const updated: CacheEntry<Array<{ id?: string }>> = {
        data: next,
        timestamp: Date.now(),
      };
      memoryCache.set(key, updated as CacheEntry<unknown>);
      localStorage.setItem(key, JSON.stringify(updated));
    });
  } catch (error) {
    console.warn('Remove cached item failed:', error);
  }
}

export function updateCachedItem<T extends { id?: string }>(
  collection: string,
  itemId: string,
  changes: Partial<T>
): void {
  try {
    const prefix = `${CACHE_PREFIX}${collection}_`;
    const keys = Object.keys(localStorage).filter((key) => key.startsWith(prefix));

    keys.forEach((key) => {
      const entry =
        (memoryCache.get(key) as CacheEntry<T[]> | undefined) ||
        (JSON.parse(localStorage.getItem(key) || 'null') as CacheEntry<T[]> | null);

      if (!entry || !Array.isArray(entry.data)) return;

      let changed = false;
      const next = entry.data.map((item) => {
        if (item.id !== itemId) return item;
        changed = true;
        return { ...item, ...changes };
      });

      if (!changed) return;

      const updated: CacheEntry<T[]> = {
        data: next,
        timestamp: Date.now(),
      };
      memoryCache.set(key, updated as CacheEntry<unknown>);
      localStorage.setItem(key, JSON.stringify(updated));
    });
  } catch (error) {
    console.warn('Update cached item failed:', error);
  }
}

// Add to sync queue
export function queueSync(
  type: 'add' | 'update' | 'delete',
  collection: string,
  data: any,
  userId: string
): void {
  try {
    const key = `${SYNC_QUEUE}${userId}`;
    const queue = localStorage.getItem(key);
    const items: SyncQueueItem[] = queue ? JSON.parse(queue) : [];
    
    items.push({
      id: `${Date.now()}_${Math.random()}`,
      type,
      collection,
      data,
      timestamp: Date.now(),
    });
    
    localStorage.setItem(key, JSON.stringify(items));
  } catch (error) {
    console.warn('Queue sync failed:', error);
  }
}

// Get sync queue
export function getSyncQueue(userId: string): SyncQueueItem[] {
  try {
    const key = `${SYNC_QUEUE}${userId}`;
    const queue = localStorage.getItem(key);
    return queue ? JSON.parse(queue) : [];
  } catch (error) {
    console.warn('Get sync queue failed:', error);
    return [];
  }
}

// Clear sync queue
export function clearSyncQueue(userId: string): void {
  try {
    const key = `${SYNC_QUEUE}${userId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Clear sync queue failed:', error);
  }
}

// Remove item from sync queue
export function removeSyncQueueItem(userId: string, itemId: string): void {
  try {
    const key = `${SYNC_QUEUE}${userId}`;
    const queue = localStorage.getItem(key);
    if (!queue) return;
    
    const items: SyncQueueItem[] = JSON.parse(queue);
    const filtered = items.filter((item) => item.id !== itemId);
    
    if (filtered.length === 0) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(filtered));
    }
  } catch (error) {
    console.warn('Remove sync queue item failed:', error);
  }
}

// Sync status
export function isSyncPending(userId: string): boolean {
  return getSyncQueue(userId).length > 0;
}

// Export cache statistics for debugging
export function getCacheStats(): { [key: string]: number } {
  try {
    const stats: { [key: string]: number } = {};
    const keys = Object.keys(localStorage);
    
    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX) || key.startsWith(SYNC_QUEUE)) {
        stats[key] = localStorage.getItem(key)?.length || 0;
      }
    });
    
    return stats;
  } catch (error) {
    console.warn('Get cache stats failed:', error);
    return {};
  }
}
