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
    const subscriptionStatus = (currentSchool as any)?.subscription_status;
    const isOnTrial = subscriptionStatus === 'trial';
    const isPremium = currentSchool?.is_premium || currentSchool?.id === OLISKEY_DEMO_SCHOOL_ID;
    const planType = currentSchool?.id === OLISKEY_DEMO_SCHOOL_ID ? 'premium' : (currentSchool?.plan_type || 'free');

    // Schools on free trial have unlimited access — no seat caps, no upgrade prompts.
    // Paid plans (basic/advanced) are billed PER STUDENT, so the student cap is exactly
    // what the school PAID for (school.student_count). Free tier caps at 10.
    const PAID_STUDENT_CAPACITY = (currentSchool as any)?.student_count || 0;
    const MAX_LIMIT = isOnTrial
        ? Infinity
        : (entity === 'students' && isPremium)
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
        isLimitReached: !isOnTrial && count >= MAX_LIMIT,
        isPremium,
        planType,
        loading,
        refreshCount: fetchCount
    };
};

