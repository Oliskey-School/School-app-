import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useProfile } from '../context/ProfileContext';

export function useRealtimeNotifications() {
    const { profile } = useProfile();
    const [notificationCount, setNotificationCount] = useState(0);

    useEffect(() => {
        if (!profile.id) return;

        // Fetch initial count
        const fetchCount = async () => {
            // Assuming 'notifications' table has 'user_id' and 'is_read' columns
            // If table differs, we will adjust
            const { count, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', profile.id)
                .eq('is_read', false);

            if (!error && count !== null) {
                setNotificationCount(count);
            }
        };

        fetchCount();

        // Subscribe to changes
        const channel = supabase
            .channel(`notifications:${profile.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${profile.id}`
                },
                () => {
                    // On any change (INSERT new notification, UPDATE read status), re-fetch count
                    fetchCount();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile.id]);

    return notificationCount;
}
