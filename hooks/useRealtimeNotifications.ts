import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { useProfile } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export function useRealtimeNotifications(userRole?: string) {
    const { profile } = useProfile();
    const { currentSchool, user, isAuthenticated } = useAuth();
    const [notificationCount, setNotificationCount] = useState(0);
    const [lastFetchTime, setLastFetchTime] = useState<number>(0);

    const fetchCount = useCallback(async () => {
        if (!isAuthenticated || !currentSchool?.id) return;

        try {
            const schoolId = currentSchool.id;
            // console.log(`🔔 [Notifications] Fetching for School: ${schoolId}`);
            
            const notifications = await api.getMyNotifications(schoolId);
            
            if (!notifications) return;

            const roleToCheck = (userRole || profile?.role || user?.role || 'student').toLowerCase();
            const currentUserId = user?.id || profile?.user_id;

            const unreadNotifications = notifications.filter(n => {
                if (n.is_read) return false;

                // Check if it's specifically for this user
                const isUserMatch = n.user_id && currentUserId && (String(n.user_id) === String(currentUserId));

                // Check if it's for the user's role
                let isAudienceMatch = false;
                const audience = Array.isArray(n.audience) ? n.audience :
                    (typeof n.audience === 'string' ? [n.audience] : []);

                isAudienceMatch = audience.some((s: any) => {
                    const audStr = String(s || '').toLowerCase();
                    return audStr === roleToCheck || audStr === 'all';
                });

                return isUserMatch || isAudienceMatch;
            });

            setNotificationCount(unreadNotifications.length);
            
            // If there's a new notification since last fetch, we could show a toast here 
            // but RealtimeService already handles that.
            
            setLastFetchTime(Date.now());
        } catch (err) {
            console.error('Notification count exception:', err);
        }
    }, [isAuthenticated, currentSchool?.id, user?.id, user?.role, profile?.role, profile?.user_id, userRole]);

    useEffect(() => {
        if (!isAuthenticated) {
            setNotificationCount(0);
            return;
        }

        fetchCount();

        // Polling for "realtime" updates every 30 seconds
        const interval = setInterval(() => {
            fetchCount();
        }, 30000);

        return () => clearInterval(interval);
    }, [isAuthenticated, fetchCount]);

    return notificationCount;
}

