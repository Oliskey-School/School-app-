import { QueryClient } from '@tanstack/react-query';
import { get, set, del } from 'idb-keyval';
import { Persister } from '@tanstack/react-query-persist-client';
import { networkManager } from './networkManager';

// Fast, offline-first defaults: serve cached data immediately and avoid
// unnecessary network work. Individual critical queries can override these.
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 15,
            gcTime: 1000 * 60 * 60 * 24,
            retry: (failureCount) => !networkManager.isOffline() && failureCount < 2,
            retryDelay: (attemptIndex) => Math.min(750 * 2 ** attemptIndex, 10000),
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            // Avoid refetching every time a dashboard component remounts.
            refetchOnMount: false,
            networkMode: 'offlineFirst',
        },
        mutations: {
            // Mutations are deliberately conservative: never retry while offline.
            // Individual idempotent mutations may opt into retries locally.
            retry: (failureCount) => !networkManager.isOffline() && failureCount < 1,
            retryDelay: 1000,
            networkMode: 'offlineFirst',
        },
    },
});

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
            return await get('reactQueryClient');
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

export async function clearQueryCache(): Promise<void> {
    queryClient.clear();
    await idbPersister.removeClient();
}

export async function invalidateAllQueries(): Promise<void> {
    await queryClient.invalidateQueries();
}

export async function prefetchData<T>(queryKey: readonly unknown[], queryFn: () => Promise<T>): Promise<void> {
    if (!networkManager.isOnline()) return;
    await queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime: 1000 * 60 * 60,
    });
}
