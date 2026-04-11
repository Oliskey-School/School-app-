import { useEffect, useState, useRef } from 'react';
import { api } from './api';

/**
 * A custom hook to fetch data from a table and "subscribe" to changes via polling.
 * replaced legacy Supabase Realtime with a polling mechanism.
 * 
 * @param tableName The name of the table to listen to (e.g., 'students', 'classes')
 * @param selectQuery The columns to select (default: '*')
 * @param orderBy The column to order by (optional)
 * @param ascending Order direction (default: true)
 * @param pollInterval Polling interval in ms (default: 30000 - 30 seconds)
 */
export function useRealtime<T>(
    tableName: string,
    selectQuery: string = '*',
    orderBy?: string,
    ascending: boolean = true,
    pollInterval: number = 30000
) {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

    const fetchData = async (isInitial = false) => {
        try {
            if (isInitial) setLoading(true);
            
            let query = api.from(tableName).select(selectQuery);

            if (orderBy) {
                query = query.order(orderBy, { ascending });
            }

            const { data: latestData, error: fetchError } = await query;

            if (fetchError) {
                throw fetchError;
            }

            setData(latestData as T[]);
            setError(null);
        } catch (err: any) {
            console.error(`[useRealtime] Error fetching ${tableName}:`, err);
            setError(err.message || 'Failed to fetch data');
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    useEffect(() => {
        // Initial fetch
        fetchData(true);

        // Setup polling
        pollTimerRef.current = setInterval(() => {
            fetchData();
        }, pollInterval);

        return () => {
            if (pollTimerRef.current) {
                clearInterval(pollTimerRef.current);
            }
        };
    }, [tableName, selectQuery, orderBy, ascending, pollInterval]);

    return { 
        data, 
        loading, 
        error,
        refresh: () => fetchData(true)
    };
}

