import { useMemo } from 'react';
import { useProfile } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from './useNotifications';

/**
 * Unread notification count, derived from the shared notifications cache
 * (see useNotifications) instead of its own poll. That cache is fetched once
 * and kept live by the socket handler in SocketContext merging pushed
 * notifications straight in — so every caller of this hook (DashboardLayout
 * AND the individual role dashboards mount it independently) shares one
 * underlying fetch instead of each running its own 30s interval.
 */
export function useRealtimeNotifications(userRole?: string) {
    const { profile } = useProfile();
    const { user } = useAuth();
    const { notifications } = useNotifications();

    const roleToCheck = (userRole || profile?.role || user?.role || 'student').toLowerCase();
    const currentUserId = user?.id || profile?.user_id;

    return useMemo(() => {
        return notifications.filter((n: any) => {
            if (n.is_read) return false;

            const isUserMatch = n.user_id && currentUserId && (String(n.user_id) === String(currentUserId));

            const audience = Array.isArray(n.audience) ? n.audience :
                (typeof n.audience === 'string' ? [n.audience] : []);
            const isAudienceMatch = audience.some((s: any) => {
                const audStr = String(s || '').toLowerCase();
                return audStr === roleToCheck || audStr === 'all';
            });

            return isUserMatch || isAudienceMatch;
        }).length;
    }, [notifications, roleToCheck, currentUserId]);
}
