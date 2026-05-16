# Local Cache & Sync System Documentation

## Overview

FinanceTrack now includes a local cache system that stores data in `localStorage` and syncs with Firebase. This provides:

- **Instant loading**: Data loads from cache immediately
- **Offline support**: Users can view cached data even without internet
- **Automatic sync**: Changes sync to Firebase when connection is available
- **Background sync**: No interruption to user experience

## How It Works

### 1. Reading Data (Cached First)

```typescript
import { getExpenses } from '@/lib/firestore';
import { useLocalData } from '@/hooks/useLocalData';

// In a component:
const { data: expenses, loading, syncPending, refresh } = useLocalData({
  collection: 'expenses',
  fetchFn: getExpenses,
});
```

**Flow:**
1. Check localStorage cache → display if available
2. Fetch from Firebase (in background)
3. Update cache with fresh data
4. Update UI

### 2. Writing Data (Always Save to Both)

```typescript
import { addExpense } from '@/lib/firestore';

// Just call the function as normal - caching happens automatically
const docRef = await addExpense({
  userId: currentUser.uid,
  amount: 100,
  category: 'food',
  date: new Date().toISOString(),
});
```

**Flow:**
1. Save to Firebase
2. Update localStorage cache
3. Update UI

### 3. Offline Changes

When user is offline:
- Changes are queued in localStorage
- Queue syncs automatically when back online
- User sees changes immediately (optimistic)

## Collections Supported

- `expenses` - User expenses
- `salaries` - Salary records
- `cards` - Credit cards (as 'cards')
- `cardPayments` - Card payment history
- `goals` - Saving goals
- `friends` - Friend connections

## Cache Location

All cache data is stored in browser `localStorage` under these keys:
- `ft_cache_<collection>_<userId>` - Cached data
- `ft_sync_queue_<userId>` - Pending offline changes

## API Reference

### Cache Functions (`@/lib/cache.ts`)

```typescript
// Get cached data
const data = getCache<T>('collection', userId);

// Set/update cache
setCache<T>('collection', data, userId);

// Clear specific cache
clearCache('collection', userId);

// Clear all user cache
clearUserCache(userId);

// Check if sync is pending
const isPending = isSyncPending(userId);
```

### useLocalData Hook (`@/hooks/useLocalData.ts`)

```typescript
const { 
  data,           // T | null - The data
  loading,        // boolean - Loading state
  error,          // Error | null - Any errors
  syncPending,    // boolean - Pending sync operations
  refresh,        // () => Promise<void> - Force refresh from Firebase
} = useLocalData({
  collection: 'expenses',     // Required
  fetchFn: getExpenses,       // Required function
  enabled: true,              // Optional, default true
});
```

### Sync Functions (`@/lib/cacheSync.ts`)

```typescript
// Process offline queue
await processSyncQueue(userId);

// Setup online/offline listeners
const unsubscribe = setupSyncListener(userId);
unsubscribe(); // cleanup
```

## Usage Examples

### Example 1: Display Expenses (Cached)

```typescript
import { getExpenses } from '@/lib/firestore';
import { useLocalData } from '@/hooks/useLocalData';

export function ExpensesList() {
  const { currentUser } = useAuth();
  const { data: expenses, loading, syncPending } = useLocalData({
    collection: 'expenses',
    fetchFn: getExpenses,
  });

  return (
    <>
      {syncPending && <div>Syncing changes...</div>}
      {loading && <div>Loading...</div>}
      {expenses?.map((expense) => (
        <div key={expense.id}>{expense.name}</div>
      ))}
    </>
  );
}
```

### Example 2: Add Expense (Auto-cached)

```typescript
import { addExpense } from '@/lib/firestore';

async function handleAddExpense(formData) {
  try {
    // Just call as normal - caching is automatic
    await addExpense({
      userId: currentUser.uid,
      ...formData,
    });
    
    // Refresh the list (optional, cache already updated)
    await refresh();
  } catch (error) {
    console.error('Failed to add expense:', error);
  }
}
```

### Example 3: Manual Cache Management

```typescript
import { setCache, getCache, clearCache } from '@/lib/cache';

// Manual cache
const myData = getCache('expenses', userId);
setCache('expenses', newData, userId);

// Force refresh and update cache
const freshData = await getExpenses(userId);
setCache('expenses', freshData, userId);
```

## Performance Considerations

1. **Cache TTL**: No automatic expiry, data stays cached until logout
2. **Storage**: localStorage is limited (~5-10MB), but typical usage is small
3. **Sync frequency**: Syncs on demand and when going online
4. **Background**: All sync operations are non-blocking

## Debugging

```typescript
import { getCacheStats, isSyncPending } from '@/lib/cache';

// Check cache status
console.log(getCacheStats());
console.log('Sync pending:', isSyncPending(userId));

// Check localStorage directly
console.log(localStorage);
```

## Clear Cache (Logout)

Cache is automatically cleared when:
- User logs out
- Auth context unmounts

To manually clear:

```typescript
import { clearUserCache } from '@/lib/cache';

clearUserCache(userId);
```

## Future Improvements

- [ ] IndexedDB for larger datasets
- [ ] Selective sync (sync only changed items)
- [ ] Service Worker for true offline PWA
- [ ] Cache versioning & invalidation
- [ ] Background sync API integration
