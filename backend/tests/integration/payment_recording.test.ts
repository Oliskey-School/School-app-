/**
 * PAYMENT RECORDING + HEALTH INCIDENT TIME (real database).
 *
 * Regression tests for two bugs found during the full admin dashboard audit:
 *   1. Recording a payroll payment 404'd — POST /payment-transactions and
 *      PUT /payslips/:id had no backend route at all.
 *   2. Saving a health incident with a time set threw a Prisma validation
 *      error — incident_time was spread straight into a model that has no
 *      such column.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';

const S = 'payrec-school', B = 'payrec-main';
const ADMIN = 'payrec-admin', TEACHER_U = 'payrec-teacher-u', STUDENT_U = 'payrec-student-u';
let teacherId = '', studentId = '', payslipId = '';

const tok = (id: string, role: string, branchId: string | null = null) => jwt.sign(
    { id, email: `${id}@x.com`, role, school_id: S, branch_id: branchId, allowed_branch_ids: [] },
    config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });

const asAdmin = () => tok(ADMIN, 'ADMIN');

async function cleanup() {
    for (const m of ['paymentTransaction', 'payslip', 'healthIncident', 'student', 'teacher', 'user', 'branch'] as const) {
        await (prisma as any)[m]?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
    }
    await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('Payment Recording', () => {
    beforeAll(async () => {
        await cleanup();
        await prisma.school.create({ data: { id: S, name: 'PAYREC', code: 'PAYREC', slug: S, plan_type: 'enterprise', subscription_status: 'active' } });
        await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'PRM', is_main: true } });
        await prisma.user.create({ data: { id: ADMIN, email: 'payrec-admin@x.com', password_hash: 'x', full_name: 'PayRec Admin', role: 'ADMIN' as any, school_id: S, branch_id: null } });
        await prisma.user.create({ data: { id: TEACHER_U, email: 'payrec-teacher@x.com', password_hash: 'x', full_name: 'PayRec Teacher', role: 'TEACHER' as any, school_id: S, branch_id: B } });
        await prisma.user.create({ data: { id: STUDENT_U, email: 'payrec-student@x.com', password_hash: 'x', full_name: 'PayRec Student', role: 'STUDENT' as any, school_id: S, branch_id: B } });

        teacherId = (await prisma.teacher.create({ data: { user_id: TEACHER_U, school_id: S, branch_id: B, full_name: 'PayRec Teacher' } })).id;
        studentId = (await prisma.student.create({ data: { user_id: STUDENT_U, school_id: S, branch_id: B, full_name: 'PayRec Student', grade: 5, status: 'Active' } })).id;

        payslipId = (await prisma.payslip.create({
            data: {
                teacher_id: teacherId, school_id: S, branch_id: B, payslip_number: `PAY-TEST-${Date.now()}`,
                period_start: new Date('2026-01-01'), period_end: new Date('2026-01-31'),
                gross_salary: 200000, total_allowances: 0, total_bonuses: 0, total_deductions: 0,
                tax_amount: 0, pension_amount: 0, net_salary: 200000, status: 'Approved',
            },
        })).id;
    }, 60000);

    it('rejects a payment with no payslip', async () => {
        const res = await request(app).post('/api/payment-transactions').set('Authorization', `Bearer ${asAdmin()}`)
            .send({ amount: 1000, payment_method: 'Cash' });
        expect(res.status).toBe(400);
    });

    it('recording a payment creates a transaction and marks the payslip Paid', async () => {
        const res = await request(app).post('/api/payment-transactions').set('Authorization', `Bearer ${asAdmin()}`)
            .send({ payslip_id: payslipId, amount: 200000, payment_method: 'Bank Transfer', transaction_reference: 'TXN-TEST-1', payment_date: '2026-02-01' });
        expect(res.status).toBe(201);
        expect(res.body.reference).toBe('TXN-TEST-1');

        const payslip = await prisma.payslip.findUnique({ where: { id: payslipId } });
        expect(payslip?.status).toBe('Paid');

        const txn = await prisma.paymentTransaction.findFirst({ where: { payslip_id: payslipId } });
        expect(txn).toBeTruthy();
        expect(txn?.amount).toBe(200000);
    });

    it('PUT /payslips/:id updates status directly and 404s for an unknown id', async () => {
        const ok = await request(app).put(`/api/payslips/${payslipId}`).set('Authorization', `Bearer ${asAdmin()}`).send({ status: 'Approved' });
        expect(ok.status).toBe(200);
        expect(ok.body.status).toBe('Approved');

        const missing = await request(app).put('/api/payslips/does-not-exist').set('Authorization', `Bearer ${asAdmin()}`).send({ status: 'Paid' });
        expect(missing.status).toBe(404);
    });
});

describe('Health Incident time field', () => {
    afterAll(cleanup, 60000);

    it('saving an incident with a separate date and time no longer throws, and the time is preserved', async () => {
        const res = await request(app).post('/api/admin-hub/safety/incidents').set('Authorization', `Bearer ${asAdmin()}`)
            .send({
                student_id: studentId, incident_type: 'Fall', description: 'Tripped on the stairs',
                severity: 'Minor', incident_date: '2026-03-01', incident_time: '14:30',
            });
        expect(res.status).toBe(200);
        // incident_date + incident_time are combined without a timezone suffix, so the
        // stored instant is in the server's local time — assert local, not UTC, hours.
        expect(new Date(res.body.incident_date).getHours()).toBe(14);
        expect(new Date(res.body.incident_date).getMinutes()).toBe(30);
    });

    it('saving an incident with no time still works (defaults sensibly)', async () => {
        const res = await request(app).post('/api/admin-hub/safety/incidents').set('Authorization', `Bearer ${asAdmin()}`)
            .send({ student_id: studentId, incident_type: 'Headache', description: 'Mild headache', severity: 'Minor', incident_date: '2026-03-02' });
        expect(res.status).toBe(200);
    });
});
