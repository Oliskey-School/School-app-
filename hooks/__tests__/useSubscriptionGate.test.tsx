import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useSubscriptionGate } from '../useSubscriptionGate';

/**
 * The demo school follows its real plan — it is no longer forced to Advanced.
 * Basic locks AI (so the visitor sees the upgrade prompt), Advanced unlocks it.
 */
const { auth } = vi.hoisted(() => ({
    auth: { isDemo: true, currentSchool: { id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1', plan_type: 'basic', subscription_status: 'active' } as any, user: { id: 'u1' } },
}));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));

describe('useSubscriptionGate — demo follows its plan', () => {
    it('locks AI on Basic', () => {
        auth.currentSchool = { ...auth.currentSchool, plan_type: 'basic' };
        const { result } = renderHook(() => useSubscriptionGate());
        expect(result.current.plan).toBe('basic');
        expect(result.current.isAIAllowed).toBe(false);
        expect(result.current.isLocked).toBe(false);
    });

    it('unlocks AI on Advanced', () => {
        auth.currentSchool = { ...auth.currentSchool, plan_type: 'advanced' };
        const { result } = renderHook(() => useSubscriptionGate());
        expect(result.current.plan).toBe('advanced');
        expect(result.current.isAIAllowed).toBe(true);
    });

    it('Free keeps everything but AI open', () => {
        auth.currentSchool = { ...auth.currentSchool, plan_type: 'free', subscription_status: 'free' };
        const { result } = renderHook(() => useSubscriptionGate());
        expect(result.current.isFree).toBe(true);
        expect(result.current.isAIAllowed).toBe(false);
        expect(result.current.isLocked).toBe(false);
    });
});
