/**
 * useOfflineQuery - React Hook for Offline-First Data Fetching
 * 
 * Wraps React Query with offline support, optimistic updates,
 * and automatic sync coordination.
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { dataService, DataServiceOptions, MutationOptions } from '../lib/dataService';
import { TableName } from '../lib/offlineDatabase';
import { syncEngine } from '../lib/syncEngine';
import { networkManager } from '../lib/networkManager';
import { useState, useEffect } from 'react';

// ============================================================================
// Query Hook
// ============================================================================

export interface UseOfflineQueryOptions<T> extends DataServiceOptions {
    queryKey?: any[];
    enabled?: boolean;
    refetchOnMount?: boolean;
    refetchOnWindowFocus?: boolean;
    refetchOnReconnect?: boolean;
    staleTime?: number;
    cacheTime?: number;
}

/**
 * Query data with offline support
 */
export function useOfflineQuery<T = any>(
    table: TableName,
    options: UseOfflineQueryOptions<T> = {}
) {
    const {
        queryKey = [table],
        enabled = true,
        refetchOnMount = true,
        refetchOnWindowFocus = true,
        refetchOnReconnect = true,
        staleTime = 5 * 60 * 1000, // 5 minutes
        cacheTime = 24 * 60 * 60 * 1000, // 24 hours
        ...dataServiceOptions
    } = options;

    const queryClient = useQueryClient();

    // Listen for sync completion OR realtime updates to refetch
    useEffect(() => {
        const handleRefresh = (data?: any) => {
            // Only invalidate if the event table matches this query's table (usually index 0 of queryKey)
            // 'data.table' comes from 'realtime-update', otherwise for 'sync-complete' we refresh all
            const table = data?.table;
            if (!table || queryKey.includes(table) || queryKey[0] === table) {
                queryClient.invalidateQueries({ queryKey });
            }
        };

        syncEngine.on('sync-complete', handleRefresh as any);
        (syncEngine as any).on('realtime-update', handleRefresh);

        return () => {
            syncEngine.off('sync-complete', handleRefresh as any);
            (syncEngine as any).off('realtime-update', handleRefresh);
        };
    }, [queryKey, queryClient]);

    return useQuery<T[], Error>({
        queryKey,
        queryFn: async () => {
            return dataService.query<T>(table, dataServiceOptions);
        },
        enabled,
        refetchOnMount,
        refetchOnWindowFocus,
        refetchOnReconnect,
        staleTime,
        gcTime: cacheTime, // Use gcTime instead of deprecated cacheTime
        retry: (failureCount, error) => {
            // Don't retry if offline
            if (networkManager.isOffline()) {
                return false;
            }
            // Retry up to 3 times if online
            return failureCount < 3;
        }
    });
}

/**
 * Get a single record by ID
 */
export function useOfflineQueryById<T = any>(
    table: TableName,
    id: string | undefined | null,
    options: UseOfflineQueryOptions<T> = {}
) {
    const {
        queryKey = [table, id],
        enabled = true,
        ...otherOptions
    } = options;

    return useQuery<T | null, Error>({
        queryKey,
        queryFn: async () => {
            if (!id) return null;
            return dataService.getById<T>(table, id, options);
        },
        enabled: enabled && !!id,
        ...otherOptions,
        staleTime: otherOptions.staleTime || 5 * 60 * 1000,
        gcTime: otherOptions.cacheTime || 24 * 60 * 60 * 1000
    });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

export interface UseOfflineMutationOptions<TData, TVariables> extends MutationOptions {
    onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;
    onError?: (error: Error, variables: TVariables) => void;
    onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void;
    invalidateQueries?: any[];
}

/**
 * Create a new record
 */
export function useOfflineCreate<T extends { id: string }>(
    table: TableName,
    options: UseOfflineMutationOptions<T, T> = {}
) {
    const queryClient = useQueryClient();
    const { invalidateQueries = [table], onSuccess, onError, onSettled, ...mutationOptions } = options;

    return useMutation<T, Error, T>({
        mutationFn: async (data: T) => {
            return dataService.create<T>(table, data, mutationOptions);
        },
        onSuccess: async (data, variables) => {
            // Invalidate and refetch relevant queries
            await queryClient.invalidateQueries({ queryKey: invalidateQueries });

            if (onSuccess) {
                await onSuccess(data, variables);
            }
        },
        onError: (error, variables) => {
            console.error(`Failed to create ${table}:`, error);
            if (onError) {
                onError(error, variables);
            }
        },
        onSettled: (data, error, variables) => {
            if (onSettled) {
                onSettled(data, error, variables);
            }
        }
    });
}

/**
 * Update an existing record
 */
export function useOfflineUpdate<T extends { id: string }>(
    table: TableName,
    options: UseOfflineMutationOptions<T, { id: string; updates: Partial<T> }> = {}
) {
    const queryClient = useQueryClient();
    const { invalidateQueries = [table], onSuccess, onError, onSettled, ...mutationOptions } = options;

    return useMutation<T, Error, { id: string; updates: Partial<T> }>({
        mutationFn: async ({ id, updates }) => {
            return dataService.update<T>(table, id, updates, mutationOptions);
        },
        onMutate: async ({ id, updates }) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: [table, id] });

            // Snapshot previous value
            const previousData = queryClient.getQueryData<T>([table, id]);

            // Optimistically update to the new value
            if (previousData) {
                queryClient.setQueryData<T>([table, id], {
                    ...previousData,
                    ...updates
                });
            }

            return { previousData };
        },
        onError: (error, variables, context: any) => {
            // Rollback on error
            if (context?.previousData) {
                queryClient.setQueryData([table, variables.id], context.previousData);
            }

            console.error(`Failed to update ${table}:`, error);
            if (onError) {
                onError(error, variables);
            }
        },
        onSuccess: async (data, variables) => {
            // Invalidate and refetch
            await queryClient.invalidateQueries({ queryKey: invalidateQueries });

            if (onSuccess) {
                await onSuccess(data, variables);
            }
        },
        onSettled: (data, error, variables) => {
            if (onSettled) {
                onSettled(data, error, variables);
            }
        }
    });
}

/**
 * Delete a record
 */
export function useOfflineDelete(
    table: TableName,
    options: UseOfflineMutationOptions<void, string> = {}
) {
    const queryClient = useQueryClient();
    const { invalidateQueries = [table], onSuccess, onError, onSettled, ...mutationOptions } = options;

    return useMutation<void, Error, string>({
        mutationFn: async (id: string) => {
            return dataService.delete(table, id, mutationOptions);
        },
        onMutate: async (id) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: [table, id] });

            // Snapshot previous value
            const previousData = queryClient.getQueryData([table, id]);

            // Optimistically remove from cache
            queryClient.setQueryData([table, id], undefined);

            return { previousData };
        },
        onError: (error, id, context: any) => {
            // Rollback on error
            if (context?.previousData) {
                queryClient.setQueryData([table, id], context.previousData);
            }

            console.error(`Failed to delete ${table}:`, error);
            if (onError) {
                onError(error, id);
            }
        },
        onSuccess: async (data, variables) => {
            // Invalidate queries
            await queryClient.invalidateQueries({ queryKey: invalidateQueries });

            if (onSuccess) {
                await onSuccess(data, variables);
            }
        },
        onSettled: (data, error, variables) => {
            if (onSettled) {
                onSettled(data, error, variables);
            }
        }
    });
}

/**
 * Batch create multiple records
 */
export function useOfflineBatchCreate<T extends { id: string }>(
    table: TableName,
    options: UseOfflineMutationOptions<T[], T[]> = {}
) {
    const queryClient = useQueryClient();
    const { invalidateQueries = [table], onSuccess, onError, onSettled, ...mutationOptions } = options;

    return useMutation<T[], Error, T[]>({
        mutationFn: async (items: T[]) => {
            return dataService.batchCreate<T>(table, items, mutationOptions);
        },
        onSuccess: async (data, variables) => {
            await queryClient.invalidateQueries({ queryKey: invalidateQueries });

            if (onSuccess) {
                await onSuccess(data, variables);
            }
        },
        onError: (error, variables) => {
            console.error(`Failed to batch create ${table}:`, error);
            if (onError) {
                onError(error, variables);
            }
        },
        onSettled: (data, error, variables) => {
            if (onSettled) {
                onSettled(data, error, variables);
            }
        }
    });
}

// ============================================================================
// Sync Status Hook
// ============================================================================

/**
 * Hook to monitor sync status
 */
export function useSyncStatus() {
    const [syncState, setSyncState] = useState(syncEngine.getState());

    useEffect(() => {
        const handleStateChange = (state: typeof syncState) => {
            setSyncState(state);
        };

        syncEngine.on('state-change', handleStateChange);

        return () => {
            syncEngine.off('state-change', handleStateChange);
        };
    }, []);

    return {
        ...syncState,
        isSyncing: syncState.status === 'syncing',
        triggerSync: () => syncEngine.triggerSync(),
        pause: () => syncEngine.pause(),
        resume: () => syncEngine.resume()
    };
}

/**
 * Hook to check if data is available offline
 */
export function useOfflineAvailability(table: TableName) {
    const [isAvailable, setIsAvailable] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAvailability = async () => {
            setIsLoading(true);
            const available = await dataService.isAvailableOffline(table);
            setIsAvailable(available);
            setIsLoading(false);
        };

        checkAvailability();
    }, [table]);

    return { isAvailable, isLoading };
}

/**
 * Hook to get sync status for a specific record
 */
export function useRecordSyncStatus(table: TableName, id: string | undefined | null) {
    const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'error' | null>(null);

    useEffect(() => {
        if (!id) {
            setSyncStatus(null);
            return;
        }

        const checkStatus = async () => {
            const status = await dataService.getSyncStatus(table, id);
            setSyncStatus(status);
        };

        checkStatus();

        // Re-check on sync completion
        const handleSyncComplete = () => {
            checkStatus();
        };

        syncEngine.on('sync-complete', handleSyncComplete);

        return () => {
            syncEngine.off('sync-complete', handleSyncComplete);
        };
    }, [table, id]);

    return syncStatus;
}
