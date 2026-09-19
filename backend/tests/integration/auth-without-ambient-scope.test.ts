/**
 * P0 #4 follow-up — a real (non-demo) user's request must authenticate when
 * the process has NO ambient scope, exactly as in production.
 *
 * The vitest setup file puts the whole test process in platform scope so
 * fixtures can be created; that hid this: the auth middleware resolved the
 * token's user with no scope → RLS applied with an empty school → no row →
 * 401 "User no longer exists" for every signed-in user. Reproduced against a
 * locally running server before the fix.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';
import { runWithTenantContext } from '../../src/lib/tenantContext';

const S = '7d5f1c1e-9999-4999-8999-999999999999', B = 'nas-main', ADMIN = 'nas-admin';
const token = jwt.sign({ id: ADMIN, email: 'nas@x.com', role: 'ADMIN', school_id: S, branch_id: B, allowed_branch_ids: [B] }, config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });

async function cleanup() {
    await prisma.user.deleteMany({ where: { school_id: S } }).catch(() => {});
    await prisma.branch.deleteMany({ where: { school_id: S } }).catch(() => {});
    await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('authentication without an ambient scope', () => {
    beforeAll(async () => {
        await cleanup();
        await prisma.school.create({ data: { id: S, name: 'NAS', code: 'NAS', slug: 'nas-school', plan_type: 'premium', subscription_status: 'active' } as any });
        await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'NASMAIN', is_main: true } as any });
        await prisma.user.create({ data: { id: ADMIN, email: 'nas@x.com', password_hash: 'x', full_name: 'Admin', role: 'ADMIN' as any, school_id: S, branch_id: B } as any });
    }, 60000);
    afterAll(cleanup, 60000);

    it('a signed-in admin is recognised and sees their own school (no platform scope around the request)', async () => {
        // Drop the test process's ambient platform scope for this request only.
        const res = await runWithTenantContext({ schoolId: null }, () =>
            request(app).get('/api/teachers').set('Authorization', `Bearer ${token}`));
        expect(res.status, JSON.stringify(res.body).slice(0, 200)).toBe(200);
    });

    it('a token for a user that does not exist is still rejected', async () => {
        const ghost = jwt.sign({ id: 'nas-ghost', email: 'ghost@x.com', role: 'ADMIN', school_id: S }, config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });
        const res = await runWithTenantContext({ schoolId: null }, () =>
            request(app).get('/api/teachers').set('Authorization', `Bearer ${ghost}`));
        expect(res.status).toBe(401);
    });
});
