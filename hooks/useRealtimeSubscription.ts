
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface RealtimeSubscriptionProps {
    table: string;
    schema?: string;
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    filter?: string;
    callback: (payload: any) => void;
    enabled?: boolean;
}

export function useRealtimeSubscription({
    table,
    schema = 'public',
    event = '*',
    filter,
    callback,
    enabled = true
}: RealtimeSubscriptionProps) {
    const { user } = useAuth();

    useEffect(() => {
        if (!enabled || !user) return;

        console.log(`[Realtime] Subscribing to ${schema}.${table} (${event})`);

        const channelName = `${schema}:${table}:${filter || 'all'}`;
        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                { event: event as any, schema, table, filter },
                (payload) => {
                    console.log(`[Realtime] Change detected in ${table}:`, payload);
                    callback(payload);
                }
            )
            .subscribe((status) => {
                console.log(`[Realtime] Subscription status for ${table}:`, status);
            });

        return () => {
            console.log(`[Realtime] Unsubscribing from ${table}`);
            supabase.removeChannel(channel);
        };
    }, [table, schema, event, filter, enabled, user, callback]);
}
