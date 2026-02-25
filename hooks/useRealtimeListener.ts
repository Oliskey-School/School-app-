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

    const handleUpdate = useCallback((event: any) => {
        const { table, record } = event.detail;
        if (tableArray.includes(table) || tableArray.includes('*')) {
            callback({ table, record });
        }
    }, [callback, ...tableArray]);

    useEffect(() => {
        window.addEventListener('realtime-update', handleUpdate);
        return () => window.removeEventListener('realtime-update', handleUpdate);
    }, [handleUpdate]);
}
