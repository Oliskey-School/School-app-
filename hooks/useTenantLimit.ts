import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

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
    const { session, currentSchool } = useAuth();
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const FREE_TIER_LIMIT = 10;
    const OLISKEY_DEMO_SCHOOL_ID = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
    const isPremium = currentSchool?.is_premium || currentSchool?.id === OLISKEY_DEMO_SCHOOL_ID;
    const planType = currentSchool?.id === OLISKEY_DEMO_SCHOOL_ID ? 'premium' : (currentSchool?.plan_type || 'free');

    // Limits based on plan (can be expanded)
    const MAX_LIMIT = isPremium ? Infinity : FREE_TIER_LIMIT;

    const fetchCount = async () => {
        if (!currentSchool?.id) return;

        try {
            // If premium, strictly speaking we might not need count, 
            // but good to show usage anyway.

            // We use the 'users' table count for the strict 10-user limit 
            // as defined in the requirement.
            // If entity is specific (e.g. 'students'), we could count just those,
            // but the prompt said "check the current count for that tenant_id" implying total users.
            // Let's stick to total users for the guardrail.

            let query = supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq('school_id', currentSchool.id);

            const { count: userCount, error } = await query;

            if (error) throw error;
            setCount(userCount || 0);

        } catch (err) {
            console.error('Error fetching tenant usage:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session) {
            fetchCount();
        }
    }, [session, currentSchool?.id]);

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
