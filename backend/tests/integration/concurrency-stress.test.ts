/**
 * Concurrency: the failure modes that only appear under real parallel load.
 *
 * Targets the problems that actually bit this codebase before:
 *   - P2028 "Transaction already closed" / "Unable to start a transaction in
 *     the given time" when many multi-statement writes run at once;
 *   - a payment reference recorded twice when two requests race;
 *   - lost updates when several writers touch the same row;
 *   - connection-pool exhaustion under a burst of dashboard reads.
 *
 * Every assertion is about the OUTCOME (row counts, final values, absence of
 * P2028), never about how long something took, so it cannot be "fixed" by
 * raising a timeout.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';
import { runAsPlatform, runWithTenantContext } from '../../src/lib/tenantContext';
import { TransactionService } from '../../src/services/transaction.service';

const S = 'con-school', B = 'con-branch';
const ADMIN = 'con-admin', PARENT_U = 'con-parent-u', STUDENT_U = 'con-student-u';
const ids: Record<string, string> = {};

const t = (p: any) => jwt.sign(p, config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });
const adminAuth = () => ({ Authorization: `Bearer ${t({ id: ADMIN, email: 'con-admin@x.com', role: 'ADMIN', school_id: S, branch_id: B, allowed_branch_ids: [B] })}` });
const parentAuth = () => ({ Authorization: `Bearer ${t({ id: PARENT_U, email: 'con-par@x.com', role: 'PARENT', school_id: S, branch_id: B, allowed_branch_ids: [B] })}` });

/** Any P2028 / transaction-closed / pool-timeout error is a hard failure. */
function assertNoTransactionFailure(errors: unknown[], label: string) {
    const fatal = errors
        .map(e => (e as any)?.message ?? String(e))
        .filter(m => /P2028|Transaction already closed|Unable to start a transaction|Timed out fetching a new connection|connection pool/i.test(m));
    expect(fatal, `${label}: transaction/pool failures under concurrency:\n${fatal.slice(0, 5).join('\n')}`).toEqual([]);
}

async function wipe() {
    await runAsPlatform(async () => {
        for (const m of ['payment', 'studentFee', 'attendance', 'parentChild', 'parent', 'student', 'class', 'user', 'branch'] as const) {
            await (prisma as any)[m].deleteMany({ where: { school_id: S } }).catch(() => {});
        }
        await prisma.school.delete({ where: { id: S } }).catch(() => {});
    });
}

describe('Concurrency and transaction integrity', () => {
    beforeAll(async () => {
        await wipe();
        await runAsPlatform(async () => {
            await prisma.school.create({ data: { id: S, name: 'Con School', code: 'CONS', slug: 'con-school', plan_type: 'premium', subscription_status: 'active' } as any });
            await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'CONM', is_main: true } as any });
            await prisma.user.create({ data: { id: ADMIN, email: 'con-admin@x.com', password_hash: 'x', full_name: 'Admin', role: 'ADMIN' as any, school_id: S, branch_id: B } as any });
            await prisma.user.create({ data: { id: PARENT_U, email: 'con-par@x.com', password_hash: 'x', full_name: 'Parent', role: 'PARENT' as any, school_id: S, branch_id: B } as any });
            await prisma.user.create({ data: { id: STUDENT_U, email: 'con-stu@x.com', password_hash: 'x', full_name: 'Child', role: 'STUDENT' as any, school_id: S, branch_id: B } as any });
            ids.student = (await prisma.student.create({ data: { user_id: STUDENT_U, school_id: S, branch_id: B, full_name: 'Child', grade: 7, section: 'A', school_generated_id: 'CONS_CONM_STU_0001' } as any })).id;
            ids.parent = (await prisma.parent.create({ data: { user_id: PARENT_U, school_id: S, branch_id: B, full_name: 'Parent' } as any })).id;
            await prisma.parentChild.create({ data: { parent_id: ids.parent, student_id: ids.student, school_id: S, branch_id: B } as any });
            ids.class = (await prisma.class.create({ data: { school_id: S, branch_id: B, name: 'JSS 1', grade: 7, section: 'A' } as any })).id;
        });
    }, 180000);
    afterAll(async () => { vi.restoreAllMocks(); await wipe(); }, 180000);

    it('30 concurrent multi-statement transactions complete without P2028 or a lost write', async () => {
        const errors: unknown[] = [];
        await Promise.all(Array.from({ length: 30 }, (_, i) =>
            runWithTenantContext({ schoolId: S, branchId: B, allowedBranchIds: [B] }, () =>
                prisma.$transaction(async (tx) => {
                    const fee = await tx.studentFee.create({ data: { school_id: S, branch_id: B, student_id: ids.student, title: `burst-${i}`, amount: 100, due_date: new Date() } as any });
                    await tx.studentFee.update({ where: { id: fee.id }, data: { paid_amount: 10 } });
                    await tx.studentFee.count({ where: { school_id: S } });
                })
            ).catch(e => errors.push(e))
        ));
        assertNoTransactionFailure(errors, '30 concurrent transactions');
        expect(errors, `unexpected errors: ${errors.slice(0, 3).map(e => (e as any)?.message).join(' | ')}`).toEqual([]);
        const created = await runAsPlatform(() => prisma.studentFee.count({ where: { school_id: S, title: { startsWith: 'burst-' } } }));
        expect(created, 'writes were lost under concurrency').toBe(30);
        await runAsPlatform(() => prisma.studentFee.deleteMany({ where: { school_id: S, title: { startsWith: 'burst-' } } }));
    }, 180000);

    it('a rolled-back transaction under load leaves nothing behind', async () => {
        const errors: unknown[] = [];
        await Promise.all(Array.from({ length: 15 }, (_, i) =>
            runWithTenantContext({ schoolId: S, branchId: B, allowedBranchIds: [B] }, () =>
                prisma.$transaction(async (tx) => {
                    await tx.studentFee.create({ data: { school_id: S, branch_id: B, student_id: ids.student, title: `rollback-${i}`, amount: 1, due_date: new Date() } as any });
                    throw new Error('deliberate rollback');
                })
            ).catch(e => errors.push(e))
        ));
        assertNoTransactionFailure(errors, 'concurrent rollbacks');
        const left = await runAsPlatform(() => prisma.studentFee.count({ where: { school_id: S, title: { startsWith: 'rollback-' } } }));
        expect(left, 'rolled-back rows were persisted').toBe(0);
    }, 180000);

    it('the SAME payment reference submitted 8 times in parallel is recorded exactly once', async () => {
        const fee = await runAsPlatform(() => prisma.studentFee.create({ data: { school_id: S, branch_id: B, student_id: ids.student, title: 'Race Fee', amount: 100000, due_date: new Date() } as any }));
        vi.spyOn(TransactionService, 'verifyPayment').mockResolvedValue({ reference: 'RACE-REF-1', gateway: 'paystack', amount: 25000, currency: 'NGN', paid_at: null, metadata: null });

        const results = await Promise.all(Array.from({ length: 8 }, () =>
            request(app).post('/api/parents/me/payments').set(parentAuth())
                .send({ fee_id: fee.id, student_id: ids.student, reference: 'RACE-REF-1', gateway: 'paystack', amount: 25000 })
                .then(r => r.status).catch(() => 0)
        ));

        const rows = await runAsPlatform(() => prisma.payment.findMany({ where: { school_id: S, reference: 'RACE-REF-1' } }));
        const stored = await runAsPlatform(() => prisma.studentFee.findUnique({ where: { id: fee.id } }));
        expect(rows.length, `the reference was recorded ${rows.length} times (statuses: ${results.join(',')})`).toBe(1);
        expect(Number(stored?.paid_amount), 'the fee was credited more than once for one payment').toBe(25000);
        expect(results.filter(s => s === 201).length, 'more than one request was told the payment succeeded').toBe(1);
        await runAsPlatform(async () => {
            await prisma.payment.deleteMany({ where: { school_id: S, reference: 'RACE-REF-1' } });
            await prisma.studentFee.delete({ where: { id: fee.id } }).catch(() => {});
        });
    }, 180000);

    it('concurrent updates to ONE row do not lose the last write', async () => {
        const fee = await runAsPlatform(() => prisma.studentFee.create({ data: { school_id: S, branch_id: B, student_id: ids.student, title: 'Lost Update', amount: 100, due_date: new Date() } as any }));
        const errors: unknown[] = [];
        await Promise.all(Array.from({ length: 12 }, (_, i) =>
            runWithTenantContext({ schoolId: S, branchId: B, allowedBranchIds: [B] }, () =>
                prisma.studentFee.update({ where: { id: fee.id }, data: { title: `writer-${i}` } })
            ).catch(e => errors.push(e))
        ));
        assertNoTransactionFailure(errors, 'concurrent single-row updates');
        const after = await runAsPlatform(() => prisma.studentFee.findUnique({ where: { id: fee.id } }));
        expect(after?.title, 'the row was left in a pre-update state').toMatch(/^writer-\d+$/);
        await runAsPlatform(() => prisma.studentFee.delete({ where: { id: fee.id } }).catch(() => {}));
    }, 180000);

    it('a burst of 25 dashboard requests does not exhaust the connection pool', async () => {
        const responses = await Promise.all(Array.from({ length: 25 }, () =>
            request(app).get('/api/dashboard/stats').set(adminAuth()).then(r => ({ status: r.status, body: JSON.stringify(r.body).slice(0, 200) })).catch(e => ({ status: 0, body: String(e) }))
        ));
        const bad = responses.filter(r => r.status !== 200);
        assertNoTransactionFailure(bad.map(b => new Error(b.body)), 'dashboard burst');
        expect(bad.length, `non-200 dashboard responses under load: ${bad.slice(0, 3).map(b => b.status + ' ' + b.body).join(' | ')}`).toBe(0);
    }, 180000);

    it('concurrent attendance writes for the same class/date do not create duplicates', async () => {
        const date = new Date('2026-05-04T00:00:00.000Z');
        const errors: unknown[] = [];
        await Promise.all(Array.from({ length: 10 }, () =>
            runWithTenantContext({ schoolId: S, branchId: B, allowedBranchIds: [B] }, () =>
                prisma.attendance.upsert({
                    where: { student_id_class_id_date: { student_id: ids.student, class_id: ids.class, date } } as any,
                    create: { school_id: S, branch_id: B, student_id: ids.student, class_id: ids.class, date, status: 'Present' } as any,
                    update: { status: 'Present' },
                })
            ).catch(e => errors.push(e))
        ));
        assertNoTransactionFailure(errors, 'concurrent attendance upserts');
        const rows = await runAsPlatform(() => prisma.attendance.count({ where: { school_id: S, student_id: ids.student, date } }));
        expect(rows, `attendance duplicated under concurrency (${rows} rows for one student/date)`).toBeLessThanOrEqual(1);
    }, 180000);
});
