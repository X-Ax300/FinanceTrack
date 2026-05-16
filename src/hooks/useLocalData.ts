import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getCache, setCache, isSyncPending } from '../lib/cache';

interface UseLocalDataOptions<T> {
  collection: string;
  fetchFn: (userId: string, options?: { forceRefresh?: boolean }) => Promise<T>;
  enabled?: boolean;
}

export function useLocalData<T>({
  collection,
  fetchFn,
  enabled = true,
}: UseLocalDataOptions<T>) {
  const { currentUser, loading: authLoading } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [syncPending, setSyncPending] = useState(false);

  useEffect(() => {
    if (!enabled || !currentUser || authLoading) return;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        
        // Try cache first
        const cached = getCache<T>(collection, currentUser?.uid);
        if (cached) {
          setData(cached);
          setLoading(false);
        }

        // Fetch from Firebase if we're online
        if (navigator.onLine && currentUser?.uid) {
          const fresh = await fetchFn(currentUser.uid, { forceRefresh: true });
          setData(fresh);
          setCache(collection, fresh, currentUser.uid);
        }

        if (currentUser?.uid) setSyncPending(isSyncPending(currentUser.uid));
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [currentUser?.uid, authLoading, collection, fetchFn, enabled]);

  const refresh = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const fresh = await fetchFn(currentUser.uid, { forceRefresh: true });
      setData(fresh);
      setCache(collection, fresh, currentUser.uid);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    loading,
    error,
    syncPending,
    refresh,
  };
}
