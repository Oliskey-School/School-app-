import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';

/**
 * Starts realtime synchronization after the authenticated page is interactive.
 * Realtime is enhancement work, not a requirement for first paint.
 */
export function useRealtimeSync() {
    const { user } = useAuth();
    const { currentBranch } = useBranch();
    const schoolId = user?.user_metadata?.school_id || (user as any)?.school_id || user?.app_metadata?.school_id;
    const userId = user?.id;
    const branchId = currentBranch?.id;

    useEffect(() => {
        if (!userId || !schoolId) return;

        let cancelled = false;
        let idleId: number | undefined;
        let timeoutId: number | undefined;

        const initialize = async () => {
            try {
                const { realtimeService } = await import('../services/RealtimeService');
                if (!cancelled) {
                    console.log(`🔌 [useRealtimeSync] Initializing for School: ${schoolId}, Branch: ${branchId || 'All'}`);
                    realtimeService.initialize(userId, schoolId, branchId);
                }
            } catch (error) {
                if (!cancelled) console.warn('Realtime initialization deferred/failed:', error);
            }
        };

        if ('requestIdleCallback' in window) {
            idleId = (window as any).requestIdleCallback(initialize, { timeout: 4000 });
        } else {
            timeoutId = window.setTimeout(initialize, 1500);
        }

        return () => {
            cancelled = true;
            if (idleId !== undefined && 'cancelIdleCallback' in window) {
                (window as any).cancelIdleCallback(idleId);
            }
            if (timeoutId !== undefined) window.clearTimeout(timeoutId);
        };
    }, [userId, schoolId, branchId]);

    return {
        isActive: !!userId && !!schoolId,
        refresh: async () => {
            if (!userId || !schoolId) return;
            const { realtimeService } = await import('../services/RealtimeService');
            realtimeService.initialize(userId, schoolId, branchId);
        }
    };
}
