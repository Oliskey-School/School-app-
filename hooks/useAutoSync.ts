import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

/**
 * A reusable hook to create global auto-sync listeners on Supabase.
 * It strictly filters by the user's current school to prevent data cross-talk.
 * 
 * @param tables Array of table names to listen to (e.g., ['students', 'assignments'])
 * @param onUpdate The callback function to execute when a change occurs.
 */
export const useAutoSync = (tables: string[], onUpdate: () => void) => {
    const { currentSchool } = useAuth();

    useEffect(() => {
        if (!currentSchool?.id || tables.length === 0) return;

        const channels: any[] = [];
        // Generate a unique ID for this instance so that if multiple components
        // listen to the same table, one unmounting doesn't kill the channel for the others.
        const instanceId = Math.random().toString(36).substring(2, 9);

        tables.forEach((table) => {
            // We use 'postgres_changes' to listen to inserts, updates, and deletes.
            // We strictly add a filter for the current school_id to maintain tenant isolation.
            const channel = supabase
                .channel(`auto-sync-${table}-${currentSchool.id}-${instanceId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*', // Listen to INSERT, UPDATE, DELETE
                        schema: 'public',
                        table: table,
                        filter: `school_id=eq.${currentSchool.id}` // TENANT ISOLATION
                    },
                    (payload) => {
                        console.log(`🔄 [AutoSync Triggered] Table: ${table}, Event: ${payload.eventType}`);
                        onUpdate();
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        // console.log(`📡 [AutoSync] Connected to ${table}`);
                    }
                });

            channels.push(channel);
        });

        // Cleanup: remove all subscriptions when the component unmounts
        // or when the dependencies change.
        return () => {
            channels.forEach((channel) => {
                supabase.removeChannel(channel);
            });
        };
    }, [tables.join(','), currentSchool?.id, onUpdate]);
};
