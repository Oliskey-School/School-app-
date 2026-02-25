import { useEffect, useRef } from 'react';

/**
 * useRealtimeRefresh - Lightweight hook for auto-refreshing screen data
 * 
 * Listens to the global 'realtime-update' window event dispatched by
 * RealtimeService and calls the provided refetch callback when a
 * matching table changes.
 * 
 * Usage:
 *   useRealtimeRefresh(['students', 'classes'], fetchStudents);
 */
export function useRealtimeRefresh(
    tables: string[],
    refetchFn: () => void,
    enabled: boolean = true
) {
    const refetchRef = useRef(refetchFn);
    refetchRef.current = refetchFn;

    useEffect(() => {
        if (!enabled) return;

        const handler = (event: Event) => {
            const detail = (event as CustomEvent).detail;
            const changedTable = detail?.table;

            // If no table specified, or it matches one we care about, refetch
            if (!changedTable || tables.includes(changedTable)) {
                refetchRef.current();
            }
        };

        window.addEventListener('realtime-update', handler);
        return () => window.removeEventListener('realtime-update', handler);
    }, [tables.join(','), enabled]);
}

export default useRealtimeRefresh;
