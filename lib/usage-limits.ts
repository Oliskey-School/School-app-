import { api } from './api';
import { SAAS_PRICING } from '../types-saas';

/**
 * Checks if a school has reached its free user limit (3 users).
 * Users include Teachers, Parents, and Students (basically all profiles).
 */
export async function checkUserLimit(schoolId: string): Promise<{ allowed: boolean, count: number, limit: number }> {
    // Disable limitations temporarily as requested
    try {
        const currentCount = await api.getUserCount(schoolId, { neqRole: 'admin' });
        return {
            allowed: true, // Always allowed for now
            count: currentCount,
            limit: 10000 // High temporary limit
        };
    } catch (error) {
        return { allowed: true, count: 0, limit: 10000 };
    }
}

