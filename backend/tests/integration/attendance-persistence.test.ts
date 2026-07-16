/**
 * ATTENDANCE PERSISTENCE — per-date isolation and parent-facing accuracy.
 *
 * Guards two bugs found in production:
 *  1. A student's attendance for one date must never leak into another
 *     date's view (the teacher register, per-date fetch).
 *  2. The parent "child overview" must reflect TODAY's specific record —
 *     not silently fall back to whatever the most recent record ever was,
 *     which mislabels a stale day's status as "today".
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';

const S = 'ap-school', B = 'ap-main';
const ADMIN = 'ap-admin', TCH_U = 'ap-tch-u', STU_U = 'ap-stu-u', PARENT_U = 'ap-parent-u';
let classId = '', studentId = '', teacherId = '';

const tok = (id: string, role: string, branchId: string | null = null) => jwt.sign(
    { id, email: `${id}@x.com`, role, school_id: S, branch_id: branchId, allowed_branch_ids: [] },
    config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });

const asAdmin = () => tok(ADMIN, 'ADMIN');
const asTeacher = () => tok(TCH_U, 'TEACHER', B);
const asParent = () => tok(PARENT_U, 'PARENT', B);

const todayStr = () => new Date().toISOString().slice(0, 10);
const yesterdayStr = () => new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

async function cleanup() {
    for (const m of ['attendance', 'parentChild', 'classTeacher', 'studentEnrollment', 'parent', 'student', 'teacher', 'class', 'user', 'branch'] as const) {
        await (prisma as any)[m]?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
    }
    await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('Attendance persistence — per-date isolation + parent accuracy', () => {
    beforeAll(async () => {
        await cleanup();
        await prisma.school.create({ data: { id: S, name: 'AP', code: 'AP', slug: S, plan_type: 'enterprise', subscription_status: 'active' } });
        await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'APM', is_main: true } });
        await prisma.user.create({ data: { id: ADMIN, email: 'ap-admin@x.com', password_hash: 'x', full_name: 'AP Admin', role: 'ADMIN' as any, school_id: S, branch_id: null } });
        await prisma.user.create({ data: { id: TCH_U, email: 'ap-tch@x.com', password_hash: 'x', full_name: 'AP Teacher', role: 'TEACHER' as any, school_id: S, branch_id: B } });
        await prisma.user.create({ data: { id: STU_U, email: 'ap-stu@x.com', password_hash: 'x', full_name: 'AP Student', role: 'STUDENT' as any, school_id: S, branch_id: B } });
        await prisma.user.create({ data: { id: PARENT_U, email: 'ap-parent@x.com', password_hash: 'x', full_name: 'AP Parent', role: 'PARENT' as any, school_id: S, branch_id: B } });

        teacherId = (await prisma.teacher.create({ data: { user_id: TCH_U, school_id: S, branch_id: B, full_name: 'AP Teacher', subject_specialty: [], curriculum_eligibility: ['Nigerian'] } })).id;
        studentId = (await prisma.student.create({ data: { user_id: STU_U, school_id: S, branch_id: B, full_name: 'AP Student', grade: 10, section: 'A' } })).id;
        classId = (await prisma.class.create({ data: { school_id: S, branch_id: B, name: 'JSS1', grade: 10, section: 'A' } })).id;
        await prisma.classTeacher.create({ data: { school_id: S, branch_id: B, teacher_id: teacherId, class_id: classId } });
        await prisma.studentEnrollment.create({ data: { student_id: studentId, class_id: classId, school_id: S, branch_id: B, status: 'Active', is_primary: true } });

        const parentProfile = await prisma.parent.create({ data: { user_id: PARENT_U, school_id: S, branch_id: B, full_name: 'AP Parent' } });
        await prisma.parentChild.create({ data: { parent_id: parentProfile.id, student_id: studentId, school_id: S, branch_id: B } });

        // Yesterday: marked absent. This must never bleed into today's view.
        await prisma.attendance.create({
            data: { school_id: S, branch_id: B, student_id: studentId, class_id: classId, date: new Date(yesterdayStr()), status: 'absent' }
        });
    }, 60000);
    afterAll(cleanup, 60000);

    it('teacher fetching TODAY sees no record (not yesterday\'s absence)', async () => {
        const res = await request(app).get(`/api/attendance?classId=${classId}&date=${todayStr()}`)
            .set('Authorization', `Bearer ${asTeacher()}`);
        expect(res.status).toBe(200);
        expect(res.body.find((r: any) => r.student_id === studentId)).toBeUndefined();
    });

    it('teacher fetching YESTERDAY still sees the absence, isolated to that date', async () => {
        const res = await request(app).get(`/api/attendance?classId=${classId}&date=${yesterdayStr()}`)
            .set('Authorization', `Bearer ${asTeacher()}`);
        expect(res.status).toBe(200);
        const record = res.body.find((r: any) => r.student_id === studentId);
        expect(record?.status).toBe('absent');
    });

    it('parent overview shows "not_marked" for today, NOT yesterday\'s stale absence', async () => {
        const res = await request(app).get(`/api/parents/me/children/${studentId}/overview`)
            .set('Authorization', `Bearer ${asParent()}`);
        expect(res.status).toBe(200);
        expect(res.body.attendance.status).toBe('not_marked');
    });

    it('teacher marks today present — persists as its own row for today only', async () => {
        const res = await request(app).post('/api/attendance')
            .set('Authorization', `Bearer ${asTeacher()}`)
            .send({ records: [{ student_id: studentId, class_id: classId, date: todayStr(), status: 'present' }] });
        expect(res.status).toBe(200);

        const todayRes = await request(app).get(`/api/attendance?classId=${classId}&date=${todayStr()}`)
            .set('Authorization', `Bearer ${asTeacher()}`);
        expect(todayRes.body.find((r: any) => r.student_id === studentId)?.status).toBe('present');

        // Yesterday's row must be completely untouched by today's save.
        const yesterdayRes = await request(app).get(`/api/attendance?classId=${classId}&date=${yesterdayStr()}`)
            .set('Authorization', `Bearer ${asTeacher()}`);
        expect(yesterdayRes.body.find((r: any) => r.student_id === studentId)?.status).toBe('absent');
    });

    it('parent overview now reflects today\'s freshly-marked "present" — not the stale absence', async () => {
        const res = await request(app).get(`/api/parents/me/children/${studentId}/overview`)
            .set('Authorization', `Bearer ${asParent()}`);
        expect(res.status).toBe(200);
        expect(res.body.attendance.status).toBe('present');
    });

    it('admin per-date overview also reflects today\'s record correctly', async () => {
        const res = await request(app).get(`/api/attendance?date=${todayStr()}`)
            .set('Authorization', `Bearer ${asAdmin()}`);
        expect(res.status).toBe(200);
        const record = res.body.find((r: any) => r.student_id === studentId);
        expect(record?.status).toBe('present');
    });
});
