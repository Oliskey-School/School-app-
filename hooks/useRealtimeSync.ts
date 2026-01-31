import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { realtimeService } from '../services/RealtimeService';

/**
 * useRealtimeSync Hook
 * 
 * Ensures the global realtime subscription is active for the current school.
 * This hook should be called at the top level of the authenticated app.
 */
export function useRealtimeSync() {
    const { user } = useAuth();
    const schoolId = user?.user_metadata?.school_id || (user as any)?.school_id;
    const userId = user?.id;

    useEffect(() => {
        if (userId && schoolId) {
            realtimeService.initialize(userId, schoolId);
        }

        return () => {
            // We usually don't want to destroy on every unmount if this is a global hook,
            // but if the user or school changes, initialize handles the recreation.
        };
    }, [userId, schoolId]);

    return {
        isActive: !!userId && !!schoolId,
        refresh: () => {
            if (userId && schoolId) realtimeService.initialize(userId, schoolId);
        }
    };
}
