import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

interface TenantLimit {
    currentCount: number;
    maxLimit: number;
    isLimitReached: boolean;
    isPremium: boolean;
    planType: string;
    loading: boolean;
    refreshCount: () => Promise<void>;
}

export const useTenantLimit = (entity: 'users' | 'students' | 'teachers' = 'users'): TenantLimit => {
    const { isAuthenticated, currentSchool } = useAuth();
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const FREE_TIER_LIMIT = 10;
    const OLISKEY_DEMO_SCHOOL_ID = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
    const isPremium = currentSchool?.is_premium || currentSchool?.id === OLISKEY_DEMO_SCHOOL_ID;
    const planType = currentSchool?.id === OLISKEY_DEMO_SCHOOL_ID ? 'premium' : (currentSchool?.plan_type || 'free');

    // Paid plans (basic/advanced) are billed PER STUDENT, so the student cap is exactly
    // what the school PAID for (school.student_count). To enrol beyond it they must pay
    // for the extra seats. Users/teachers stay uncapped on paid plans; Free caps at 10.
    const PAID_STUDENT_CAPACITY = (currentSchool as any)?.student_count || 0;
    const MAX_LIMIT = (entity === 'students' && isPremium)
        ? (PAID_STUDENT_CAPACITY > 0 ? PAID_STUDENT_CAPACITY : Infinity)
        : (isPremium ? Infinity : FREE_TIER_LIMIT);

    const fetchCount = useCallback(async () => {
        if (!isAuthenticated || !currentSchool?.id) return;

        try {
            setLoading(true);
            const users = await api.getUsers(currentSchool.id);
            // Count only the relevant entity. For students that means student accounts,
            // so the per-student cap is measured against actual students (not all users).
            const relevant = entity === 'students'
                ? (users || []).filter((u: any) => String(u.role || u.dashboard_type || '').toLowerCase().includes('student'))
                : entity === 'teachers'
                ? (users || []).filter((u: any) => String(u.role || u.dashboard_type || '').toLowerCase().includes('teacher'))
                : (users || []);
            setCount(relevant.length);
        } catch (err) {
            console.error('Error fetching tenant usage:', err);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, currentSchool?.id, entity]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchCount();
        }
    }, [isAuthenticated, fetchCount]);

    return {
        currentCount: count,
        maxLimit: MAX_LIMIT,
        // count >= MAX_LIMIT works for every case: Free caps at 10, paid students cap at
        // the paid capacity, and uncapped entities have MAX_LIMIT = Infinity (never hit).
        isLimitReached: count >= MAX_LIMIT,
        isPremium,
        planType,
        loading,
        refreshCount: fetchCount
    };
};

