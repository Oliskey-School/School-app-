/**
 * Enhanced Realtime Subscription Hook with Offline Support
 * 
 * Automatically pauses subscriptions when offline and resumes with catch-up on reconnection.
 */

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { networkManager } from '../lib/networkManager';
import { syncEngine } from '../lib/syncEngine';

export interface RealtimePayload<T = any> {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: T;
    old: T;
    errors: any;
}

/**
 * Enhanced realtime subscription hook with offline support
 */
export const useRealtimeSubscription = (
    table: string,
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
    callback: (payload: RealtimePayload) => void,
    options: {
        enabled?: boolean;
        catchUpOnReconnect?: boolean;
        showToasts?: boolean;
    } = {}
) => {
    const {
        enabled = true,
        catchUpOnReconnect = true,
        showToasts = true
    } = options;

    const [isSubscribed, setIsSubscribed] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const isOnlineRef = useRef(networkManager.isOnline());

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const subscribe = () => {
            if (!networkManager.isOnline()) {
                console.log(`📴 Offline - pausing realtime subscription for ${table}`);
                return;
            }

            console.log(`🔌 Subscribing to Realtime: ${table} (${event})`);

            const channel = supabase
                .channel(`public:${table}`)
                .on(
                    'postgres_changes' as any,
                    { event, schema: 'public', table },
                    (payload) => {
                        console.log(`⚡ Realtime Update [${table}]:`, payload);

                        // Update last sync time
                        setLastUpdate(Date.now());

                        // Transform Supabase payload format
                        const realtimePayload: RealtimePayload = {
                            eventType: event as any,
                            new: (payload as any).new || {},
                            old: (payload as any).old || {},
                            errors: (payload as any).errors || null
                        };

                        // Call user callback
                        callback(realtimePayload);

                        // Show toast notification
                        if (showToasts) {
                            toast.success(`${event} in ${table}!`);
                        }
                    }
                )
                .subscribe((status) => {
                    console.log(`🔌 Subscription status for ${table}:`, status);
                    setIsSubscribed(status === 'SUBSCRIBED');
                });

            channelRef.current = channel;
        };

        const unsubscribe = () => {
            if (channelRef.current) {
                console.log(`🔌 Unsubscribing from ${table}`);
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
                setIsSubscribed(false);
            }
        };

        // Initial subscription
        subscribe();

        // Listen for network state changes
        const handleOnline = async () => {
            console.log(`🌐 Back online - resuming realtime for ${table}`);
            isOnlineRef.current = true;

            // Catch up on missed updates
            if (catchUpOnReconnect) {
                await performCatchUp();
            }

            // Resubscribe
            subscribe();
        };

        const handleOffline = () => {
            console.log(`📴 Went offline - pausing realtime for ${table}`);
            isOnlineRef.current = false;
            unsubscribe();
        };

        networkManager.on('online', handleOnline);
        networkManager.on('offline', handleOffline);

        // Cleanup
        return () => {
            unsubscribe();
            networkManager.off('online', handleOnline);
            networkManager.off('offline', handleOffline);
        };
    }, [table, event, enabled, callback, catchUpOnReconnect, showToasts]);

    /**
     * Catch up on missed updates while offline
     */
    const performCatchUp = async () => {
        try {
            console.log(`🔄 Catching up on ${table} updates since ${new Date(lastUpdate).toISOString()}`);

            // Trigger delta sync for this table
            await syncEngine.triggerSync();

            console.log(`✅ Catch-up complete for ${table}`);
        } catch (error) {
            console.error(`❌ Catch-up failed for ${table}:`, error);
        }
    };

    return {
        isSubscribed,
        isOnline: isOnlineRef.current,
        lastUpdate
    };
};

/**
 * Hook to subscribe to multiple tables at once
 */
export const useRealtimeSubscriptions = (
    subscriptions: Array<{
        table: string;
        event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
        callback: (payload: RealtimePayload) => void;
    }>,
    options?: {
        enabled?: boolean;
        catchUpOnReconnect?: boolean;
        showToasts?: boolean;
    }
) => {
    const statuses = subscriptions.map((sub) =>
        useRealtimeSubscription(sub.table, sub.event, sub.callback, options)
    );

    return {
        allSubscribed: statuses.every((s) => s.isSubscribed),
        anySubscribed: statuses.some((s) => s.isSubscribed),
        isOnline: statuses[0]?.isOnline ?? false,
        subscriptions: statuses
    };
};
