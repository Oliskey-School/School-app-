import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * A custom hook to fetch data from a table and subscribe to real-time changes.
 * @param tableName The name of the table to listen to (e.g., 'students', 'classes')
 * @param selectQuery The columns to select (default: '*')
 * @param orderBy The column to order by (optional)
 * @param ascending Order direction (default: true)
 */
export function useRealtime<T>(
    tableName: string,
    selectQuery: string = '*',
    orderBy?: string,
    ascending: boolean = true
) {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let channel: RealtimeChannel;

        const fetchData = async () => {
            try {
                setLoading(true);
                let query = supabase.from(tableName).select(selectQuery);

                if (orderBy) {
                    query = query.order(orderBy, { ascending });
                }

                const { data: initialData, error: fetchError } = await query;

                if (fetchError) {
                    throw fetchError;
                }

                setData(initialData as T[]);
            } catch (err: any) {
                console.error(`Error fetching ${tableName}:`, err);
                setError(err.message || 'Failed to fetch data');
            } finally {
                setLoading(false);
            }
        };

        const setupSubscription = () => {
            channel = supabase
                .channel(`public:${tableName}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: tableName },
                    (payload) => {
                        // console.log('Realtime update:', payload);

                        // Handle different event types
                        if (payload.eventType === 'INSERT') {
                            setData((prev) => [...prev, payload.new as T]);
                        } else if (payload.eventType === 'UPDATE') {
                            setData((prev) =>
                                prev.map((item: any) =>
                                    item.id === payload.new.id ? payload.new : item
                                ) as T[]
                            );
                        } else if (payload.eventType === 'DELETE') {
                            setData((prev) =>
                                prev.filter((item: any) => item.id !== payload.old.id)
                            );
                        }
                    }
                )
                .subscribe();
        };

        fetchData().then(() => {
            setupSubscription();
        });

        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [tableName, selectQuery, orderBy, ascending]);

    return { data, loading, error };
}
