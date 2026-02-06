import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useProfile } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export function useRealtimeNotifications(userRole?: string) {
    const { profile } = useProfile();
    const { currentSchool } = useAuth();
    const [notificationCount, setNotificationCount] = useState(0);
    const [currentUserId, setCurrentUserId] = useState<string | number | null>(profile?.id || null);

    // Ensure we have a User ID (Profile ID or Auth ID)
    useEffect(() => {
        if (profile?.id) {
            setCurrentUserId(profile.id);
        } else {
            supabase.auth.getUser().then(({ data }) => {
                if (data.user) setCurrentUserId(data.user.id);
            });
        }
    }, [profile]);

    const fetchCount = async () => {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('id, user_id, audience')
                .eq('is_read', false);

            if (error) {
                console.error('Error fetching notification count:', error);
                return;
            }

            const roleToCheck = userRole || profile?.role || 'student';

            const count = data.filter(n => {
                const isUserMatch = n.user_id && String(n.user_id) === String(currentUserId);
                const audience = n.audience || [];
                const isAudienceMatch = Array.isArray(audience)
                    ? audience.map((s: string) => s.toLowerCase()).includes(roleToCheck.toLowerCase())
                    : JSON.stringify(audience).toLowerCase().includes(roleToCheck.toLowerCase());

                return isUserMatch || isAudienceMatch;
            }).length;

            setNotificationCount(count);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (!currentUserId || !currentSchool) return;

        fetchCount();

        // 1. Subscribe with School Filtering (Live Handshake)
        const channel = supabase
            .channel(`school_notifications_${currentSchool.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `school_id=eq.${currentSchool.id}`
                },
                (payload) => {
                    console.log('🔔 Live Notification Received:', payload.new);

                    // 2. The Reaction: Immediate Toast/Alert
                    toast(payload.new.title || 'New Notification', {
                        icon: '🔔',
                        style: {
                            borderRadius: '10px',
                            background: '#333',
                            color: '#fff',
                        },
                    });

                    fetchCount();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUserId, currentSchool?.id, userRole, profile?.role]);

    return notificationCount;
}
