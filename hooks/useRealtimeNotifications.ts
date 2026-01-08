import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useProfile } from '../context/ProfileContext';

export function useRealtimeNotifications(userRole?: string) {
    const { profile } = useProfile();
    const [notificationCount, setNotificationCount] = useState(0);
    const [currentUserId, setCurrentUserId] = useState<string | number | null>(profile?.id || null);

    // Ensure we have a User ID (Profile ID or Auth ID)
    useEffect(() => {
        if (profile?.id) {
            setCurrentUserId(profile.id);
        } else {
            // Fallback for Admin or specialized roles without standard profiles
            supabase.auth.getUser().then(({ data }) => {
                if (data.user) setCurrentUserId(data.user.id);
            });
        }
    }, [profile]);

    const fetchCount = async () => {
        try {
            // 1. Fetch all unread notifications (we'll filter in memory for complex OR logic)
            // Ideally, this uses an RPC or complex filter string, but client-side filtering 
            // is reliable for "User ID OR Audience Array" logic.
            const { data, error } = await supabase
                .from('notifications')
                .select('id, user_id, audience')
                .eq('is_read', false);

            if (error) {
                console.error('Error fetching notification count:', error);
                return;
            }

            const roleToCheck = userRole || profile?.role || 'student'; // Default fallback

            const count = data.filter(n => {
                // Match 1: Specific User ID
                // Handle type mismatch (DB might be int, Auth might be UUID)
                const isUserMatch = n.user_id && String(n.user_id) === String(currentUserId);

                // Match 2: Audience (Role)
                const audience = n.audience || [];
                const isAudienceMatch = Array.isArray(audience)
                    ? audience.map(s => s.toLowerCase()).includes(roleToCheck.toLowerCase())
                    : JSON.stringify(audience).toLowerCase().includes(roleToCheck.toLowerCase());

                return isUserMatch || isAudienceMatch;
            }).length;

            setNotificationCount(count);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (!currentUserId) return;

        fetchCount();

        // Subscribe to ANY change in notifications table
        // We filter events locally by just refreshing the count on any event
        const channel = supabase
            .channel('global_notifications')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                },
                () => {
                    fetchCount();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUserId, userRole, profile?.role]);

    return notificationCount;
}
