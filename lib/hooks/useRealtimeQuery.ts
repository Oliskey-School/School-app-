import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabase';
import { RealtimeChannel, PostgrestFilterBuilder } from '@supabase/supabase-js';

interface UseRealtimeQueryOptions<T> {
    table: string;
    select?: string;
    filter?: (query: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>;
    orderBy?: { column: string; ascending?: boolean };
    enabled?: boolean;
    onInsert?: (record: T) => void;
    onUpdate?: (record: T) => void;
    onDelete?: (record: T) => void;
}

interface UseRealtimeQueryReturn<T> {
    data: T[];
    loading: boolean;
    error: Error | null;
    isSubscribed: boolean;
    optimisticInsert: (record: Partial<T>) => string;
    optimisticUpdate: (id: string | number, updates: Partial<T>) => void;
    optimisticDelete: (id: string | number) => void;
    refetch: () => void;
}

/**
 * Enhanced Realtime Query Hook
 * 
 * Provides real-time subscriptions with optimistic updates, error handling,
 * and automatic reconnection.
 * 
 * @example
 * const { data, loading, optimisticInsert } = useRealtimeQuery({
 *   table: 'assignments',
 *   filter: (q) => q.eq('teacher_id', teacherId),
 *   orderBy: { column: 'created_at', ascending: false }
 * });
 */
export function useRealtimeQuery<T = any>(
    options: UseRealtimeQueryOptions<T>
): UseRealtimeQueryReturn<T> {
    const {
        table,
        select = '*',
        filter,
        orderBy,
        enabled = true,
        onInsert,
        onUpdate,
        onDelete
    } = options;

    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [refetchTrigger, setRefetchTrigger] = useState(0);

    // Optimistic update helpers
    const optimisticInsert = useCallback((record: Partial<T>) => {
        const tempId = `temp_${Date.now()}_${Math.random()}`;
        setData(prev => [...prev, { ...record, id: tempId, _optimistic: true } as T]);
        return tempId;
    }, []);

    const optimisticUpdate = useCallback((id: string | number, updates: Partial<T>) => {
        setData(prev => prev.map(item =>
            (item as any).id === id ? { ...item, ...updates, _optimistic: true } as T : item
        ));
    }, []);

    const optimisticDelete = useCallback((id: string | number) => {
        setData(prev => prev.filter(item => (item as any).id !== id));
    }, []);

    const refetch = useCallback(() => {
        setRefetchTrigger(prev => prev + 1);
    }, []);

    useEffect(() => {
        if (!enabled) {
            setLoading(false);
            return;
        }

        let channel: RealtimeChannel;
        let isMounted = true;

        const fetchInitialData = async () => {
            try {
                setLoading(true);
                setError(null);

                let query = supabase.from(table).select(select);

                if (filter) {
                    query = filter(query as any) as any;
                }

                if (orderBy) {
                    query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
                }

                const { data: initialData, error: fetchError } = await query;

                if (fetchError) throw fetchError;

                if (isMounted) {
                    setData((initialData as T[]) || []);
                    setLoading(false);
                }
            } catch (err: any) {
                console.error(`[useRealtimeQuery] Error fetching ${table}:`, err);
                if (isMounted) {
                    setError(err);
                    setLoading(false);
                }
            }
        };

        const setupRealtimeSubscription = () => {
            channel = supabase
                .channel(`realtime:${table}:${Date.now()}`)
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table },
                    (payload) => {
                        if (!isMounted) return;

                        console.log(`[Realtime] INSERT on ${table}:`, payload.new);

                        setData(prev => {
                            // Remove any optimistic records (they'll be replaced by real data)
                            const withoutOptimistic = prev.filter(item => !(item as any)._optimistic);
                            return [...withoutOptimistic, payload.new as T];
                        });

                        onInsert?.(payload.new as T);
                    }
                )
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table },
                    (payload) => {
                        if (!isMounted) return;

                        console.log(`[Realtime] UPDATE on ${table}:`, payload.new);

                        setData(prev => prev.map(item =>
                            (item as any).id === (payload.new as any).id
                                ? { ...(payload.new as T), _optimistic: false }
                                : item
                        ));

                        onUpdate?.(payload.new as T);
                    }
                )
                .on(
                    'postgres_changes',
                    { event: 'DELETE', schema: 'public', table },
                    (payload) => {
                        if (!isMounted) return;

                        console.log(`[Realtime] DELETE on ${table}:`, payload.old);

                        setData(prev => prev.filter(item => (item as any).id !== (payload.old as any).id));

                        onDelete?.(payload.old as T);
                    }
                )
                .subscribe((status) => {
                    console.log(`[Realtime] Subscription status for ${table}:`, status);

                    if (status === 'SUBSCRIBED') {
                        setIsSubscribed(true);
                    } else if (status === 'CHANNEL_ERROR') {
                        console.error(`[Realtime] Subscription error for ${table}`);
                        setIsSubscribed(false);
                    } else if (status === 'TIMED_OUT') {
                        console.error(`[Realtime] Subscription timeout for ${table}`);
                        setIsSubscribed(false);
                    }
                });
        };

        fetchInitialData().then(() => {
            setupRealtimeSubscription();
        });

        return () => {
            isMounted = false;
            if (channel) {
                console.log(`[Realtime] Unsubscribing from ${table}`);
                supabase.removeChannel(channel);
            }
        };
    }, [table, select, enabled, orderBy?.column, orderBy?.ascending, refetchTrigger]);

    return {
        data,
        loading,
        error,
        isSubscribed,
        optimisticInsert,
        optimisticUpdate,
        optimisticDelete,
        refetch
    };
}
