import { useEffect, useCallback } from 'react';

/**
 * useRealtimeListener Hook
 * 
 * Listens for the 'realtime-update' event dispatched by RealtimeService.
 * 
 * @param tables The table(s) to listen for. Can be a string or an array of strings.
 * @param callback The function to call when an update occurs.
 */
export function useRealtimeListener(tables: string | string[], callback: (payload: any) => void) {
    const tableArray = Array.isArray(tables) ? tables : [tables];

    // IMPORTANT: never spread a caller-supplied array directly into a hook
    // dependency array (e.g. `[callback, ...tableArray]`). If the caller ever
    // passes a differently-sized array between renders, the dependency
    // array's length changes and React throws "the final argument passed to
    // %s changed size between renders". Use a stable, fixed-length key
    // (the joined string) instead.
    const handleUpdate = useCallback((event: any) => {
        const { table, record } = event.detail;
        if (tableArray.includes(table) || tableArray.includes('*')) {
            callback({ table, record });
        }
    }, [callback, tableArray.join(',')]);

    useEffect(() => {
        window.addEventListener('realtime-update', handleUpdate);
        return () => window.removeEventListener('realtime-update', handleUpdate);
    }, [handleUpdate]);
}
