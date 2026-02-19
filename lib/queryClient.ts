import { QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

const localStoragePersister = {
  persistClient: async (client: any) => {
    try {
      localStorage.setItem('REACT_QUERY_OFFLINE_CACHE', JSON.stringify(client));
    } catch (error) {
      console.error('Error persisting cache', error);
    }
  },
  restoreClient: async () => {
    try {
      const cache = localStorage.getItem('REACT_QUERY_OFFLINE_CACHE');
      return cache ? JSON.parse(cache) : undefined;
    } catch (error) {
      console.error('Error restoring cache', error);
      return undefined;
    }
  },
  removeClient: async () => {
    localStorage.removeItem('REACT_QUERY_OFFLINE_CACHE');
  },
};

persistQueryClient({
  queryClient,
  persister: localStoragePersister,
});
