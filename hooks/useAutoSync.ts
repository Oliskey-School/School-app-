import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

/**
 * A reusable hook to create global auto-sync listeners on Supabase.
 * Uses the global RealtimeService events for maximum efficiency.
 * 
 * @param tables Array of table names to listen to (e.g., ['students', 'assignments'])
 * @param onUpdate The callback function to execute when a change occurs.
 */
export const useAutoSync = (tables: string[], onUpdate: () => void) => {
    useEffect(() => {
        if (tables.length === 0) return;

        const handleRealtimeUpdate = (event: any) => {
            const { table } = event.detail;
            if (tables.includes(table) || tables.includes('*')) {
                console.log(`🔄 [AutoSync Triggered via Global Channel] Table: ${table}`);
                onUpdate();
            }
        };

        window.addEventListener('realtime-update', handleRealtimeUpdate);

        return () => {
            window.removeEventListener('realtime-update', handleRealtimeUpdate);
        };
    }, [tables.join(','), onUpdate]);
};

