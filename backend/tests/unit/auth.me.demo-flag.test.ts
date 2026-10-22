/**
 * Regression: a page reload re-derives "demo session" from GET /api/auth/me.
 * The token user did not always carry is_demo, so the client switched demo mode
 * off and locked AI. Users of the demo school must always come back is_demo.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/config/env', () => ({ DEMO_SCHOOL_ID: 'demo-school' }));
vi.mock('../../src/config/database', () => ({
    default: { user: { findUnique: vi.fn().mockResolvedValue({ preferred_language: null, two_factor_enabled: false, ui_preferences: null }) } },
}));
vi.mock('../../src/services/auth.service', () => ({ AuthService: {} }));
vi.mock('../../src/services/branchIdentity.service', () => ({ BranchIdentityService: {} }));
vi.mock('../../src/middleware/csrf.middleware', () => ({ generateToken: vi.fn() }));
vi.mock('../../src/services/avatarRepair.service', () => ({ AvatarRepairService: {} }));
vi.mock('../../src/utils/httpError', () => ({ sendError: vi.fn() }));

import { getMe } from '../../src/controllers/auth.controller';

const call = async (user: any) => {
    let body: any;
    const res: any = { json: (b: any) => { body = b; return res; }, status: () => res };
    await getMe({ user } as any, res);
    return body;
};

describe('GET /auth/me demo flag', () => {
    it('marks a demo-school user as demo even without is_demo on the token', async () => {
        expect((await call({ id: 'u1', school_id: 'demo-school' })).is_demo).toBe(true);
    });
    it('keeps an explicit is_demo', async () => {
        expect((await call({ id: 'u2', school_id: 'x', is_demo: true })).is_demo).toBe(true);
    });
    it('real school users are not demo', async () => {
        expect((await call({ id: 'u3', school_id: 'real-school' })).is_demo).toBe(false);
    });
});
