import { QueryClient } from '@tanstack/react-query';
import { get, set, del } from 'idb-keyval';
import { Persister } from '@tanstack/react-query-persist-client';
import { networkManager } from './networkManager';

// ============================================================================
// Query Client Configuration
// ============================================================================

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Serve persisted/cached data immediately and revalidate in the background.
            staleTime: 1000 * 60 * 15,
            gcTime: 1000 * 60 * 60 * 24,

            // Keep retries short so a failed request cannot hold a page in a
            // loading state for many seconds. Individual critical queries can
            // opt into a larger retry budget when appropriate.
            retry: (failureCount) => {
                if (networkManager.isOffline()) return false;
                return failureCount < 2;
            },
            retryDelay: (attemptIndex) => Math.min(750 * 2 ** attemptIndex, 10000),

            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            // Cached data should remain usable when a dashboard/component remounts,
            // which `true` already gives us: React Query only refetches on mount
            // when the entry is STALE, so anything inside the 15-minute staleTime
            // above still mounts straight from cache.
            //
            // This was `false`, which also suppressed the revalidation half. The
            // comment claimed explicit invalidation still covered it, but
            // invalidateQueries only refetches queries that are currently MOUNTED;
            // for anything else it just marks the entry stale. So the ordinary
            // "create a record, navigate to the list" flow — where the list is not
            // mounted at the moment of the mutation — came back to a cached roster
            // that could not show the row the user had just created, and stayed
            // that way for the full 15 minutes.
            refetchOnMount: true,

            networkMode: 'offlineFirst',
        },
        mutations: {
            // Never automatically repeat a mutation: retrying POST/payment/write
            // operations can duplicate side effects unless the individual operation
            // is explicitly designed to be idempotent.
            retry: false,
            networkMode: 'offlineFirst',
        },
    },
});

// ============================================================================
// IndexedDB Persister
// ============================================================================

export const idbPersister: Persister = {
    persistClient: async (client) => {
        try {
            await set('reactQueryClient', client);
        } catch (error) {
            console.error('Error persisting React Query cache:', error);
        }
    },
    restoreClient: async () => {
        try {
            const cached = await get('reactQueryClient');
            return cached;
        } catch (error) {
            console.error('Error restoring React Query cache:', error);
            return undefined;
        }
    },
    removeClient: async () => {
        try {
            await del('reactQueryClient');
        } catch (error) {
            console.error('Error removing React Query cache:', error);
        }
    },
};

// ============================================================================
// Cache Management
// ============================================================================

export async function clearQueryCache(): Promise<void> {
    queryClient.clear();
    await idbPersister.removeClient();
}

export async function invalidateAllQueries(): Promise<void> {
    await queryClient.invalidateQueries();
}

/** Prefetch only while online; cached queries are reused by React Query. */
export async function prefetchData<T>(
    queryKey: readonly unknown[],
    queryFn: () => Promise<T>
): Promise<void> {
    if (!networkManager.isOnline()) return;

    await queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime: 1000 * 60 * 60,
    });
}
