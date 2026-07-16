/**
 * DEPARTMENT MANAGEMENT + SCHOOL CLUBS (real database).
 *
 * Departments: create, assign Head of Department, roster teachers, add a
 * budget line, log a meeting, and pull a combined report.
 *
 * Clubs: create a club, mark club-specific attendance (separate from class
 * attendance), and log an achievement linked to the club.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';

const S = 'deptclub-school', B = 'deptclub-main';
const ADMIN = 'deptclub-admin', TEACHER_U = 'deptclub-teacher-u', STUDENT_U = 'deptclub-student-u';
let teacherId = '', studentId = '', departmentId = '', clubId = '';

const tok = (id: string, role: string, branchId: string | null = null) => jwt.sign(
    { id, email: `${id}@x.com`, role, school_id: S, branch_id: branchId, allowed_branch_ids: [] },
    config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });

const asAdmin = () => tok(ADMIN, 'ADMIN');
const asTeacher = () => tok(TEACHER_U, 'TEACHER', B);

function todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function cleanup() {
    for (const m of ['clubAttendance', 'achievement', 'studentActivity', 'extracurricularActivity', 'departmentMeeting', 'budget', 'department', 'student', 'teacher', 'user', 'branch'] as const) {
        await (prisma as any)[m]?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
    }
    await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('Department Management + School Clubs', () => {
    beforeAll(async () => {
        await cleanup();
        await prisma.school.create({ data: { id: S, name: 'DEPTCLUB', code: 'DEPTCLUB', slug: S, plan_type: 'enterprise', subscription_status: 'active' } });
        await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'DCM', is_main: true } });
        await prisma.user.create({ data: { id: ADMIN, email: 'deptclub-admin@x.com', password_hash: 'x', full_name: 'DC Admin', role: 'ADMIN' as any, school_id: S, branch_id: null } });
        await prisma.user.create({ data: { id: TEACHER_U, email: 'deptclub-teacher@x.com', password_hash: 'x', full_name: 'DC Teacher', role: 'TEACHER' as any, school_id: S, branch_id: B } });
        await prisma.user.create({ data: { id: STUDENT_U, email: 'deptclub-student@x.com', password_hash: 'x', full_name: 'DC Student', role: 'STUDENT' as any, school_id: S, branch_id: B } });

        teacherId = (await prisma.teacher.create({ data: { user_id: TEACHER_U, school_id: S, branch_id: B, full_name: 'DC Teacher' } })).id;
        studentId = (await prisma.student.create({ data: { user_id: STUDENT_U, school_id: S, branch_id: B, full_name: 'DC Student', grade: 9, status: 'Active' } })).id;
    }, 60000);
    afterAll(cleanup, 60000);

    it('non-admins cannot create a department', async () => {
        const res = await request(app).post('/api/departments').set('Authorization', `Bearer ${asTeacher()}`).send({ name: 'Science' });
        expect(res.status).toBe(403);
    });

    it('an admin can create a department and assign a Head of Department', async () => {
        const create = await request(app).post('/api/departments').set('Authorization', `Bearer ${asAdmin()}`).send({ name: 'Science' });
        expect(create.status).toBe(201);
        departmentId = create.body.id;

        const setHead = await request(app).put(`/api/departments/${departmentId}`).set('Authorization', `Bearer ${asAdmin()}`).send({ head_teacher_id: teacherId });
        expect(setHead.status).toBe(200);
        expect(setHead.body.head_teacher_id).toBe(teacherId);
    });

    it('a teacher can be assigned to the department roster', async () => {
        const res = await request(app).post(`/api/departments/${departmentId}/teachers`).set('Authorization', `Bearer ${asAdmin()}`).send({ teacher_id: teacherId });
        expect(res.status).toBe(200);
        expect(res.body.department_id).toBe(departmentId);
    });

    it('a budget line and a meeting can be added', async () => {
        const budget = await request(app).post(`/api/departments/${departmentId}/budget`).set('Authorization', `Bearer ${asAdmin()}`)
            .send({ fiscal_year: '2026/2027', allocated_amount: 300000 });
        expect(budget.status).toBe(201);

        const meeting = await request(app).post(`/api/departments/${departmentId}/meetings`).set('Authorization', `Bearer ${asAdmin()}`)
            .send({ title: 'Term Planning', date: todayStr() });
        expect(meeting.status).toBe(201);
    });

    it('the department report rolls up teachers, budget, and meetings', async () => {
        const res = await request(app).get(`/api/departments/${departmentId}/report`).set('Authorization', `Bearer ${asAdmin()}`);
        expect(res.status).toBe(200);
        expect(res.body.teachers.length).toBe(1);
        expect(res.body.total_allocated).toBe(300000);
        expect(res.body.meetings.length).toBe(1);
    });

    it('a teacher (non-admin) cannot create a club', async () => {
        const res = await request(app).post('/api/extracurriculars').set('Authorization', `Bearer ${asTeacher()}`).send({ name: 'Debate Club', category: 'Academic' });
        expect(res.status).toBe(403);
    });

    it('an admin can create a club with an advisor', async () => {
        const res = await request(app).post('/api/extracurriculars').set('Authorization', `Bearer ${asAdmin()}`)
            .send({ name: 'Debate Club', category: 'Academic', advisor_teacher_id: teacherId });
        expect(res.status).toBe(201);
        clubId = res.body.id;
    });

    it('a teacher can mark club attendance, separate from regular class attendance', async () => {
        const res = await request(app).post(`/api/extracurriculars/${clubId}/attendance`).set('Authorization', `Bearer ${asTeacher()}`)
            .send({ date: todayStr(), records: [{ student_id: studentId, status: 'Present' }] });
        expect(res.status).toBe(201);

        const list = await request(app).get(`/api/extracurriculars/${clubId}/attendance?date=${todayStr()}`).set('Authorization', `Bearer ${asAdmin()}`);
        expect(list.status).toBe(200);
        expect(list.body.length).toBe(1);
        expect(list.body[0].status).toBe('Present');
    });

    it('a staff member can log a club achievement, and it appears on the club record', async () => {
        const res = await request(app).post(`/api/extracurriculars/${clubId}/achievements`).set('Authorization', `Bearer ${asTeacher()}`)
            .send({ student_id: studentId, title: 'Won Regional Final' });
        expect(res.status).toBe(201);

        const list = await request(app).get(`/api/extracurriculars/${clubId}/achievements`).set('Authorization', `Bearer ${asAdmin()}`);
        expect(list.status).toBe(200);
        expect(list.body.some((a: any) => a.title === 'Won Regional Final' && a.student.id === studentId)).toBe(true);
    });
});
