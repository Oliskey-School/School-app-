import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import { realtimeService } from '../services/RealtimeService';

/**
 * useRealtimeSync Hook
 * 
 * Ensures the global realtime subscription is active for the current school and branch.
 * This hook should be called at the top level of the authenticated app.
 */
export function useRealtimeSync() {
    const { user } = useAuth();
    const { currentBranch } = useBranch();
    const schoolId = user?.user_metadata?.school_id || (user as any)?.school_id || user?.app_metadata?.school_id;
    const userId = user?.id;
    const branchId = currentBranch?.id;

    useEffect(() => {
        if (userId && schoolId) {
            console.log(`🔌 [useRealtimeSync] Initializing for School: ${schoolId}, Branch: ${branchId || 'All'}`);
            realtimeService.initialize(userId, schoolId, branchId);
        }
    }, [userId, schoolId, branchId]);

    return {
        isActive: !!userId && !!schoolId,
        refresh: () => {
            if (userId && schoolId) realtimeService.initialize(userId, schoolId, branchId);
        }
    };
}

