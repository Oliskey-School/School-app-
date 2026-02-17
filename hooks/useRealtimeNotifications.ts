import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useProfile } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export function useRealtimeNotifications(userRole?: string) {
    const { profile } = useProfile();
    const { currentSchool, user } = useAuth();
    const [notificationCount, setNotificationCount] = useState(0);
    const [currentUserId, setCurrentUserId] = useState<string | number | null>(profile?.id || null);

    // Ensure we have a User ID (Profile ID or Auth ID)
    useEffect(() => {
        if (profile?.id) {
            setCurrentUserId(profile.id);
        } else {
            supabase.auth.getUser().then(({ data }) => {
                if (data.user) {
                    setCurrentUserId(data.user.id);
                }
            });
        }
    }, [profile?.id]);

    const fetchCount = async () => {
        // We need both to accurately filter multi-tenant notifications
        let schoolId = currentSchool?.id || user?.app_metadata?.school_id || user?.user_metadata?.school_id;

        // Demo Fallback
        const isDemo = user?.email?.includes('demo') || user?.user_metadata?.is_demo || !schoolId;
        if (!schoolId && isDemo) {
            schoolId = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
        }

        if (!currentUserId || !schoolId) {
            console.log('🔔 [Notifications] Missing context:', { currentUserId, schoolId });
            return;
        }

        try {
            console.log(`🔔 [Notifications] Fetching for School: ${schoolId}, User: ${currentUserId}`);
            // Optimization: Filter for the user or global/role-based audience directly in the query if possible, 
            // but since audience is a JSONB/Array, we'll fetch school unread and filter in JS for accuracy.
            const { data, error } = await supabase
                .from('notifications')
                .select('id, user_id, audience, is_read')
                .eq('school_id', schoolId)
                .eq('is_read', false);

            if (error) {
                console.error('Error fetching notification count:', error);
                return;
            }

            const roleToCheck = (userRole || profile?.role || 'student').toLowerCase();

            const count = data.filter(n => {
                // Fix: Ensure we compare against BOTH possible ID types (UUID or Numeric)
                const isUserMatch = n.user_id && currentUserId && (String(n.user_id) === String(currentUserId));

                let isAudienceMatch = false;
                const audience = Array.isArray(n.audience) ? n.audience :
                    (typeof n.audience === 'string' ? [n.audience] : []);

                isAudienceMatch = audience.some((s: any) => {
                    const audStr = String(s || '').toLowerCase();
                    return audStr === roleToCheck || audStr === 'all';
                });

                return isUserMatch || isAudienceMatch;
            }).length;

            setNotificationCount(count);
        } catch (err) {
            console.error('Notification count exception:', err);
        }
    };

    useEffect(() => {
        let schoolId = currentSchool?.id || user?.app_metadata?.school_id || user?.user_metadata?.school_id;
        const isDemo = user?.email?.includes('demo') || user?.user_metadata?.is_demo || !schoolId;
        if (!schoolId && isDemo) {
            schoolId = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
        }

        if (!currentUserId || !schoolId) return;

        fetchCount();

        // 1. Subscribe with School Filtering (Live Handshake)
        console.log(`🔔 [Notifications] Subscribing to notifications table for school ${schoolId}`);
        const channel = supabase
            .channel(`notifications-${schoolId}`)
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to INSERT, UPDATE, and DELETE
                    schema: 'public',
                    table: 'notifications'
                },
                (payload) => {
                    const newRecord = payload.new as any;
                    console.log(`🔔 [Notifications] ${payload.eventType} Received:`, newRecord);

                    // Re-fetch count for any change to ensure accuracy
                    fetchCount();

                    // Show Toast ONLY on INSERT
                    if (payload.eventType === 'INSERT') {
                        // Local verification of school_id
                        if (newRecord.school_id !== schoolId) return;

                        // Audience & User Filtering for Toast
                        const roleToCheck = (userRole || profile?.role || 'student').toLowerCase();

                        let audience: string[] = [];
                        const audField = newRecord.audience;
                        if (Array.isArray(audField)) {
                            audience = audField;
                        } else if (typeof audField === 'string') {
                            if (audField.startsWith('{') && audField.endsWith('}')) {
                                audience = audField.slice(1, -1).split(',').map(s => s.trim());
                            } else {
                                audience = [audField];
                            }
                        }

                        const isForUser = !newRecord.user_id || (currentUserId && String(newRecord.user_id) === String(currentUserId));
                        const isForRole = audience.some((s: any) => {
                            const audStr = String(s || '').toLowerCase();
                            return audStr === roleToCheck || audStr === 'all';
                        });

                        if (isForUser && isForRole) {
                            toast(newRecord.title || 'New Notification', {
                                icon: '🔔',
                                style: {
                                    borderRadius: '10px',
                                    background: '#333',
                                    color: '#fff',
                                },
                            });
                        }
                    }
                }
            )
            .subscribe((status) => {
                console.log('🔔 [Notifications] Subscription status:', status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUserId, currentSchool?.id, userRole, profile?.role]);

    return notificationCount;
}
