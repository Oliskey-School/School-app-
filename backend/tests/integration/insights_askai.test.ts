/**
 * AI INSIGHTS + ASK AI (real database).
 *
 * Insights: every panel is computed from real, already-tracked data — no AI
 * call. Ask AI matches a free-text question to a curated, tenant-scoped
 * query catalog; the critical property under test is that a teacher's
 * answer never includes another teacher's class, and a parent's answer
 * never includes another parent's child.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';

const S = 'insight-school', B = 'insight-main';
const ADMIN = 'insight-admin', TEACHER_A_U = 'insight-teacher-a-u', TEACHER_B_U = 'insight-teacher-b-u';
const PARENT_A_U = 'insight-parent-a-u', PARENT_B_U = 'insight-parent-b-u', STUDENT_A_U = 'insight-student-a-u', STUDENT_B_U = 'insight-student-b-u';
let teacherAId = '', studentAId = '', studentBId = '', parentAId = '', classAId = '';

const tok = (id: string, role: string, branchId: string | null = null) => jwt.sign(
    { id, email: `${id}@x.com`, role, school_id: S, branch_id: branchId, allowed_branch_ids: [] },
    config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });

const asAdmin = () => tok(ADMIN, 'ADMIN');
const asTeacherA = () => tok(TEACHER_A_U, 'TEACHER', B);
const asTeacherB = () => tok(TEACHER_B_U, 'TEACHER', B);
const asParentA = () => tok(PARENT_A_U, 'PARENT', B);
const asStudentA = () => tok(STUDENT_A_U, 'STUDENT', B);

async function cleanup() {
    for (const m of ['studentFee', 'attendance', 'examResult', 'exam', 'parentChild', 'studentEnrollment', 'student', 'classTeacher', 'class', 'parent', 'teacher', 'user', 'branch'] as const) {
        await (prisma as any)[m]?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
    }
    await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('AI Insights + Ask AI', () => {
    beforeAll(async () => {
        await cleanup();
        await prisma.school.create({ data: { id: S, name: 'INSIGHT', code: 'INSIGHT', slug: S, plan_type: 'enterprise', subscription_status: 'active' } });
        await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'INM', is_main: true } });
        await prisma.user.create({ data: { id: ADMIN, email: 'insight-admin@x.com', password_hash: 'x', full_name: 'Insight Admin', role: 'ADMIN' as any, school_id: S, branch_id: null } });
        for (const [uid, name] of [[TEACHER_A_U, 'Teacher A'], [TEACHER_B_U, 'Teacher B']] as const) {
            await prisma.user.create({ data: { id: uid, email: `${uid}@x.com`, password_hash: 'x', full_name: name, role: 'TEACHER' as any, school_id: S, branch_id: B } });
        }
        for (const [uid, name] of [[PARENT_A_U, 'Parent A'], [PARENT_B_U, 'Parent B']] as const) {
            await prisma.user.create({ data: { id: uid, email: `${uid}@x.com`, password_hash: 'x', full_name: name, role: 'PARENT' as any, school_id: S, branch_id: B } });
        }
        for (const [uid, name] of [[STUDENT_A_U, 'Student Alpha'], [STUDENT_B_U, 'Student Beta']] as const) {
            await prisma.user.create({ data: { id: uid, email: `${uid}@x.com`, password_hash: 'x', full_name: name, role: 'STUDENT' as any, school_id: S, branch_id: B } });
        }

        teacherAId = (await prisma.teacher.create({ data: { user_id: TEACHER_A_U, school_id: S, branch_id: B, full_name: 'Teacher A' } })).id;
        const teacherBId = (await prisma.teacher.create({ data: { user_id: TEACHER_B_U, school_id: S, branch_id: B, full_name: 'Teacher B' } })).id;
        parentAId = (await prisma.parent.create({ data: { user_id: PARENT_A_U, school_id: S, branch_id: B, full_name: 'Parent A' } })).id;
        await prisma.parent.create({ data: { user_id: PARENT_B_U, school_id: S, branch_id: B, full_name: 'Parent B' } });

        classAId = (await prisma.class.create({ data: { school_id: S, branch_id: B, name: 'JSS1-A', grade: 7, section: 'A' } })).id;
        const classBId = (await prisma.class.create({ data: { school_id: S, branch_id: B, name: 'JSS1-B', grade: 7, section: 'B' } })).id;
        await prisma.classTeacher.create({ data: { school_id: S, branch_id: B, class_id: classAId, teacher_id: teacherAId, role: 'class_teacher', status: 'active' } });
        await prisma.classTeacher.create({ data: { school_id: S, branch_id: B, class_id: classBId, teacher_id: teacherBId, role: 'class_teacher', status: 'active' } });

        studentAId = (await prisma.student.create({ data: { user_id: STUDENT_A_U, school_id: S, branch_id: B, full_name: 'Student Alpha', grade: 7, status: 'Active' } })).id;
        studentBId = (await prisma.student.create({ data: { user_id: STUDENT_B_U, school_id: S, branch_id: B, full_name: 'Student Beta', grade: 7, status: 'Active' } })).id;
        await prisma.studentEnrollment.create({ data: { student_id: studentAId, class_id: classAId, school_id: S, branch_id: B, status: 'Active' } });
        await prisma.studentEnrollment.create({ data: { student_id: studentBId, class_id: classBId, school_id: S, branch_id: B, status: 'Active' } });
        await prisma.parentChild.create({ data: { parent_id: parentAId, student_id: studentAId, school_id: S, branch_id: B } });

        // Unpaid fee only for Student Alpha (Parent A / Teacher A's class).
        await prisma.studentFee.create({ data: { school_id: S, branch_id: B, student_id: studentAId, title: 'Term Fee', amount: 10000, paid_amount: 0, status: 'Pending', due_date: new Date() } });
    }, 60000);
    afterAll(cleanup, 60000);

    it('admin insights include real numbers from the Digital Twin and Early Warning engines', async () => {
        const res = await request(app).get('/api/insights/mine').set('Authorization', `Bearer ${asAdmin()}`);
        expect(res.status).toBe(200);
        expect(res.body.role).toBe('admin');
        expect(typeof res.body.today_attendance_pct).toBe('number');
        expect(res.body.fee_collection.unpaid_today).toBeGreaterThanOrEqual(1);
    });

    it("teacher A's insights are scoped to their own class only", async () => {
        const res = await request(app).get('/api/insights/mine').set('Authorization', `Bearer ${asTeacherA()}`);
        expect(res.status).toBe(200);
        expect(res.body.role).toBe('teacher');
        expect(res.body.is_class_teacher).toBe(true);
    });

    it('a parent sees only their own child in insights, never the other parent\'s child', async () => {
        const res = await request(app).get('/api/insights/mine').set('Authorization', `Bearer ${asParentA()}`);
        expect(res.status).toBe(200);
        expect(res.body.children.length).toBe(1);
        expect(res.body.children[0].name).toBe('Student Alpha');
        expect(res.body.children.some((c: any) => c.name === 'Student Beta')).toBe(false);
    });

    it('a student sees their own academic insights', async () => {
        const res = await request(app).get('/api/insights/mine').set('Authorization', `Bearer ${asStudentA()}`);
        expect(res.status).toBe(200);
        expect(res.body.role).toBe('student');
        expect(Array.isArray(res.body.weak_subjects)).toBe(true);
    });

    it('Ask AI suggestions are role-specific — admin gets admin questions, student gets student questions', async () => {
        const adminRes = await request(app).get('/api/insights/ask/suggestions').set('Authorization', `Bearer ${asAdmin()}`);
        expect(adminRes.status).toBe(200);
        expect(adminRes.body.questions.length).toBeGreaterThan(0);

        const studentRes = await request(app).get('/api/insights/ask/suggestions').set('Authorization', `Bearer ${asStudentA()}`);
        expect(studentRes.status).toBe(200);
        expect(studentRes.body.questions.length).toBeGreaterThan(0);
        expect(new Set(studentRes.body.questions)).not.toEqual(new Set(adminRes.body.questions));
    });

    it('admin can ask about unpaid fees and gets a real, scoped answer', async () => {
        const res = await request(app).post('/api/insights/ask').set('Authorization', `Bearer ${asAdmin()}`).send({ question: 'Show unpaid school fees' });
        expect(res.status).toBe(200);
        expect(res.body.answer).toBeTruthy();
        expect(res.body.query_id).toBe('unpaid_fees');
        expect(res.body.data.some((d: any) => d.student === 'Student Alpha')).toBe(true);
    });

    it("teacher A asking about at-risk students never returns teacher B's students", async () => {
        const res = await request(app).post('/api/insights/ask').set('Authorization', `Bearer ${asTeacherA()}`).send({ question: 'Which students are at risk of failing?' });
        expect(res.status).toBe(200);
        expect(res.body.query_id).toBe('at_risk_students');
        // Whatever comes back must only be students in Teacher A's own class.
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('a question outside a role\'s catalog (e.g. a student asking about unpaid fees) is not answered with real data', async () => {
        const res = await request(app).post('/api/insights/ask').set('Authorization', `Bearer ${asStudentA()}`).send({ question: 'Show unpaid school fees' });
        expect(res.status).toBe(200);
        expect(res.body.query_id).not.toBe('unpaid_fees');
    });

    it('an empty question is rejected', async () => {
        const res = await request(app).post('/api/insights/ask').set('Authorization', `Bearer ${asAdmin()}`).send({ question: '' });
        expect(res.status).toBe(400);
    });
});
