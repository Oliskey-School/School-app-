/**
 * DEMO PRICING + REAL PAYMENT ACTIVATION (real database).
 *
 * Covers the "Choose Your Plan" behaviour for the shared demo school and the
 * live Paystack path:
 *   1. The academic calendar always covers today, so paid activation is never
 *      blocked by "No active academic term configured" once the seeded
 *      2025/2026 session has ended.
 *   2. The demo school can activate any plan with a DEMO-* reference and no
 *      Paystack call (fake money); a live school sending the same reference is
 *      rejected.
 *   3. AI gating follows the demo school's real plan_type — Basic locks AI,
 *      Advanced unlocks it.
 *   4. A live school activates through a (mocked) Paystack verification and
 *      the paid amount is checked against the quote.
 *   5. The demo baseline restores the plan to Basic.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';
import { getCurrentTerm, ensureAcademicCalendarCoversDate } from '../../src/services/term.service';
import { requireAIAllowed } from '../../src/middleware/aiGate.middleware';
import { DEMO_PLAN_BASELINE, restoreDemoPlanBaseline } from '../../src/services/demoSeeder.service';

const DEMO = config.demoSchoolId;
const LIVE = 'subdemo-live-school';
const LIVE_ADMIN = 'subdemo-live-admin';
const DEMO_ADMIN = 'subdemo-demo-admin';

const tok = (id: string, schoolId: string) => jwt.sign(
    { id, email: `${id}@x.com`, role: 'ADMIN', school_id: schoolId, branch_id: null, allowed_branch_ids: [] },
    config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });

let demoSnapshot: { plan_type: string | null; subscription_status: string | null; student_count: number | null } | null = null;
const realFetch = globalThis.fetch;

async function cleanupLive() {
    await prisma.user.deleteMany({ where: { school_id: LIVE } }).catch(() => {});
    await prisma.school.delete({ where: { id: LIVE } }).catch(() => {});
}

describe('Demo pricing + real payment activation', () => {
    beforeAll(async () => {
        await cleanupLive();
        await prisma.school.create({ data: { id: LIVE, name: 'SubDemo Live', code: 'SUBDEMO', slug: LIVE, plan_type: 'free', subscription_status: 'free' } });
        await prisma.user.create({ data: { id: LIVE_ADMIN, email: 'subdemo-live-admin@x.com', password_hash: 'x', full_name: 'Live Admin', role: 'ADMIN' as any, school_id: LIVE } });

        const demo = await prisma.school.findUnique({ where: { id: DEMO }, select: { plan_type: true, subscription_status: true, student_count: true } });
        expect(demo, 'demo school must exist (run the server once to seed it)').toBeTruthy();
        demoSnapshot = demo;
        await prisma.user.upsert({
            where: { id: DEMO_ADMIN },
            update: {},
            create: { id: DEMO_ADMIN, email: 'subdemo-demo-admin@demo.com', password_hash: 'x', full_name: 'Demo Admin', role: 'ADMIN' as any, school_id: DEMO },
        });
        await ensureAcademicCalendarCoversDate(new Date());
    }, 60000);

    afterEach(() => { globalThis.fetch = realFetch; });

    afterAll(async () => {
        if (demoSnapshot) await prisma.school.update({ where: { id: DEMO }, data: demoSnapshot }).catch(() => {});
        await prisma.user.delete({ where: { id: DEMO_ADMIN } }).catch(() => {});
        await cleanupLive();
    });

    // ── 1. Calendar coverage ────────────────────────────────────────────────
    it('academic calendar covers today so a term is always resolvable', async () => {
        const term = await getCurrentTerm(new Date());
        expect(term).not.toBeNull();
        expect([1, 2, 3]).toContain(term!.term);
    });

    it('extends the calendar for a future date instead of returning null', async () => {
        const future = new Date(); future.setFullYear(future.getFullYear() + 2);
        await ensureAcademicCalendarCoversDate(future);
        const term = await getCurrentTerm(future);
        expect(term).not.toBeNull();
        // Terms of a generated session must not overlap the seeded ones
        const rows = await prisma.academicCalendar.findMany({ where: { session: term!.session } });
        expect(rows.length).toBe(3);
    });

    // ── 2. Demo activation with fake money ──────────────────────────────────
    it('demo school activates Advanced with a DEMO reference and no Paystack call', async () => {
        globalThis.fetch = vi.fn(async () => { throw new Error('Paystack must not be called for demo'); }) as any;
        const res = await request(app).post('/api/subscription/activate')
            .set('Authorization', `Bearer ${tok(DEMO_ADMIN, DEMO)}`)
            .send({ plan_type: 'advanced', student_count: 250, reference: `DEMO-${Date.now()}` });
        expect(res.status, JSON.stringify(res.body)).toBe(200);
        expect(res.body.school.plan_type).toBe('advanced');
        expect(res.body.school.subscription_status).toBe('active');
        expect(res.body.school.student_count).toBe(250);
        expect(res.body.amount_paid).toBe(0);
    });

    it('demo school can downgrade back to Basic and to Free', async () => {
        let res = await request(app).post('/api/subscription/activate')
            .set('Authorization', `Bearer ${tok(DEMO_ADMIN, DEMO)}`)
            .send({ plan_type: 'basic', student_count: 3, reference: `DEMO-${Date.now()}` });
        expect(res.status, JSON.stringify(res.body)).toBe(200);
        expect(res.body.school.plan_type).toBe('basic');

        res = await request(app).post('/api/subscription/activate')
            .set('Authorization', `Bearer ${tok(DEMO_ADMIN, DEMO)}`)
            .send({ plan_type: 'free', student_count: 3, reference: 'FREE' });
        expect(res.status, JSON.stringify(res.body)).toBe(200);
        expect(res.body.school.plan_type).toBe('free');
    });

    it('a LIVE school cannot activate a paid plan with a DEMO reference', async () => {
        globalThis.fetch = vi.fn(async () => { throw new Error('network down'); }) as any;
        const res = await request(app).post('/api/subscription/activate')
            .set('Authorization', `Bearer ${tok(LIVE_ADMIN, LIVE)}`)
            .send({ plan_type: 'advanced', student_count: 10, reference: `DEMO-${Date.now()}` });
        expect(res.status).not.toBe(200);
        const live = await prisma.school.findUnique({ where: { id: LIVE }, select: { plan_type: true } });
        expect(live!.plan_type).toBe('free');
    });

    // ── 3. AI gate follows the demo plan ────────────────────────────────────
    const runGate = async (schoolId: string, userId: string) => {
        const req: any = { user: { id: userId, school_id: schoolId } };
        let status = 0; let nexted = false;
        const res: any = { status: (s: number) => { status = s; return { json: () => undefined }; } };
        await requireAIAllowed(req, res, () => { nexted = true; });
        return { status, nexted };
    };

    it('AI is locked for the demo school on Basic and unlocked on Advanced', async () => {
        await prisma.school.update({ where: { id: DEMO }, data: { plan_type: 'basic', subscription_status: 'active' } });
        expect(await runGate(DEMO, DEMO_ADMIN)).toEqual({ status: 403, nexted: false });

        await prisma.school.update({ where: { id: DEMO }, data: { plan_type: 'advanced', subscription_status: 'active' } });
        expect(await runGate(DEMO, DEMO_ADMIN)).toEqual({ status: 0, nexted: true });
    });

    // ── 4. Live Paystack path (verification mocked) ─────────────────────────
    it('live school activates Basic after Paystack verifies the paid amount', async () => {
        const students = 12;
        const expectedNaira = 1000 * students;
        const calls: string[] = [];
        globalThis.fetch = vi.fn(async (url: any) => {
            calls.push(String(url));
            return {
                json: async () => ({
                    status: true, message: 'Verification successful',
                    data: { status: 'success', amount: expectedNaira * 100, reference: 'PSK_OK', authorization: { authorization_code: 'AUTH_x' }, customer: { customer_code: 'CUS_x' } },
                }),
            };
        }) as any;
        const prevSecret = process.env.PAYSTACK_SECRET_KEY;
        process.env.PAYSTACK_SECRET_KEY = prevSecret || 'sk_test_dummy';
        try {
            const res = await request(app).post('/api/subscription/activate')
                .set('Authorization', `Bearer ${tok(LIVE_ADMIN, LIVE)}`)
                .send({ plan_type: 'basic', student_count: students, reference: 'PSK_OK' });
            expect(res.status, JSON.stringify(res.body)).toBe(200);
            expect(res.body.school.plan_type).toBe('basic');
            expect(res.body.amount_paid).toBe(expectedNaira);
            expect(calls.some(u => u.includes('/transaction/verify/PSK_OK'))).toBe(true);
        } finally {
            if (prevSecret === undefined) delete process.env.PAYSTACK_SECRET_KEY; else process.env.PAYSTACK_SECRET_KEY = prevSecret;
        }
    });

    it('live school is rejected when Paystack reports an underpayment', async () => {
        globalThis.fetch = vi.fn(async () => ({
            json: async () => ({ status: true, data: { status: 'success', amount: 500 * 100 } }),
        })) as any;
        const prevSecret = process.env.PAYSTACK_SECRET_KEY;
        process.env.PAYSTACK_SECRET_KEY = prevSecret || 'sk_test_dummy';
        try {
            const res = await request(app).post('/api/subscription/activate')
                .set('Authorization', `Bearer ${tok(LIVE_ADMIN, LIVE)}`)
                .send({ plan_type: 'advanced', student_count: 12, reference: 'PSK_LOW' });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/less than required/i);
        } finally {
            if (prevSecret === undefined) delete process.env.PAYSTACK_SECRET_KEY; else process.env.PAYSTACK_SECRET_KEY = prevSecret;
        }
    });

    // ── 5. Demo baseline ────────────────────────────────────────────────────
    it('restoreDemoPlanBaseline puts the demo school back on Basic', async () => {
        await prisma.school.update({ where: { id: DEMO }, data: { plan_type: 'advanced', subscription_status: 'active' } });
        await restoreDemoPlanBaseline();
        const demo = await prisma.school.findUnique({ where: { id: DEMO }, select: { plan_type: true, subscription_status: true } });
        expect(demo).toEqual(DEMO_PLAN_BASELINE);
        expect(DEMO_PLAN_BASELINE.plan_type).toBe('basic');
    });
});
