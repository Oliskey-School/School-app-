import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';

/**
 * Start realtime only after the authenticated UI has become interactive.
 * This keeps WebSocket setup out of the critical dashboard render path while
 * preserving the same school/branch scoping and reconnect behavior.
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
        let realtime: any = null;

        const initialize = async () => {
            if (cancelled) return;
            try {
                // Keep the realtime implementation out of the initial JS path.
                const module = await import('../services/RealtimeService');
                if (cancelled) return;
                realtime = module.realtimeService;
                console.log(`🔌 [useRealtimeSync] Initializing for School: ${schoolId}, Branch: ${branchId || 'All'}`);
                realtime.initialize(userId, schoolId, branchId);
            } catch (error) {
                // Realtime is enhancement/background work. A failed socket must
                // never turn a usable cached dashboard into an error state.
                console.warn('[useRealtimeSync] Background realtime initialization failed', error);
            }
        };

        const idleHandle = 'requestIdleCallback' in window
            ? window.requestIdleCallback(initialize, { timeout: 2000 })
            : window.setTimeout(initialize, 500);

        return () => {
            cancelled = true;
            if ('cancelIdleCallback' in window && typeof idleHandle === 'number') {
                window.cancelIdleCallback(idleHandle);
            } else {
                window.clearTimeout(idleHandle as number);
            }
        };
    }, [userId, schoolId, branchId]);

    return {
        isActive: !!userId && !!schoolId,
        refresh: async () => {
            if (!userId || !schoolId) return;
            try {
                const module = await import('../services/RealtimeService');
                module.realtimeService.initialize(userId, schoolId, branchId);
            } catch (error) {
                console.warn('[useRealtimeSync] Background realtime refresh failed', error);
            }
        }
    };
}
