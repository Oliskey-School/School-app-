/**
 * P0 #8 — payment security.
 *  1. A gateway reference can be recorded ONCE: replaying it must not create
 *     a second Payment row or credit the fee twice (previously unlimited).
 *  2. The amount credited is what the gateway reports, never the client's.
 *  3. Verification persists nothing on its own (previously every verify
 *     created an extra Payment row → double counting).
 *  4. A school admin cannot grant their own school a plan without a verified
 *     payment: POST /schools/:id/subscription is platform-staff only.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';
import { TransactionService } from '../../src/services/transaction.service';

const S = '7d5f1c1e-8888-4888-8888-888888888888', M = 'pay-main';
const PU = 'pay-parent-user', PID = 'pay-parent', SU = 'pay-student-user', SID = 'pay-student', AU = 'pay-admin-user';
const sign = (p: any) => jwt.sign({ school_id: S, branch_id: M, allowed_branch_ids: [M], ...p }, config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });
const parentAuth = { Authorization: `Bearer ${sign({ id: PU, email: 'pay-par@x.com', role: 'PARENT' })}` };
const adminAuth = { Authorization: `Bearer ${sign({ id: AU, email: 'pay-adm@x.com', role: 'ADMIN', is_main_admin: true })}` };
let FEEID = '';

async function cleanup() {
    for (const m of ['payment', 'studentFee', 'parentChild', 'parent', 'student', 'user', 'branch'] as const) {
        await (prisma as any)[m].deleteMany({ where: { school_id: S } }).catch(() => {});
    }
    await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('Payment security', () => {
    beforeAll(async () => {
        await cleanup();
        await prisma.school.create({ data: { id: S, name: 'Pay School', code: 'PAYS', slug: 'pay-school', plan_type: 'free', subscription_status: 'trial' } as any });
        await prisma.branch.create({ data: { id: M, school_id: S, name: 'Main', code: 'PAYM', is_main: true } });
        await prisma.user.create({ data: { id: AU, email: 'pay-adm@x.com', password_hash: 'x', full_name: 'Admin', role: 'ADMIN' as any, school_id: S, branch_id: M } });
        await prisma.user.create({ data: { id: PU, email: 'pay-par@x.com', password_hash: 'x', full_name: 'Parent', role: 'PARENT' as any, school_id: S, branch_id: M } });
        await prisma.parent.create({ data: { id: PID, user_id: PU, school_id: S, branch_id: M, full_name: 'Parent' } });
        await prisma.user.create({ data: { id: SU, email: 'pay-stu@x.com', password_hash: 'x', full_name: 'Child', role: 'STUDENT' as any, school_id: S, branch_id: M } });
        await prisma.student.create({ data: { id: SID, user_id: SU, school_id: S, branch_id: M, full_name: 'Child', grade: 5, school_generated_id: 'PAYS_PAYM_STU_0001' } });
        await prisma.parentChild.create({ data: { parent_id: PID, student_id: SID, school_id: S, branch_id: M } });
        FEEID = (await prisma.studentFee.create({ data: { student_id: SID, school_id: S, branch_id: M, title: 'Term Fee', amount: 50000, due_date: new Date() } as any })).id;
    }, 60000);
    afterAll(async () => { vi.restoreAllMocks(); await cleanup(); }, 60000);

    it('a verified reference is recorded once; a replay is refused and credits nothing', async () => {
        // The gateway says this reference paid ₦20,000 (the client will claim more).
        const spy = vi.spyOn(TransactionService, 'verifyPayment').mockResolvedValue({ reference: 'PAY-REF-1', gateway: 'paystack', amount: 20000, currency: 'NGN', paid_at: null, metadata: null });
        const body = { fee_id: FEEID, student_id: SID, reference: 'PAY-REF-1', gateway: 'paystack', amount: 50000 };

        const first = await request(app).post('/api/parents/me/payments').set(parentAuth).send(body);
        expect(first.status, JSON.stringify(first.body)).toBe(201);
        const replay = await request(app).post('/api/parents/me/payments').set(parentAuth).send(body);
        expect(replay.status, JSON.stringify(replay.body)).toBe(409);

        const rows = await prisma.payment.findMany({ where: { school_id: S, reference: 'PAY-REF-1' } });
        expect(rows.length).toBe(1);
        expect(Number(rows[0].amount)).toBe(20000);          // gateway amount, not the client's 50000
        const fee = await prisma.studentFee.findUnique({ where: { id: FEEID } });
        expect(Number(fee!.paid_amount)).toBe(20000);
        expect(fee!.status).toBe('Partial');
        expect(spy).toHaveBeenCalledTimes(2);
    });

    it('a reference the gateway rejects records nothing', async () => {
        vi.spyOn(TransactionService, 'verifyPayment').mockRejectedValue(Object.assign(new Error('Payment verification failed at gateway'), { status: 402 }));
        const res = await request(app).post('/api/parents/me/payments').set(parentAuth).send({ fee_id: FEEID, student_id: SID, reference: 'PAY-REF-BAD', gateway: 'paystack' });
        expect(res.status).toBe(402);
        expect(await prisma.payment.count({ where: { school_id: S, reference: 'PAY-REF-BAD' } })).toBe(0);
    });

    it('the unverified plan activation endpoint no longer exists and plan status needs a session', async () => {
        const res = await request(app).post('/api/plans/subscribe').set(adminAuth).send({ schoolId: S, amount: 1, reference: 'FAKE', planType: 'enterprise' });
        expect(res.status).toBe(404);
        const school = await prisma.school.findUnique({ where: { id: S } });
        expect(school!.plan_type).toBe('free');
        expect((await request(app).get(`/api/plans/status?schoolId=${S}`)).status).toBe(401);
        const own = await request(app).get('/api/plans/status').set(adminAuth);
        expect(own.status).toBe(200);
    });

    it('a school admin cannot grant their own school a plan without paying', async () => {
        const res = await request(app).post(`/api/schools/${S}/subscription`).set(adminAuth).send({ planType: 'enterprise', subscriptionStatus: 'active', isPremium: true });
        expect(res.status).toBe(403);
        const school = await prisma.school.findUnique({ where: { id: S } });
        expect(school!.plan_type).toBe('free');
        expect(school!.subscription_status).toBe('trial');
    });

    // ── currency ────────────────────────────────────────────────────────────
    // verifyPayment reports the currency the gateway actually collected, and
    // recordPayment used to read only `amount` and drop it. On a gateway
    // account enabled for more than one currency that credits "20000" against
    // a ₦ fee no matter what the 20000 was actually paid in.
    it('a payment collected in a currency the school does not bill in is refused', async () => {
        vi.spyOn(TransactionService, 'verifyPayment').mockResolvedValue({
            reference: 'PAY-REF-USD', gateway: 'paystack', amount: 20000, currency: 'USD', paid_at: null, metadata: null,
        });
        const before = await prisma.studentFee.findUnique({ where: { id: FEEID } });
        const res = await request(app).post('/api/parents/me/payments').set(parentAuth)
            .send({ fee_id: FEEID, student_id: SID, reference: 'PAY-REF-USD', gateway: 'paystack' });

        expect(res.status, JSON.stringify(res.body)).toBe(422);
        expect(await prisma.payment.count({ where: { reference: 'PAY-REF-USD' } })).toBe(0);
        const after = await prisma.studentFee.findUnique({ where: { id: FEEID } });
        expect(Number(after!.paid_amount)).toBe(Number(before!.paid_amount));
    });

    it('the gateway currency is accepted case-insensitively when the deployment bills in it', async () => {
        vi.spyOn(TransactionService, 'verifyPayment').mockResolvedValue({
            reference: 'PAY-REF-NGN-OK', gateway: 'paystack', amount: 100, currency: 'ngn', paid_at: null, metadata: null,
        });
        const res = await request(app).post('/api/parents/me/payments').set(parentAuth)
            .send({ fee_id: FEEID, student_id: SID, reference: 'PAY-REF-NGN-OK', gateway: 'paystack' });
        expect(res.status, JSON.stringify(res.body)).toBe(201);
    });

    // ── cross-tenant replay ─────────────────────────────────────────────────
    // The in-tenant duplicate check runs under RLS, so it cannot see a payment
    // recorded by another school. Because every school verifies against the
    // SAME gateway account, a reference that succeeded for school A is equally
    // valid when presented by school B. Migration 20260924120000 adds the
    // partial unique index that closes this across tenants.
    it('the same gateway reference cannot be recorded again by a different school', async () => {
        const S2 = '7d5f1c1e-9999-4999-8999-999999999999', M2 = 'pay-main-2';
        const PU2 = 'pay-parent-user-2', PID2 = 'pay-parent-2', SU2 = 'pay-student-user-2', SID2 = 'pay-student-2';
        const parent2Auth = {
            Authorization: `Bearer ${jwt.sign(
                { school_id: S2, branch_id: M2, allowed_branch_ids: [M2], id: PU2, email: 'pay-par2@x.com', role: 'PARENT' },
                config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' })}`,
        };
        const cleanup2 = async () => {
            for (const m of ['payment', 'studentFee', 'parentChild', 'parent', 'student', 'user', 'branch'] as const) {
                await (prisma as any)[m].deleteMany({ where: { school_id: S2 } }).catch(() => {});
            }
            await prisma.school.delete({ where: { id: S2 } }).catch(() => {});
        };
        await cleanup2();
        try {
            await prisma.school.create({ data: { id: S2, name: 'Pay School 2', code: 'PAYS2', slug: 'pay-school-2', plan_type: 'free', subscription_status: 'trial' } as any });
            await prisma.branch.create({ data: { id: M2, school_id: S2, name: 'Main', code: 'PAYM2', is_main: true } });
            await prisma.user.create({ data: { id: PU2, email: 'pay-par2@x.com', password_hash: 'x', full_name: 'Parent2', role: 'PARENT' as any, school_id: S2, branch_id: M2 } });
            await prisma.parent.create({ data: { id: PID2, user_id: PU2, school_id: S2, branch_id: M2, full_name: 'Parent2' } });
            await prisma.user.create({ data: { id: SU2, email: 'pay-stu2@x.com', password_hash: 'x', full_name: 'Child2', role: 'STUDENT' as any, school_id: S2, branch_id: M2 } });
            await prisma.student.create({ data: { id: SID2, user_id: SU2, school_id: S2, branch_id: M2, full_name: 'Child2', grade: 5, school_generated_id: 'PAYS2_PAYM2_STU_0001' } });
            await prisma.parentChild.create({ data: { parent_id: PID2, student_id: SID2, school_id: S2, branch_id: M2 } });
            const FEE2 = (await prisma.studentFee.create({ data: { student_id: SID2, school_id: S2, branch_id: M2, title: 'Term Fee', amount: 50000, due_date: new Date() } as any })).id;

            // PAY-REF-1 was already banked by school S in the first test.
            vi.spyOn(TransactionService, 'verifyPayment').mockResolvedValue({
                reference: 'PAY-REF-1', gateway: 'paystack', amount: 20000, currency: 'NGN', paid_at: null, metadata: null,
            });
            const res = await request(app).post('/api/parents/me/payments').set(parent2Auth)
                .send({ fee_id: FEE2, student_id: SID2, reference: 'PAY-REF-1', gateway: 'paystack' });

            expect(res.status, `cross-school replay must be refused, got ${res.status} ${JSON.stringify(res.body)}`).toBe(409);
            expect(await prisma.payment.count({ where: { school_id: S2, reference: 'PAY-REF-1' } })).toBe(0);
            const fee2 = await prisma.studentFee.findUnique({ where: { id: FEE2 } });
            expect(Number(fee2!.paid_amount || 0)).toBe(0);
        } finally {
            await cleanup2();
        }
    });
});
