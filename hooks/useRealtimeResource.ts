import { useState, useEffect, useCallback } from 'react';
import { useRealtimeListener } from './useRealtimeListener';

/**
 * useRealtimeResource Hook
 * 
 * Automatically fetches data and refreshes it whenever the specified table(s) 
 * receive a real-time update.
 * 
 * @param tableName Table(s) to listen for (e.g., 'students' or ['students', 'classes'])
 * @param fetchFn The async function that fetches the data
 * @param deps Dependency array for the fetch function (e.g., [schoolId, branchId])
 */
export function useRealtimeResource<T>(
    tableName: string | string[],
    fetchFn: () => Promise<T>,
    deps: any[] = []
) {
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
            const result = await fetchFn();
            setData(result);
            setError(null);
        } catch (err) {
            console.error(`Error loading data for ${tableName}:`, err);
            setError(err);
        } finally {
            setIsLoading(false);
        }
    }, [fetchFn, JSON.stringify(tableName)]);

    // Initial load and re-load on dependency change
    useEffect(() => {
        loadData();
    }, [loadData, ...deps]);

    // Real-time listener
    useRealtimeListener(tableName, () => {
        console.log(`🔄 Real-time refresh triggered for ${tableName}`);
        loadData();
    });

    return { data, isLoading, error, refresh: loadData };
}
