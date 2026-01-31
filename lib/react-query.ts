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
            // Aggressive caching for offline-first
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 60 * 24, // 24 hours (formerly cacheTime)

            // Network-aware retry logic
            retry: (failureCount, error) => {
                // Don't retry if offline
                if (networkManager.isOffline()) {
                    return false;
                }

                // Retry up to 3 times for network errors
                if (failureCount < 3) {
                    return true;
                }

                return false;
            },

            // Retry delay with exponential backoff
            retryDelay: (attemptIndex) => {
                return Math.min(1000 * 2 ** attemptIndex, 30000);
            },

            // Refetch settings for optimal offline-first behavior
            refetchOnWindowFocus: true, // Refetch when user returns to tab
            refetchOnReconnect: true,   // Refetch when network reconnects
            refetchOnMount: true,       // Refetch on component mount

            // Network mode
            networkMode: 'offlineFirst', // Use cached data when offline
        },
        mutations: {
            // Network-aware mutations
            retry: (failureCount, error) => {
                if (networkManager.isOffline()) {
                    return false; // Don't retry mutations when offline
                }
                return failureCount < 2; // Retry mutations twice
            },

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

/**
 * Clear all React Query caches
 */
export async function clearQueryCache(): Promise<void> {
    queryClient.clear();
    await idbPersister.removeClient();
}

/**
 * Invalidate all queries
 */
export async function invalidateAllQueries(): Promise<void> {
    await queryClient.invalidateQueries();
}

/**
 * Prefetch data for offline use
 */
export async function prefetchData<T>(
    queryKey: any[],
    queryFn: () => Promise<T>
): Promise<void> {
    if (networkManager.isOnline()) {
        await queryClient.prefetchQuery({
            queryKey,
            queryFn,
            staleTime: 1000 * 60 * 60, // 1 hour
        });
    }
}

