import { useState, useCallback } from 'react';

interface ApiResponse<T> {
    data: T | null;
    error: Error | null;
    loading: boolean;
    statusCode?: number;
}

export function useApi<T = any>() {
    const [state, setState] = useState<ApiResponse<T>>({
        data: null,
        error: null,
        loading: false,
    });

    const execute = useCallback(async (
        promiseOrFn: Promise<{ data: T | null; error: any }> | (() => Promise<{ data: T | null; error: any }>)
    ) => {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const startTime = Date.now();

        try {
            // Handle both Promise and Function returning Promise
            const result = typeof promiseOrFn === 'function' ? await promiseOrFn() : await promiseOrFn;

            const { data, error } = result;

            if (error) {
                // Log the specific error for debugging
                console.error(`[API Error] Status: ${error.code || 'Unknown'} - ${error.message}`);
                throw error;
            }

            const duration = Date.now() - startTime;
            console.log(`[API Success] Data received in ${duration}ms`);

            setState({
                data,
                error: null,
                loading: false,
                statusCode: 200, // Supabase success implies 2xx usually
            });

            return data;
        } catch (err: any) {
            const duration = Date.now() - startTime;
            console.error(`[API Failed] After ${duration}ms:`, err);

            setState({
                data: null,
                error: err instanceof Error ? err : new Error(String(err)),
                loading: false,
                statusCode: err.status || 500,
            });

            return null;
        }
    }, []);

    return { ...state, execute };
}
