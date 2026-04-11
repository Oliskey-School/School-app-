import { useEffect, useState, useCallback, useRef } from 'react';
import api from '../api';

interface UseRealtimeQueryOptions<T> {
    table: string;
    select?: string;
    filter?: any; // Simple object filter for now
    orderBy?: { column: string; ascending?: boolean };
    enabled?: boolean;
    pollInterval?: number;
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
 * Enhanced Query Hook (Polling Replacement for Realtime)
 * 
 * Provides polling-based data fetching with optimistic updates and error handling.
 */
export function useRealtimeQuery<T = any>(
    options: UseRealtimeQueryOptions<T>
): UseRealtimeQueryReturn<T> {
    const {
        table,
        filter,
        enabled = true,
        pollInterval = 10000, // Default to 10 seconds
        onUpdate
    } = options;

    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [refetchTrigger, setRefetchTrigger] = useState(0);
    const prevDataRef = useRef<string>('');

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

        let isMounted = true;
        let intervalId: NodeJS.Timeout;

        const fetchData = async () => {
            try {
                // Determine which API method to call based on table name
                // This is a mapping layer until all endpoints are fully standardized
                let result: T[] = [];
                
                if (table === 'students') {
                    result = await api.getStudents(filter?.school_id, filter?.branch_id) as any;
                } else if (table === 'teachers') {
                    result = await api.getTeachers(filter?.school_id, filter?.branch_id) as any;
                } else if (table === 'classes') {
                    result = await api.getClasses(filter?.school_id, filter?.branch_id) as any;
                } else if (table === 'notices') {
                    result = await api.getNotices(filter?.school_id, filter?.branch_id) as any;
                } else {
                    // Generic fallback if we don't have a specific mapping
                    console.warn(`[useRealtimeQuery] No specific API mapping for table: ${table}. Polling may not work.`);
                    return;
                }

                if (isMounted) {
                    const dataString = JSON.stringify(result);
                    if (dataString !== prevDataRef.current) {
                        setData(result);
                        prevDataRef.current = dataString;
                        if (prevDataRef.current !== '') {
                            onUpdate?.(result as any);
                        }
                    }
                    setLoading(false);
                    setError(null);
                }
            } catch (err: any) {
                console.error(`[useRealtimeQuery] Error polling ${table}:`, err);
                if (isMounted) {
                    setError(err);
                    setLoading(false);
                }
            }
        };

        fetchData();
        intervalId = setInterval(fetchData, pollInterval);

        return () => {
            isMounted = false;
            if (intervalId) clearInterval(intervalId);
        };
    }, [table, enabled, pollInterval, refetchTrigger, JSON.stringify(filter)]);

    return {
        data,
        loading,
        error,
        isSubscribed: true, // Mocked for compatibility
        optimisticInsert,
        optimisticUpdate,
        optimisticDelete,
        refetch
    };
}
