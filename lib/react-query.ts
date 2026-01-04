import { QueryClient } from '@tanstack/react-query';
import { get, set, del } from 'idb-keyval';
import { Persister } from '@tanstack/react-query-persist-client';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 60 * 24, // 24 hours
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

export const idbPersister: Persister = {
    persistClient: async (client) => {
        try {
            await set('reactQueryClient', client);
        } catch (error) {
            console.error('Error persisting cache:', error);
        }
    },
    restoreClient: async () => {
        try {
            return await get('reactQueryClient');
        } catch (error) {
            console.error('Error restoring cache:', error);
            return undefined;
        }
    },
    removeClient: async () => {
        await del('reactQueryClient');
    },
};
