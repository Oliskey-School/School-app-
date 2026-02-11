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
                .select('id, user_id, audience, school_id')
                .eq('is_read', false)
                .eq('school_id', currentSchool?.id); // Ensure we only count for current school

            if (error) {
                console.error('Error fetching notification count:', error);
                return;
            }

            const roleToCheck = (userRole || profile?.role || 'student').toLowerCase();

            const count = data.filter(n => {
                const isUserMatch = n.user_id && String(n.user_id) === String(currentUserId);

                let isAudienceMatch = false;
                const audience = n.audience;

                if (Array.isArray(audience)) {
                    isAudienceMatch = audience.some((s: string) => s.toLowerCase() === roleToCheck || s.toLowerCase() === 'all');
                } else if (typeof audience === 'string') {
                    const audienceLower = audience.toLowerCase();
                    isAudienceMatch = audienceLower === roleToCheck || audienceLower === 'all';
                }

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
                    event: '*', // Listen to INSERT and UPDATE
                    schema: 'public',
                    table: 'notifications',
                    filter: `school_id=eq.${currentSchool.id}`
                },
                (payload) => {
                    const newRecord = payload.new as any;
                    console.log('🔔 Live Notification Received:', newRecord);

                    // 2. The Reaction: Immediate Toast/Alert (Only for INSERT)
                    if (payload.eventType === 'INSERT') {
                        toast(newRecord.title || 'New Notification', {
                            icon: '🔔',
                            style: {
                                borderRadius: '10px',
                                background: '#333',
                                color: '#fff',
                            },
                        });
                    }

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
