/**
 * TEACHER MANAGEMENT SYSTEM — Class Teacher / Subject Teacher roles (real DB).
 *
 * Covers: assigning both roles independently and together, single-active-
 * class-teacher business rule (blocked without `force`, replaces with
 * `force`), the co-class-teacher school setting allowing two at once,
 * duplicate subject-teacher prevention, one teacher spanning multiple
 * classes as a subject teacher, ending an assignment as permanent history
 * (never deleted), the adaptive "my roles" endpoint, the "My Class" hub
 * being restricted to the class's own active Class Teacher, and admin-only
 * access control.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';

const S = 'ta-school', B = 'ta-main';
const ADMIN = 'ta-admin', TCH1_U = 'ta-tch1-u', TCH2_U = 'ta-tch2-u', TCH3_U = 'ta-tch3-u';
let teacher1Id = '', teacher2Id = '', teacher3Id = '';
let classAId = '', classBId = '';
let mathSubjectId = '', engSubjectId = '';

const tok = (id: string, role: string, branchId: string | null = null) => jwt.sign(
    { id, email: `${id}@x.com`, role, school_id: S, branch_id: branchId, allowed_branch_ids: [] },
    config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });

const asAdmin = () => tok(ADMIN, 'ADMIN');
const asTeacher1 = () => tok(TCH1_U, 'TEACHER', B);
const asTeacher2 = () => tok(TCH2_U, 'TEACHER', B);
const asTeacher3 = () => tok(TCH3_U, 'TEACHER', B);

async function cleanup() {
    for (const m of ['classTeacher', 'studentEnrollment', 'class', 'subject', 'teacher', 'user', 'branch'] as const) {
        await (prisma as any)[m]?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
    }
    await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('Teacher assignments — Class Teacher / Subject Teacher roles', () => {
    beforeAll(async () => {
        await cleanup();
        await prisma.school.create({ data: { id: S, name: 'TA', code: 'TA', slug: S, plan_type: 'enterprise', subscription_status: 'active' } });
        await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'TAM', is_main: true } });
        await prisma.user.create({ data: { id: ADMIN, email: 'ta-admin@x.com', password_hash: 'x', full_name: 'TA Admin', role: 'ADMIN' as any, school_id: S, branch_id: null } });

        for (const [uid, name] of [[TCH1_U, 'Teacher One'], [TCH2_U, 'Teacher Two'], [TCH3_U, 'Teacher Three']] as const) {
            await prisma.user.create({ data: { id: uid, email: `${uid}@x.com`, password_hash: 'x', full_name: name, role: 'TEACHER' as any, school_id: S, branch_id: B } });
        }
        teacher1Id = (await prisma.teacher.create({ data: { user_id: TCH1_U, school_id: S, branch_id: B, full_name: 'Teacher One', subject_specialty: [], curriculum_eligibility: ['Nigerian'] } })).id;
        teacher2Id = (await prisma.teacher.create({ data: { user_id: TCH2_U, school_id: S, branch_id: B, full_name: 'Teacher Two', subject_specialty: [], curriculum_eligibility: ['Nigerian'] } })).id;
        teacher3Id = (await prisma.teacher.create({ data: { user_id: TCH3_U, school_id: S, branch_id: B, full_name: 'Teacher Three', subject_specialty: [], curriculum_eligibility: ['Nigerian'] } })).id;

        classAId = (await prisma.class.create({ data: { school_id: S, branch_id: B, name: 'JSS1A', grade: 7, section: 'A' } })).id;
        classBId = (await prisma.class.create({ data: { school_id: S, branch_id: B, name: 'JSS1B', grade: 7, section: 'B' } })).id;
        mathSubjectId = (await prisma.subject.create({ data: { school_id: S, branch_id: B, name: 'Mathematics' } })).id;
        engSubjectId = (await prisma.subject.create({ data: { school_id: S, branch_id: B, name: 'English' } })).id;
    }, 60000);
    afterAll(cleanup, 60000);

    it('admin assigns Teacher One as Class Teacher of Class A', async () => {
        const res = await request(app).post('/api/teacher-assignments/class-teacher')
            .set('Authorization', `Bearer ${asAdmin()}`)
            .send({ teacher_id: teacher1Id, class_id: classAId });
        expect(res.status).toBe(201);
        expect(res.body.role).toBe('class_teacher');
        expect(res.body.status).toBe('active');
    });

    it('teachers cannot assign class teachers', async () => {
        const res = await request(app).post('/api/teacher-assignments/class-teacher')
            .set('Authorization', `Bearer ${asTeacher1()}`)
            .send({ teacher_id: teacher2Id, class_id: classBId });
        expect(res.status).toBe(403);
    });

    it('assigning a second Class Teacher to the same class requires confirmation (409) without co-teachers enabled', async () => {
        const res = await request(app).post('/api/teacher-assignments/class-teacher')
            .set('Authorization', `Bearer ${asAdmin()}`)
            .send({ teacher_id: teacher2Id, class_id: classAId });
        expect(res.status).toBe(409);
        expect(res.body.requiresConfirmation).toBe(true);
        expect(res.body.currentTeacherName).toBe('Teacher One');
    });

    it('force replaces the previous Class Teacher, ending it as permanent history (not deleted)', async () => {
        const res = await request(app).post('/api/teacher-assignments/class-teacher')
            .set('Authorization', `Bearer ${asAdmin()}`)
            .send({ teacher_id: teacher2Id, class_id: classAId, force: true });
        expect(res.status).toBe(201);

        const history = await request(app).get(`/api/teacher-assignments/teacher/${teacher1Id}/history`)
            .set('Authorization', `Bearer ${asAdmin()}`);
        expect(history.status).toBe(200);
        const endedRow = history.body.find((r: any) => r.class_id === classAId);
        expect(endedRow).toBeTruthy();
        expect(endedRow.status).toBe('ended');
        expect(endedRow.ended_at).toBeTruthy();
    });

    it('enabling co-class-teachers allows two active Class Teachers on one class', async () => {
        const enable = await request(app).put('/api/teacher-assignments/settings/co-class-teachers')
            .set('Authorization', `Bearer ${asAdmin()}`)
            .send({ allow_co_class_teachers: true });
        expect(enable.status).toBe(200);
        expect(enable.body.allow_co_class_teachers).toBe(true);

        const res = await request(app).post('/api/teacher-assignments/class-teacher')
            .set('Authorization', `Bearer ${asAdmin()}`)
            .send({ teacher_id: teacher1Id, class_id: classAId });
        expect(res.status).toBe(201);

        const active = await request(app).get(`/api/teacher-assignments?role=class_teacher&classId=${classAId}`)
            .set('Authorization', `Bearer ${asAdmin()}`);
        expect(active.body.filter((r: any) => r.status === 'active').length).toBe(2);

        // Disable again for the rest of the suite.
        await request(app).put('/api/teacher-assignments/settings/co-class-teachers')
            .set('Authorization', `Bearer ${asAdmin()}`)
            .send({ allow_co_class_teachers: false });
    });

    it('assigns Teacher One as a Subject Teacher (Mathematics) across two classes in one call', async () => {
        const res = await request(app).post('/api/teacher-assignments/subject-teacher')
            .set('Authorization', `Bearer ${asAdmin()}`)
            .send({ teacher_id: teacher1Id, subject_id: mathSubjectId, class_ids: [classAId, classBId], periods_per_week: 5 });
        expect(res.status).toBe(201);
        expect(res.body.created.length).toBe(2);
    });

    it('rejects a duplicate subject-teacher assignment for the same class', async () => {
        const res = await request(app).post('/api/teacher-assignments/subject-teacher')
            .set('Authorization', `Bearer ${asAdmin()}`)
            .send({ teacher_id: teacher1Id, subject_id: mathSubjectId, class_ids: [classAId] });
        expect(res.status).toBe(400);
    });

    it('a different teacher can teach a different subject in the same classes (no conflict)', async () => {
        const res = await request(app).post('/api/teacher-assignments/subject-teacher')
            .set('Authorization', `Bearer ${asAdmin()}`)
            .send({ teacher_id: teacher3Id, subject_id: engSubjectId, class_ids: [classAId, classBId] });
        expect(res.status).toBe(201);
        expect(res.body.created.length).toBe(2);
    });

    it('Teacher One now has BOTH roles; Teacher Three has ONLY subject_teacher', async () => {
        const t1 = await request(app).get('/api/teacher-assignments/mine/roles').set('Authorization', `Bearer ${asTeacher1()}`);
        expect(t1.status).toBe(200);
        expect(t1.body.roles.sort()).toEqual(['class_teacher', 'subject_teacher']);
        expect(t1.body.class_teacher_of.length).toBeGreaterThanOrEqual(1);
        expect(t1.body.subject_assignments.length).toBe(2);

        const t3tok = tok(TCH3_U, 'TEACHER', B);
        const t3 = await request(app).get('/api/teacher-assignments/mine/roles').set('Authorization', `Bearer ${t3tok}`);
        expect(t3.body.roles).toEqual(['subject_teacher']);
    });

    it('workload summary aggregates each teacher\'s classes, subjects, and total periods', async () => {
        const res = await request(app).get('/api/teacher-assignments/workload').set('Authorization', `Bearer ${asAdmin()}`);
        expect(res.status).toBe(200);
        const t1Workload = res.body.find((w: any) => w.teacher_id === teacher1Id);
        expect(t1Workload.subject_classes.length).toBe(2);
        expect(t1Workload.total_periods).toBe(10);
    });

    it('"My Class" hub is only visible to the class\'s active Class Teacher', async () => {
        const ok = await request(app).get(`/api/teacher-assignments/mine/class/${classAId}`).set('Authorization', `Bearer ${asTeacher1()}`);
        expect(ok.status).toBe(200);
        expect(ok.body.class.name).toBe('JSS1A');
        expect(Array.isArray(ok.body.roster)).toBe(true);
        expect(Array.isArray(ok.body.timetable)).toBe(true);

        // Teacher Three is only a Subject Teacher of Class A, never a Class Teacher —
        // must be denied. (Teacher Two is deliberately not used here: the earlier
        // co-teacher test left them ALSO an active Class Teacher of Class A.)
        const denied = await request(app).get(`/api/teacher-assignments/mine/class/${classAId}`).set('Authorization', `Bearer ${asTeacher3()}`);
        expect(denied.status).toBe(403);
    });

    it('ending an assignment marks it ended, never deletes it', async () => {
        const list = await request(app).get(`/api/teacher-assignments?teacherId=${teacher3Id}`).set('Authorization', `Bearer ${asAdmin()}`);
        const row = list.body[0];
        const res = await request(app).delete(`/api/teacher-assignments/${row.id}`).set('Authorization', `Bearer ${asAdmin()}`);
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ended');

        const stillExists = await (prisma as any).classTeacher.findUnique({ where: { id: row.id } });
        expect(stillExists).toBeTruthy();
        expect(stillExists.status).toBe('ended');
    });

    it('another school cannot see or act on these assignments', async () => {
        await prisma.school.create({ data: { id: 'ta-other-school', name: 'TA2', code: 'TA2', slug: 'ta-other-school', plan_type: 'enterprise', subscription_status: 'active' } }).catch(() => {});
        await prisma.user.create({ data: { id: 'ta-foreign-admin', email: 'ta-foreign@x.com', password_hash: 'x', full_name: 'Foreign Admin', role: 'ADMIN' as any, school_id: 'ta-other-school', branch_id: null } }).catch(() => {});
        const foreignTok = jwt.sign(
            { id: 'ta-foreign-admin', email: 'ta-foreign@x.com', role: 'ADMIN', school_id: 'ta-other-school', branch_id: null, allowed_branch_ids: [] },
            config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });
        const res = await request(app).post('/api/teacher-assignments/class-teacher')
            .set('Authorization', `Bearer ${foreignTok}`)
            .send({ teacher_id: teacher1Id, class_id: classAId });
        expect(res.status).toBe(404);

        await prisma.user.delete({ where: { id: 'ta-foreign-admin' } }).catch(() => {});
        await prisma.school.delete({ where: { id: 'ta-other-school' } }).catch(() => {});
    });
});
