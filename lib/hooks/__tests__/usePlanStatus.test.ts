import { describe, it, expect } from 'vitest';
import { calcTermFields } from '../usePlanStatus';

/** Live schools: Term 1 is free, payment starts from Term 2. */
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
const freePlan = { plan_type: 'free', subscription_status: 'free' };

describe('calcTermFields — free period is Term 1 only', () => {
    it('Term 1 (first 150 days) is free', () => {
        const f = calcTermFields({ created_at: daysAgo(10) }, null, freePlan);
        expect(f.current_term).toBe(1);
        expect(f.is_term1_free).toBe(true);
    });

    it('Term 2 requires payment', () => {
        const f = calcTermFields({ created_at: daysAgo(160) }, null, freePlan);
        expect(f.current_term).toBe(2);
        expect(f.is_term1_free).toBe(false);
    });

    it('Term 3 requires payment', () => {
        const f = calcTermFields({ created_at: daysAgo(320) }, null, freePlan);
        expect(f.current_term).toBe(3);
        expect(f.is_term1_free).toBe(false);
    });

    it('an unpaid school in Term 2 is warned 30 days out and locked once the term closes', () => {
        const soon = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString();
        const warn = calcTermFields({ created_at: daysAgo(160) }, { closing_date: soon }, freePlan);
        expect(warn.days_until_exam_block).toBe(20);
        expect(warn.exam_block_active).toBe(false);

        const locked = calcTermFields({ created_at: daysAgo(160) }, { closing_date: daysAgo(1) }, freePlan);
        expect(locked.exam_block_active).toBe(true);
        expect(locked.app_locked).toBe(true);
    });

    it('a paid Basic school in Term 2 is never locked', () => {
        const f = calcTermFields({ created_at: daysAgo(160) }, { closing_date: daysAgo(1) }, { plan_type: 'basic', subscription_status: 'active' });
        expect(f.exam_block_active).toBe(false);
        expect(f.app_locked).toBe(false);
    });
});
