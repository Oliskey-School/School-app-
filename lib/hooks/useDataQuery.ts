import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

interface UseDataQueryOptions<T> {
    table: string;
    select?: string;
    eq?: { column: string; value: any }[];
    order?: { column: string; ascending?: boolean };
    limit?: number;
    enabled?: boolean;
}

interface UseDataQueryReturn<T> {
    data: T[] | null;
    loading: boolean;
    error: any;
    refetch: () => Promise<void>;
}

/**
 * Generic data fetching hook that replaces useSupabaseQuery.
 * Interfaces with the HybridApiClient's Fluent Query Builder.
 */
export function useDataQuery<T = any>(options: UseDataQueryOptions<T>): UseDataQueryReturn<T> {
    const { table, select = '*', eq = [], order, limit, enabled = true } = options;
    
    const [data, setData] = useState<T[] | null>(null);
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState<any>(null);

    const fetchData = useCallback(async () => {
        if (!enabled) return;
        
        try {
            setLoading(true);
            let query = api.from(table).select(select);
            
            // Apply equality filters
            eq.forEach(filter => {
                query = query.eq(filter.column, filter.value);
            });
            
            // Apply ordering
            if (order) {
                query = query.order(order.column, { ascending: order.ascending });
            }
            
            // Apply limit
            if (limit) {
                query = query.limit(limit);
            }
            
            const result = await query;
            
            if (result.error) throw result.error;
            
            setData(result.data);
            setError(null);
        } catch (err: any) {
            console.error(`[useDataQuery] Error fetching from ${table}:`, err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [table, select, JSON.stringify(eq), JSON.stringify(order), limit, enabled]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        data,
        loading,
        error,
        refetch: fetchData
    };
}
