/**
 * STUDENT DEPARTURE — Gate Pass + Pickup Authorization combined (real database).
 *
 * Covers: parents managing an authorized pickup list, routine end-of-day
 * pickup auto-approving and being flagged when the person isn't on the list,
 * early dismissal requiring admin approval before it can be confirmed, and
 * access control (only the owning parent manages their child's list).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';

const S = 'depart-school', B = 'depart-main';
const ADMIN = 'depart-admin', TEACHER_U = 'depart-teacher-u', PARENT_U = 'depart-parent-u', OTHER_PARENT_U = 'depart-other-parent-u', STUDENT_U = 'depart-student-u';
let studentId = '', pickupPersonId = '';

const tok = (id: string, role: string, branchId: string | null = null) => jwt.sign(
    { id, email: `${id}@x.com`, role, school_id: S, branch_id: branchId, allowed_branch_ids: [] },
    config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });

const asAdmin = () => tok(ADMIN, 'ADMIN');
const asTeacher = () => tok(TEACHER_U, 'TEACHER', B);
const asParent = () => tok(PARENT_U, 'PARENT', B);
const asOtherParent = () => tok(OTHER_PARENT_U, 'PARENT', B);

async function cleanup() {
    for (const m of ['studentDeparture', 'authorizedPickupPerson', 'parentChild', 'student', 'parent', 'user', 'branch'] as const) {
        await (prisma as any)[m]?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
    }
    await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('Student Departure (Gate Pass + Pickup Authorization)', () => {
    beforeAll(async () => {
        await cleanup();
        await prisma.school.create({ data: { id: S, name: 'DEPART', code: 'DEPART', slug: S, plan_type: 'enterprise', subscription_status: 'active' } });
        await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'DEPARTM', is_main: true } });
        await prisma.user.create({ data: { id: ADMIN, email: 'depart-admin@x.com', password_hash: 'x', full_name: 'Depart Admin', role: 'ADMIN' as any, school_id: S, branch_id: null } });
        await prisma.user.create({ data: { id: TEACHER_U, email: 'depart-teacher@x.com', password_hash: 'x', full_name: 'Depart Teacher', role: 'TEACHER' as any, school_id: S, branch_id: B } });
        await prisma.user.create({ data: { id: PARENT_U, email: 'depart-parent@x.com', password_hash: 'x', full_name: 'Depart Parent', role: 'PARENT' as any, school_id: S, branch_id: B } });
        await prisma.user.create({ data: { id: OTHER_PARENT_U, email: 'depart-other-parent@x.com', password_hash: 'x', full_name: 'Other Parent', role: 'PARENT' as any, school_id: S, branch_id: B } });
        await prisma.user.create({ data: { id: STUDENT_U, email: 'depart-student@x.com', password_hash: 'x', full_name: 'Depart Student', role: 'STUDENT' as any, school_id: S, branch_id: B } });

        const parent = await prisma.parent.create({ data: { user_id: PARENT_U, school_id: S, branch_id: B, full_name: 'Depart Parent' } });
        await prisma.parent.create({ data: { user_id: OTHER_PARENT_U, school_id: S, branch_id: B, full_name: 'Other Parent' } });
        const student = await prisma.student.create({ data: { user_id: STUDENT_U, school_id: S, branch_id: B, full_name: 'Depart Student', grade: 3, status: 'Active' } });
        studentId = student.id;
        await prisma.parentChild.create({ data: { parent_id: parent.id, student_id: studentId, school_id: S, branch_id: B } });
    }, 60000);
    afterAll(cleanup, 60000);

    it('a parent who does not own the child cannot view or add pickup persons', async () => {
        const view = await request(app).get(`/api/departures/students/${studentId}/pickup-persons`).set('Authorization', `Bearer ${asOtherParent()}`);
        expect(view.status).toBe(404);
        const add = await request(app).post(`/api/departures/students/${studentId}/pickup-persons`).set('Authorization', `Bearer ${asOtherParent()}`)
            .send({ name: 'Stranger', relationship: 'Friend' });
        expect(add.status).toBe(404);
    });

    it('the owning parent can add an authorized pickup person', async () => {
        const res = await request(app).post(`/api/departures/students/${studentId}/pickup-persons`).set('Authorization', `Bearer ${asParent()}`)
            .send({ name: 'Uncle Femi', relationship: 'Uncle', phone: '0800' });
        expect(res.status).toBe(201);
        pickupPersonId = res.body.id;
    });

    it('routine end-of-day pickup by an authorized person auto-approves and can be confirmed', async () => {
        const req1 = await request(app).post('/api/departures').set('Authorization', `Bearer ${asTeacher()}`)
            .send({ student_id: studentId, type: 'EndOfDay', pickup_person_id: pickupPersonId });
        expect(req1.status).toBe(201);
        expect(req1.body.status).toBe('Approved');
        expect(req1.body.is_authorized).toBe(true);

        const confirm = await request(app).post(`/api/departures/${req1.body.id}/confirm`).set('Authorization', `Bearer ${asTeacher()}`);
        expect(confirm.status).toBe(200);
        expect(confirm.body.status).toBe('Completed');
    });

    it('an unlisted pickup person is flagged but still recorded', async () => {
        const res = await request(app).post('/api/departures').set('Authorization', `Bearer ${asTeacher()}`)
            .send({ student_id: studentId, type: 'EndOfDay', pickup_person_name: 'Random Stranger' });
        expect(res.status).toBe(201);
        expect(res.body.is_authorized).toBe(false);
    });

    it('early dismissal requires admin approval before it can be confirmed', async () => {
        const req1 = await request(app).post('/api/departures').set('Authorization', `Bearer ${asParent()}`)
            .send({ student_id: studentId, type: 'EarlyDismissal', pickup_person_id: pickupPersonId, reason: 'Doctor visit' });
        expect(req1.status).toBe(201);
        expect(req1.body.status).toBe('Pending');

        const tooEarly = await request(app).post(`/api/departures/${req1.body.id}/confirm`).set('Authorization', `Bearer ${asTeacher()}`);
        expect(tooEarly.status).toBe(400);

        const approve = await request(app).post(`/api/departures/${req1.body.id}/approve`).set('Authorization', `Bearer ${asAdmin()}`);
        expect(approve.status).toBe(200);

        const confirm = await request(app).post(`/api/departures/${req1.body.id}/confirm`).set('Authorization', `Bearer ${asTeacher()}`);
        expect(confirm.status).toBe(200);
        expect(confirm.body.status).toBe('Completed');
    });

    it('a teacher (non-admin) cannot approve a gate pass', async () => {
        const req1 = await request(app).post('/api/departures').set('Authorization', `Bearer ${asParent()}`)
            .send({ student_id: studentId, type: 'EarlyDismissal', pickup_person_id: pickupPersonId, reason: 'Family matter' });
        const res = await request(app).post(`/api/departures/${req1.body.id}/approve`).set('Authorization', `Bearer ${asTeacher()}`);
        expect(res.status).toBe(403);
    });

    it('admin sees the full departure log', async () => {
        const res = await request(app).get('/api/departures').set('Authorization', `Bearer ${asAdmin()}`);
        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThanOrEqual(4);
    });
});
