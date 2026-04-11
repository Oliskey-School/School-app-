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

    // Limits based on plan (can be expanded)
    const MAX_LIMIT = isPremium ? Infinity : FREE_TIER_LIMIT;

    const fetchCount = useCallback(async () => {
        if (!isAuthenticated || !currentSchool?.id) return;

        try {
            setLoading(true);
            // Fetch users from the backend API
            const users = await api.getUsers(currentSchool.id);
            setCount(users?.length || 0);
        } catch (err) {
            console.error('Error fetching tenant usage:', err);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, currentSchool?.id]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchCount();
        }
    }, [isAuthenticated, fetchCount]);

    return {
        currentCount: count,
        maxLimit: MAX_LIMIT,
        isLimitReached: !isPremium && count >= MAX_LIMIT,
        isPremium,
        planType,
        loading,
        refreshCount: fetchCount
    };
};

