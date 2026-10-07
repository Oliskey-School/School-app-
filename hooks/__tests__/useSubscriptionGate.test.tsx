import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSubscriptionGate } from '../useSubscriptionGate';

/**
 * The demo is a shop window: AI works in it on any plan, matching the server
 * gate. Real schools still need Advanced (or a self-paid term) for AI.
 */
const { auth } = vi.hoisted(() => ({
    auth: { isDemo: true, currentSchool: { id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1', plan_type: 'basic', subscription_status: 'active' } as any, user: { id: 'u1' } as any },
}));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));

describe('useSubscriptionGate', () => {
    beforeEach(() => {
        auth.isDemo = true;
        auth.user = { id: 'u1' };
        sessionStorage.removeItem('is_demo_mode');
    });

    it('demo: AI works on Basic', () => {
        auth.currentSchool = { ...auth.currentSchool, plan_type: 'basic' };
        const { result } = renderHook(() => useSubscriptionGate());
        expect(result.current.plan).toBe('basic');
        expect(result.current.isAIAllowed).toBe(true);
        expect(result.current.isLocked).toBe(false);
    });

    it('real school: Basic locks AI', () => {
        auth.isDemo = false;
        auth.currentSchool = { id: 'real-school', plan_type: 'basic', subscription_status: 'active' };
        const { result } = renderHook(() => useSubscriptionGate());
        expect(result.current.isAIAllowed).toBe(false);
    });

    it('real school: Advanced unlocks AI', () => {
        auth.isDemo = false;
        auth.currentSchool = { id: 'real-school', plan_type: 'advanced', subscription_status: 'active' };
        const { result } = renderHook(() => useSubscriptionGate());
        expect(result.current.isAIAllowed).toBe(true);
    });

    it('real school: Free keeps everything but AI open', () => {
        auth.isDemo = false;
        auth.currentSchool = { id: 'real-school', plan_type: 'free', subscription_status: 'free' };
        const { result } = renderHook(() => useSubscriptionGate());
        expect(result.current.isFree).toBe(true);
        expect(result.current.isAIAllowed).toBe(false);
        expect(result.current.isLocked).toBe(false);
    });
});
