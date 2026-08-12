import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export const NOTIFICATIONS_QUERY_KEY = ['notifications'] as const;

/**
 * One shared notification cache instead of each screen fetching its own copy.
 * SocketContext merges pushed notifications straight into this cache, so
 * mounting this hook never triggers a refetch on its own — only the first
 * mount across the whole app does the initial GET.
 */
export function useNotifications() {
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: NOTIFICATIONS_QUERY_KEY,
        queryFn: () => api.getMyNotifications(),
        staleTime: Infinity,
    });

    const prependNotification = useCallback((notification: any) => {
        queryClient.setQueryData(NOTIFICATIONS_QUERY_KEY, (prev: any[] | undefined) =>
            prev ? [notification, ...prev] : [notification]
        );
    }, [queryClient]);

    return { notifications: data ?? [], isLoading, prependNotification, queryClient };
}
