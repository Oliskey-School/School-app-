/**
 * STUDENT EARLY WARNING SYSTEM (real database).
 *
 * Covers: rules-based risk scoring (attendance, homework, fees, behaviour,
 * exam scores), manual scan trigger, admin/teacher/parent-scoped visibility,
 * and resolving a flag.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';

const S = 'risk-school', B = 'risk-main';
const ADMIN = 'risk-admin', TEACHER_U = 'risk-teacher-u', PARENT_U = 'risk-parent-u', STUDENT_U = 'risk-student-u', OTHER_STUDENT_U = 'risk-other-student-u';
let teacherId = '', studentId = '', otherStudentId = '', parentId = '', classId = '', examId = '';

const tok = (id: string, role: string, branchId: string | null = null) => jwt.sign(
    { id, email: `${id}@x.com`, role, school_id: S, branch_id: branchId, allowed_branch_ids: [] },
    config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });

const asAdmin = () => tok(ADMIN, 'ADMIN');
const asTeacher = () => tok(TEACHER_U, 'TEACHER', B);
const asParent = () => tok(PARENT_U, 'PARENT', B);

function daysAgo(n: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
}

async function cleanup() {
    for (const m of ['studentRiskFlag', 'examResult', 'exam', 'behaviorNote', 'studentFee', 'attendance', 'assignmentSubmission', 'assignment', 'classTeacher', 'parentChild', 'studentEnrollment', 'student', 'class', 'teacher', 'parent', 'user', 'branch'] as const) {
        await (prisma as any)[m]?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
    }
    await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('Student Early Warning System', () => {
    beforeAll(async () => {
        await cleanup();
        await prisma.school.create({ data: { id: S, name: 'RISK', code: 'RISK', slug: S, plan_type: 'enterprise', subscription_status: 'active' } });
        await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'RISKM', is_main: true } });
        await prisma.user.create({ data: { id: ADMIN, email: 'risk-admin@x.com', password_hash: 'x', full_name: 'Risk Admin', role: 'ADMIN' as any, school_id: S, branch_id: null } });
        await prisma.user.create({ data: { id: TEACHER_U, email: 'risk-teacher@x.com', password_hash: 'x', full_name: 'Risk Teacher', role: 'TEACHER' as any, school_id: S, branch_id: B } });
        await prisma.user.create({ data: { id: PARENT_U, email: 'risk-parent@x.com', password_hash: 'x', full_name: 'Risk Parent', role: 'PARENT' as any, school_id: S, branch_id: B } });
        await prisma.user.create({ data: { id: STUDENT_U, email: 'risk-student@x.com', password_hash: 'x', full_name: 'At Risk Student', role: 'STUDENT' as any, school_id: S, branch_id: B } });
        await prisma.user.create({ data: { id: OTHER_STUDENT_U, email: 'risk-other-student@x.com', password_hash: 'x', full_name: 'Fine Student', role: 'STUDENT' as any, school_id: S, branch_id: B } });

        teacherId = (await prisma.teacher.create({ data: { user_id: TEACHER_U, school_id: S, branch_id: B, full_name: 'Risk Teacher' } })).id;
        parentId = (await prisma.parent.create({ data: { user_id: PARENT_U, school_id: S, branch_id: B, full_name: 'Risk Parent' } })).id;
        classId = (await prisma.class.create({ data: { school_id: S, branch_id: B, name: 'JSS2A', grade: 8, section: 'A' } })).id;
        await prisma.classTeacher.create({ data: { school_id: S, branch_id: B, class_id: classId, teacher_id: teacherId, role: 'class_teacher', status: 'active' } });

        studentId = (await prisma.student.create({ data: { user_id: STUDENT_U, school_id: S, branch_id: B, full_name: 'At Risk Student', grade: 8, status: 'Active' } })).id;
        otherStudentId = (await prisma.student.create({ data: { user_id: OTHER_STUDENT_U, school_id: S, branch_id: B, full_name: 'Fine Student', grade: 8, status: 'Active' } })).id;
        await prisma.studentEnrollment.create({ data: { student_id: studentId, class_id: classId, school_id: S, branch_id: B, status: 'Active' } });
        await prisma.studentEnrollment.create({ data: { student_id: otherStudentId, class_id: classId, school_id: S, branch_id: B, status: 'Active' } });
        await prisma.parentChild.create({ data: { parent_id: parentId, student_id: studentId, school_id: S, branch_id: B } });

        // 6 absences in the last 30 days — crosses the attendance threshold.
        for (let i = 1; i <= 6; i++) {
            await prisma.attendance.create({ data: { student_id: studentId, class_id: classId, school_id: S, branch_id: B, date: daysAgo(i), status: 'Absent' } });
        }
        // 2 unpaid overdue fees.
        for (let i = 0; i < 2; i++) {
            await prisma.studentFee.create({ data: { student_id: studentId, school_id: S, branch_id: B, title: `Fee ${i}`, amount: 5000, paid_amount: 0, status: 'Pending', due_date: daysAgo(5) } });
        }
        // 3 negative behaviour notes.
        for (let i = 0; i < 3; i++) {
            await prisma.behaviorNote.create({ data: { student_id: studentId, teacher_id: teacherId, school_id: S, branch_id: B, note: `Incident ${i}`, category: 'Conduct', type: 'negative', points: -2, date: daysAgo(3) } });
        }
        // A low exam score.
        examId = (await prisma.exam.create({ data: { school_id: S, branch_id: B, title: 'Term Test', subject: 'Mathematics', class_id: classId } })).id;
        await prisma.examResult.create({ data: { school_id: S, branch_id: B, exam_id: examId, student_id: studentId, subject: 'Mathematics', score: 20, max_score: 100 } });

        // The "fine" student has no risk factors at all — must never be flagged.
        await prisma.attendance.create({ data: { student_id: otherStudentId, class_id: classId, school_id: S, branch_id: B, date: daysAgo(1), status: 'Present' } });
    }, 60000);
    afterAll(cleanup, 60000);

    it('non-admins cannot view the school-wide at-risk list', async () => {
        const res = await request(app).get('/api/risk/students').set('Authorization', `Bearer ${asTeacher()}`);
        expect(res.status).toBe(403);
    });

    it('running a manual scan flags the at-risk student and skips the fine one', async () => {
        const res = await request(app).post('/api/risk/scan').set('Authorization', `Bearer ${asAdmin()}`);
        expect(res.status).toBe(200);
        expect(res.body.flaggedCount).toBeGreaterThanOrEqual(1);
    });

    it('admin sees the flagged student with reasons and a risk level', async () => {
        const res = await request(app).get('/api/risk/students').set('Authorization', `Bearer ${asAdmin()}`);
        expect(res.status).toBe(200);
        const flagged = res.body.find((s: any) => s.student_id === studentId);
        expect(flagged).toBeTruthy();
        expect(['Medium', 'High']).toContain(flagged.level);
        expect(flagged.reasons.length).toBeGreaterThan(0);
        expect(res.body.some((s: any) => s.student_id === otherStudentId)).toBe(false);
    });

    it('the flagged student\'s teacher sees them in their own list', async () => {
        const res = await request(app).get('/api/risk/students/mine').set('Authorization', `Bearer ${asTeacher()}`);
        expect(res.status).toBe(200);
        expect(res.body.some((s: any) => s.student_id === studentId)).toBe(true);
    });

    it('the parent sees a gentle, non-technical notice for their child', async () => {
        const res = await request(app).get('/api/risk/children').set('Authorization', `Bearer ${asParent()}`);
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(1);
        expect(res.body[0].student_id).toBe(studentId);
        expect(res.body[0].message).not.toMatch(/\d+%|\bscore\b/i);
    });

    it('admin can resolve the flag, removing it from the active list', async () => {
        const list = await request(app).get('/api/risk/students').set('Authorization', `Bearer ${asAdmin()}`);
        const flagId = list.body.find((s: any) => s.student_id === studentId).id;

        const res = await request(app).patch(`/api/risk/${flagId}/resolve`).set('Authorization', `Bearer ${asAdmin()}`);
        expect(res.status).toBe(200);

        const after = await request(app).get('/api/risk/students').set('Authorization', `Bearer ${asAdmin()}`);
        expect(after.body.some((s: any) => s.student_id === studentId)).toBe(false);
    });

    it('resolving an already-resolved flag fails', async () => {
        const flag = await (prisma as any).studentRiskFlag.findUnique({ where: { student_id: studentId } });
        const res = await request(app).patch(`/api/risk/${flag.id}/resolve`).set('Authorization', `Bearer ${asAdmin()}`);
        expect(res.status).toBe(400);
    });
});
