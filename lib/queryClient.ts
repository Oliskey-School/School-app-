import { QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import api from './api';

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

// Several teacher screens each called api.getMyTeacherProfile() directly from
// their own effect — a heavy nested-include query that fired once per screen
// per navigation instead of once per session. queryClient.fetchQuery shares
// one in-flight request across simultaneous callers and serves cached data
// within staleTime, without requiring every call site to become a useQuery
// hook (several of them need the result inline in an async function, not as
// render-time hook state).
export function getMyTeacherProfileCached() {
  return queryClient.fetchQuery({
    queryKey: ['teacherProfile'],
    queryFn: () => api.getMyTeacherProfile(),
    staleTime: 1000 * 60, // 60s
  });
}

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
