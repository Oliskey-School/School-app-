import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';

/**
 * A wrapper around useQuery with default options optimized for Supabase and offline caching.
 */
export function useSupabaseQuery<TData = unknown, TError = Error>(
    queryKey: any[],
    queryFn: () => Promise<TData>,
    options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
): UseQueryResult<TData, TError> {
    return useQuery({
        queryKey,
        queryFn,
        staleTime: 1000 * 60 * 5, // Data is considered fresh for 5 minutes
        gcTime: 1000 * 60 * 60 * 24, // Keep unused data in cache for 24 hours
        networkMode: 'offlineFirst', // Attempt to read from cache/execute fn even if offline signal is active
        retry: 1,
        refetchOnWindowFocus: false,
        ...options,
    });
}
