import { supabase } from './supabase';
import { SAAS_PRICING } from '../types-saas';

/**
 * Checks if a school has reached its free user limit (3 users).
 * Users include Teachers, Parents, and Students (basically all profiles).
 */
export async function checkUserLimit(schoolId: string): Promise<{ allowed: boolean, count: number, limit: number }> {
    // 1. Check if school has paid the setup fee
    const { data: school, error: schoolError } = await supabase
        .from('schools')
        .select('setup_paid')
        .eq('id', schoolId)
        .single();

    if (schoolError) {
        console.error("Error checking school payment status:", schoolError);
        return { allowed: false, count: 0, limit: SAAS_PRICING.FREE_USER_LIMIT };
    }

    if (school?.setup_paid) {
        return { allowed: true, count: 0, limit: Infinity };
    }

    // 2. Count total users (profiles) for this school
    // Note: We might want to exclude the school admin themselves, 
    // but usually, the limit applies to everyone else.
    const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .neq('role', 'admin'); // Exclude the main admin who created the portal

    if (error) {
        console.error("Error counting users:", error);
        return { allowed: false, count: 0, limit: SAAS_PRICING.FREE_USER_LIMIT };
    }

    const currentCount = count || 0;
    const allowed = currentCount < SAAS_PRICING.FREE_USER_LIMIT;

    return {
        allowed,
        count: currentCount,
        limit: SAAS_PRICING.FREE_USER_LIMIT
    };
}
