/**
 * ALUMNI ARCHIVE & STUDENT SUSPENSIONS (real database).
 *
 * Covers: marking a student as Transferred/Withdrawn (moves them into the
 * Past Students archive with an exit snapshot), the assembled alumni
 * history endpoint, suspension issue -> student + parent notifications ->
 * confirm-return, overdue flagging, branch/school isolation, and role guards.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';

const S = 'as-school', B1 = 'as-main', B2 = 'as-branch2';
const ADMIN = 'as-admin', BRANCH_ADMIN = 'as-branch-admin';
const STU_U = 'as-stu-u', PARENT_U = 'as-parent-u', TEACHER_U = 'as-tch-u';
let studentId = '', branch2StudentId = '';

const tok = (id: string, role: string, branchId: string | null = null) => jwt.sign(
    { id, email: `${id}@x.com`, role, school_id: S, branch_id: branchId, allowed_branch_ids: [] },
    config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });

const asAdmin = () => tok(ADMIN, 'ADMIN');
const asBranchAdmin = () => tok(BRANCH_ADMIN, 'ADMIN', B2);
const asTeacher = () => tok(TEACHER_U, 'TEACHER', B1);
const asStudent = () => tok(STU_U, 'STUDENT', B1);
const asParent = () => tok(PARENT_U, 'PARENT', B1);

const daysFromToday = (n: number) => {
    const d = new Date(Date.now() + n * 86_400_000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

async function cleanup() {
    for (const m of ['studentSuspension', 'parentChild', 'notification', 'student', 'parent', 'teacher', 'user', 'branch'] as const) {
        await (prisma as any)[m]?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
    }
    await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('Alumni archive & student suspensions', () => {
    beforeAll(async () => {
        await cleanup();
        await prisma.school.create({ data: { id: S, name: 'AS', code: 'AS', slug: S, plan_type: 'enterprise', subscription_status: 'active' } });
        await prisma.branch.create({ data: { id: B1, school_id: S, name: 'Main', code: 'ASM', is_main: true } });
        await prisma.branch.create({ data: { id: B2, school_id: S, name: 'Branch 2', code: 'ASB2', is_main: false } });
        await prisma.user.create({ data: { id: ADMIN, email: 'as-admin@x.com', password_hash: 'x', full_name: 'AS Admin', role: 'ADMIN' as any, school_id: S, branch_id: null } });
        await prisma.user.create({ data: { id: BRANCH_ADMIN, email: 'as-branch-admin@x.com', password_hash: 'x', full_name: 'Branch Admin', role: 'ADMIN' as any, school_id: S, branch_id: B2 } });
        await prisma.user.create({ data: { id: TEACHER_U, email: 'as-tch@x.com', password_hash: 'x', full_name: 'AS Teacher', role: 'TEACHER' as any, school_id: S, branch_id: B1 } });
        await prisma.user.create({ data: { id: STU_U, email: 'as-stu@x.com', password_hash: 'x', full_name: 'AS Student', role: 'STUDENT' as any, school_id: S, branch_id: B1 } });
        await prisma.user.create({ data: { id: PARENT_U, email: 'as-parent@x.com', password_hash: 'x', full_name: 'AS Parent', role: 'PARENT' as any, school_id: S, branch_id: B1 } });

        studentId = (await prisma.student.create({
            data: { user_id: STU_U, school_id: S, branch_id: B1, full_name: 'AS Student', admission_number: 'AS-0001', grade: 10, section: 'A', status: 'Active' }
        })).id;
        const parentProfile = await prisma.parent.create({ data: { user_id: PARENT_U, school_id: S, branch_id: B1, full_name: 'AS Parent' } });
        await prisma.parentChild.create({ data: { parent_id: parentProfile.id, student_id: studentId, school_id: S, branch_id: B1 } });

        const branch2StuUser = await prisma.user.create({ data: { id: 'as-stu2-u', email: 'as-stu2@x.com', password_hash: 'x', full_name: 'Branch2 Student', role: 'STUDENT' as any, school_id: S, branch_id: B2 } });
        branch2StudentId = (await prisma.student.create({
            data: { user_id: branch2StuUser.id, school_id: S, branch_id: B2, full_name: 'Branch2 Student', admission_number: 'AS-0002', grade: 10, section: 'A', status: 'Active' }
        })).id;
    }, 60000);
    afterAll(cleanup, 60000);

    let suspensionId = '';

    it('branch admin cannot mark a student in another branch as exited', async () => {
        const res = await request(app).post(`/api/alumni/${studentId}/mark-exit`)
            .set('Authorization', `Bearer ${asBranchAdmin()}`)
            .send({ status: 'Transferred', reason: 'Family relocated' });
        expect(res.status).toBe(404);
    });

    it('teacher cannot mark a student as exited', async () => {
        const res = await request(app).post(`/api/alumni/${studentId}/mark-exit`)
            .set('Authorization', `Bearer ${asTeacher()}`)
            .send({ status: 'Transferred' });
        expect(res.status).toBe(403);
    });

    it('rejects an invalid exit status', async () => {
        const res = await request(app).post(`/api/alumni/${studentId}/mark-exit`)
            .set('Authorization', `Bearer ${asAdmin()}`)
            .send({ status: 'Suspended' });
        expect(res.status).toBe(400);
    });

    it('main admin marks the student as Transferred — moves into the alumni archive', async () => {
        const res = await request(app).post(`/api/alumni/${studentId}/mark-exit`)
            .set('Authorization', `Bearer ${asAdmin()}`)
            .send({ status: 'Transferred', reason: 'Family relocated to Abuja', exit_date: '2026-06-01' });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('Transferred');
        expect(res.body.exit_year).toBe(2026);
    });

    it('cannot mark the same student as exited twice', async () => {
        const res = await request(app).post(`/api/alumni/${studentId}/mark-exit`)
            .set('Authorization', `Bearer ${asAdmin()}`)
            .send({ status: 'Withdrawn' });
        expect(res.status).toBe(400);
    });

    it('the student now appears in the Past Students list', async () => {
        const res = await request(app).get('/api/alumni').set('Authorization', `Bearer ${asAdmin()}`);
        expect(res.status).toBe(200);
        const found = res.body.find((s: any) => s.id === studentId);
        expect(found).toBeTruthy();
        expect(found.status).toBe('Transferred');
    });

    it('past-students filters by year and status', async () => {
        const res = await request(app).get('/api/alumni?year=2026&status=Transferred').set('Authorization', `Bearer ${asAdmin()}`);
        expect(res.status).toBe(200);
        expect(res.body.some((s: any) => s.id === studentId)).toBe(true);

        const wrongYear = await request(app).get('/api/alumni?year=1999').set('Authorization', `Bearer ${asAdmin()}`);
        expect(wrongYear.body.find((s: any) => s.id === studentId)).toBeUndefined();
    });

    it('assembles the full alumni history for the past student', async () => {
        const res = await request(app).get(`/api/alumni/${studentId}/history`).set('Authorization', `Bearer ${asAdmin()}`);
        expect(res.status).toBe(200);
        expect(res.body.student.full_name).toBe('AS Student');
        expect(res.body.parents.length).toBeGreaterThanOrEqual(1);
        expect(Array.isArray(res.body.suspensions)).toBe(true);
        expect(Array.isArray(res.body.fees)).toBe(true);
    });

    it('a still-active student is not treated as a past student', async () => {
        const res = await request(app).get(`/api/alumni/${branch2StudentId}/history`).set('Authorization', `Bearer ${asAdmin()}`);
        expect(res.status).toBe(404);
    });

    it('teacher cannot view the past students list', async () => {
        const res = await request(app).get('/api/alumni').set('Authorization', `Bearer ${asTeacher()}`);
        expect(res.status).toBe(403);
    });

    // ---------- Suspension flow (issued against the still-active branch-2 student) ----------

    it('admin issues a suspension and both the student and parent are notified', async () => {
        const parentUser2 = await prisma.user.create({ data: { id: 'as-parent2-u', email: 'as-parent2@x.com', password_hash: 'x', full_name: 'Parent 2', role: 'PARENT' as any, school_id: S, branch_id: B2 } });
        const parent2 = await prisma.parent.create({ data: { user_id: parentUser2.id, school_id: S, branch_id: B2, full_name: 'Parent 2' } });
        await prisma.parentChild.create({ data: { parent_id: parent2.id, student_id: branch2StudentId, school_id: S, branch_id: B2 } });

        const res = await request(app).post('/api/suspensions')
            .set('Authorization', `Bearer ${asBranchAdmin()}`)
            .send({
                student_id: branch2StudentId,
                reason: 'Repeated disruption in class.',
                start_date: daysFromToday(0),
                return_date: daysFromToday(5),
                return_conditions: 'Meet the counselor before returning.',
            });
        expect(res.status).toBe(201);
        suspensionId = res.body.id;

        const notifs = await prisma.notification.findMany({ where: { school_id: S, title: 'Suspension Letter Issued' } });
        const recipientIds = notifs.map(n => n.user_id);
        expect(recipientIds).toContain('as-stu2-u');
        expect(recipientIds).toContain(parentUser2.id);
    });

    it('teacher cannot issue a suspension', async () => {
        const res = await request(app).post('/api/suspensions')
            .set('Authorization', `Bearer ${asTeacher()}`)
            .send({ student_id: studentId, reason: 'x', start_date: daysFromToday(0), return_date: daysFromToday(3) });
        expect(res.status).toBe(403);
    });

    it('an overdue suspension is flagged live', async () => {
        const overdue = await (prisma as any).studentSuspension.create({
            data: {
                school_id: S, branch_id: B1, student_id: studentId,
                reason: 'Old case', start_date: daysFromToday(-20), return_date: daysFromToday(-5),
            }
        });
        const res = await request(app).get('/api/suspensions').set('Authorization', `Bearer ${asAdmin()}`);
        expect(res.status).toBe(200);
        const found = res.body.find((s: any) => s.id === overdue.id);
        expect(found.is_overdue).toBe(true);
    });

    it('admin closes the suspension with confirm-return', async () => {
        const res = await request(app).post(`/api/suspensions/${suspensionId}/confirm-return`)
            .set('Authorization', `Bearer ${asBranchAdmin()}`)
            .send({ return_note: 'Returned in good standing.' });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('returned');
    });

    it('cannot confirm return twice', async () => {
        const res = await request(app).post(`/api/suspensions/${suspensionId}/confirm-return`)
            .set('Authorization', `Bearer ${asBranchAdmin()}`)
            .send({});
        expect(res.status).toBe(400);
    });

    it('main admin outside branch 2 can still confirm-return (school-level access)', async () => {
        const another = await (prisma as any).studentSuspension.create({
            data: { school_id: S, branch_id: B2, student_id: branch2StudentId, reason: 'x', start_date: daysFromToday(0), return_date: daysFromToday(2) }
        });
        const res = await request(app).post(`/api/suspensions/${another.id}/confirm-return`)
            .set('Authorization', `Bearer ${asAdmin()}`)
            .send({});
        expect(res.status).toBe(200);
    });

    it('the student sees their own suspension letters', async () => {
        await (prisma as any).studentSuspension.create({
            data: { school_id: S, branch_id: B1, student_id: studentId, reason: 'Visible to student', start_date: daysFromToday(0), return_date: daysFromToday(2) }
        });
        const res = await request(app).get('/api/suspensions/mine/student').set('Authorization', `Bearer ${asStudent()}`);
        expect(res.status).toBe(200);
        expect(res.body.some((s: any) => s.reason === 'Visible to student')).toBe(true);
    });

    it('the parent sees suspensions for their linked child, tagged with the student name', async () => {
        const res = await request(app).get('/api/suspensions/mine/children').set('Authorization', `Bearer ${asParent()}`);
        expect(res.status).toBe(200);
        const found = res.body.find((s: any) => s.reason === 'Visible to student');
        expect(found).toBeTruthy();
        expect(found.student_name).toBe('AS Student');
    });

    it('another school cannot see or act on this school\'s suspensions', async () => {
        const freshSuspension = await (prisma as any).studentSuspension.create({
            data: { school_id: S, branch_id: B1, student_id: studentId, reason: 'Cross-tenant guard', start_date: daysFromToday(0), return_date: daysFromToday(2) }
        });
        await prisma.school.create({ data: { id: 'as-foreign-school', name: 'ASF', code: 'ASF', slug: 'as-foreign-school', plan_type: 'enterprise', subscription_status: 'active' } });
        await prisma.user.create({ data: { id: 'as-foreign-admin', email: 'as-foreign@x.com', password_hash: 'x', full_name: 'Foreign Admin', role: 'ADMIN' as any, school_id: 'as-foreign-school', branch_id: null } });
        const foreignTok = jwt.sign(
            { id: 'as-foreign-admin', email: 'as-foreign@x.com', role: 'ADMIN', school_id: 'as-foreign-school', branch_id: null, allowed_branch_ids: [] },
            config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });
        const res = await request(app).post(`/api/suspensions/${freshSuspension.id}/confirm-return`)
            .set('Authorization', `Bearer ${foreignTok}`)
            .send({});
        expect(res.status).toBe(404);

        await prisma.user.delete({ where: { id: 'as-foreign-admin' } }).catch(() => {});
        await prisma.school.delete({ where: { id: 'as-foreign-school' } }).catch(() => {});
    });
});
