/**
 * STAFF SUBSTITUTE MANAGEMENT (real database).
 *
 * Covers: absence-driven coverage computation (only teachers marked Absent
 * today, cross-referenced with their published timetable), suggestion
 * ranking (same-subject first, busy teachers excluded), one-click assign +
 * full notification fan-out (substitute, original teacher, students,
 * parents), double-booking prevention, accept/decline lifecycle (decline
 * re-opens the period + notifies admins), history, and access control.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';

const S = 'sub-school', B = 'sub-main';
const ADMIN = 'sub-admin', TCH_ABSENT_U = 'sub-tch-absent-u', TCH_FREE_U = 'sub-tch-free-u', TCH_BUSY_U = 'sub-tch-busy-u';
let absentTeacherId = '', freeTeacherId = '', busyTeacherId = '';
let classId = '';
let studentUserId = '', parentUserId = '';
let timetableId = '';

const tok = (id: string, role: string, branchId: string | null = null) => jwt.sign(
    { id, email: `${id}@x.com`, role, school_id: S, branch_id: branchId, allowed_branch_ids: [] },
    config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });

const asAdmin = () => tok(ADMIN, 'ADMIN');
const asFreeTeacher = () => tok(TCH_FREE_U, 'TEACHER', B);
const asBusyTeacher = () => tok(TCH_BUSY_U, 'TEACHER', B);

const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const todayDow = () => { const d = new Date().getDay(); return d === 0 ? 7 : d; };

async function cleanup() {
    for (const m of ['substituteAssignment', 'timetable', 'teacherAttendance', 'parentChild', 'studentEnrollment', 'student', 'class', 'teacher', 'user', 'branch'] as const) {
        await (prisma as any)[m]?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
    }
    await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('Staff Substitute Management', () => {
    beforeAll(async () => {
        await cleanup();
        await prisma.school.create({ data: { id: S, name: 'SUB', code: 'SUB', slug: S, plan_type: 'enterprise', subscription_status: 'active' } });
        await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'SUBM', is_main: true } });
        await prisma.user.create({ data: { id: ADMIN, email: 'sub-admin@x.com', password_hash: 'x', full_name: 'Sub Admin', role: 'ADMIN' as any, school_id: S, branch_id: null } });

        for (const [uid, name] of [[TCH_ABSENT_U, 'Absent Teacher'], [TCH_FREE_U, 'Free Teacher'], [TCH_BUSY_U, 'Busy Teacher']] as const) {
            await prisma.user.create({ data: { id: uid, email: `${uid}@x.com`, password_hash: 'x', full_name: name, role: 'TEACHER' as any, school_id: S, branch_id: B } });
        }
        absentTeacherId = (await prisma.teacher.create({ data: { user_id: TCH_ABSENT_U, school_id: S, branch_id: B, full_name: 'Absent Teacher', subject_specialty: ['Mathematics'], curriculum_eligibility: ['Nigerian'] } })).id;
        freeTeacherId = (await prisma.teacher.create({ data: { user_id: TCH_FREE_U, school_id: S, branch_id: B, full_name: 'Free Teacher', subject_specialty: ['Mathematics'], curriculum_eligibility: ['Nigerian'] } })).id;
        busyTeacherId = (await prisma.teacher.create({ data: { user_id: TCH_BUSY_U, school_id: S, branch_id: B, full_name: 'Busy Teacher', subject_specialty: ['Mathematics'], curriculum_eligibility: ['Nigerian'] } })).id;

        classId = (await prisma.class.create({ data: { school_id: S, branch_id: B, name: 'JSS1A', grade: 7, section: 'A' } })).id;

        // The absent teacher's period today: 09:00–09:45, Mathematics.
        timetableId = (await prisma.timetable.create({
            data: { school_id: S, branch_id: B, class_id: classId, class_name: 'JSS1A', subject: 'Mathematics', teacher_id: absentTeacherId, day_of_week: todayDow(), start_time: '09:00', end_time: '09:45', status: 'Published' },
        })).id;
        // The "busy" teacher has an overlapping class at the same time elsewhere — must never be suggested.
        await prisma.timetable.create({
            data: { school_id: S, branch_id: B, class_name: 'JSS1B', subject: 'English', teacher_id: busyTeacherId, day_of_week: todayDow(), start_time: '09:00', end_time: '09:45', status: 'Published' },
        });

        // A student (+ parent) enrolled in the class, to verify notification fan-out.
        const studentUser = await prisma.user.create({ data: { id: 'sub-stu-u', email: 'sub-stu@x.com', password_hash: 'x', full_name: 'Sub Student', role: 'STUDENT' as any, school_id: S, branch_id: B } });
        studentUserId = studentUser.id;
        const student = await prisma.student.create({ data: { user_id: studentUser.id, school_id: S, branch_id: B, full_name: 'Sub Student', grade: 7 } });
        await prisma.studentEnrollment.create({ data: { student_id: student.id, class_id: classId, school_id: S, branch_id: B, status: 'Active' } });
        const parentUser = await prisma.user.create({ data: { id: 'sub-parent-u', email: 'sub-parent@x.com', password_hash: 'x', full_name: 'Sub Parent', role: 'PARENT' as any, school_id: S, branch_id: B } });
        parentUserId = parentUser.id;
        const parent = await prisma.parent.create({ data: { user_id: parentUser.id, school_id: S, branch_id: B, full_name: 'Sub Parent' } });
        await prisma.parentChild.create({ data: { parent_id: parent.id, student_id: student.id, school_id: S, branch_id: B } });

        // Mark the absent teacher Absent for TODAY via the real admin attendance endpoint —
        // this is what triggers the admin "coverage needed" notification.
        await request(app).post('/api/teachers/attendance').set('Authorization', `Bearer ${asAdmin()}`)
            .send({ records: [{ teacher_id: absentTeacherId, date: todayStr(), status: 'Absent', branch_id: B }] });
    }, 60000);
    afterAll(cleanup, 60000);

    it('marking the teacher absent notified admins that coverage is needed', async () => {
        const notif = await prisma.notification.findFirst({ where: { school_id: S, user_id: ADMIN, title: { contains: 'Coverage Needed' } } });
        expect(notif).toBeTruthy();
    });

    it('coverage-needed lists the period with the busy teacher excluded and the free teacher ranked by subject match', async () => {
        const res = await request(app).get(`/api/substitutes/coverage?date=${todayStr()}`).set('Authorization', `Bearer ${asAdmin()}`);
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(1);
        const period = res.body[0];
        expect(period.subject).toBe('Mathematics');
        expect(period.original_teacher_name).toBe('Absent Teacher');

        const suggestedIds = period.suggestions.map((s: any) => s.teacher_id);
        expect(suggestedIds).toContain(freeTeacherId);
        expect(suggestedIds).not.toContain(busyTeacherId); // has a clashing class
        expect(suggestedIds).not.toContain(absentTeacherId); // can't sub for themselves

        const freeSuggestion = period.suggestions.find((s: any) => s.teacher_id === freeTeacherId);
        expect(freeSuggestion.match_reason).toMatch(/subject/i);
    });

    it('teachers cannot view coverage or assign substitutes', async () => {
        const res = await request(app).get(`/api/substitutes/coverage?date=${todayStr()}`).set('Authorization', `Bearer ${asFreeTeacher()}`);
        expect(res.status).toBe(403);
    });

    it('one-click assign creates the record and notifies substitute + original teacher + student + parent', async () => {
        const res = await request(app).post('/api/substitutes/assign').set('Authorization', `Bearer ${asAdmin()}`)
            .send({ timetable_id: timetableId, date: todayStr(), substitute_teacher_id: freeTeacherId });
        expect(res.status).toBe(201);
        expect(res.body.status).toBe('Assigned');
        expect(res.body.substitute_teacher_id).toBe(freeTeacherId);

        const subNotif = await prisma.notification.findFirst({ where: { school_id: S, user_id: TCH_FREE_U, title: { contains: 'Substitute' } } });
        expect(subNotif).toBeTruthy();
        const origNotif = await prisma.notification.findFirst({ where: { school_id: S, user_id: TCH_ABSENT_U, title: { contains: 'Covered' } } });
        expect(origNotif).toBeTruthy();
        const studentNotif = await prisma.notification.findFirst({ where: { school_id: S, user_id: studentUserId, title: { contains: 'Class Update' } } });
        expect(studentNotif).toBeTruthy();
        const parentNotif = await prisma.notification.findFirst({ where: { school_id: S, user_id: parentUserId, title: { contains: 'Class Update' } } });
        expect(parentNotif).toBeTruthy();
    });

    it('the covered period no longer appears in coverage-needed', async () => {
        const res = await request(app).get(`/api/substitutes/coverage?date=${todayStr()}`).set('Authorization', `Bearer ${asAdmin()}`);
        expect(res.body.length).toBe(0);
    });

    it('cannot double-book the same period again', async () => {
        const res = await request(app).post('/api/substitutes/assign').set('Authorization', `Bearer ${asAdmin()}`)
            .send({ timetable_id: timetableId, date: todayStr(), substitute_teacher_id: busyTeacherId });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/already/i);
    });

    it('cannot assign a substitute who already has a class at that time', async () => {
        // Free up the period first by declining, so we can test the busy-teacher guard on assign.
        const assignment = await (prisma as any).substituteAssignment.findFirst({ where: { school_id: S } });
        await request(app).post(`/api/substitutes/${assignment.id}/respond`).set('Authorization', `Bearer ${asFreeTeacher()}`).send({ response: 'Declined' });

        const res = await request(app).post('/api/substitutes/assign').set('Authorization', `Bearer ${asAdmin()}`)
            .send({ timetable_id: timetableId, date: todayStr(), substitute_teacher_id: busyTeacherId });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/already has a class/i);
    });

    it('declining notified the admins to reassign', async () => {
        const notif = await prisma.notification.findFirst({ where: { school_id: S, user_id: ADMIN, title: { contains: 'Declined' } } });
        expect(notif).toBeTruthy();
    });

    it('a declined period reappears in coverage-needed for reassignment', async () => {
        const res = await request(app).get(`/api/substitutes/coverage?date=${todayStr()}`).set('Authorization', `Bearer ${asAdmin()}`);
        expect(res.body.length).toBe(1);
    });

    it('reassigning to the free teacher again succeeds, and they can accept it', async () => {
        const res = await request(app).post('/api/substitutes/assign').set('Authorization', `Bearer ${asAdmin()}`)
            .send({ timetable_id: timetableId, date: todayStr(), substitute_teacher_id: freeTeacherId });
        expect(res.status).toBe(201);

        const accept = await request(app).post(`/api/substitutes/${res.body.id}/respond`).set('Authorization', `Bearer ${asFreeTeacher()}`).send({ response: 'Accepted' });
        expect(accept.status).toBe(200);
        expect(accept.body.status).toBe('Accepted');
    });

    it('another teacher cannot respond to an assignment not addressed to them', async () => {
        const assignment = await (prisma as any).substituteAssignment.findFirst({ where: { school_id: S, status: 'Accepted' } });
        const res = await request(app).post(`/api/substitutes/${assignment.id}/respond`).set('Authorization', `Bearer ${asBusyTeacher()}`).send({ response: 'Declined' });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/not addressed/i);
    });

    it('an already-responded assignment cannot be responded to again', async () => {
        const assignment = await (prisma as any).substituteAssignment.findFirst({ where: { school_id: S, status: 'Accepted' } });
        const res = await request(app).post(`/api/substitutes/${assignment.id}/respond`).set('Authorization', `Bearer ${asFreeTeacher()}`).send({ response: 'Declined' });
        expect(res.status).toBe(400);
    });

    it('history shows both the declined and the accepted assignment with resolved names', async () => {
        const res = await request(app).get(`/api/substitutes/history?date=${todayStr()}`).set('Authorization', `Bearer ${asAdmin()}`);
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(2);
        expect(res.body.every((r: any) => r.original_teacher_name === 'Absent Teacher')).toBe(true);
        expect(res.body.some((r: any) => r.status === 'Declined')).toBe(true);
        expect(res.body.some((r: any) => r.status === 'Accepted')).toBe(true);
    });

    it('the substitute teacher sees the assignment in "mine"', async () => {
        const res = await request(app).get('/api/substitutes/mine').set('Authorization', `Bearer ${asFreeTeacher()}`);
        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThanOrEqual(1);
        expect(res.body[0].original_teacher_name).toBe('Absent Teacher');
    });

    it('another school cannot see or assign against this data', async () => {
        await prisma.school.create({ data: { id: 'sub-other-school', name: 'SUB2', code: 'SUB2', slug: 'sub-other-school', plan_type: 'enterprise', subscription_status: 'active' } }).catch(() => {});
        await prisma.user.create({ data: { id: 'sub-foreign-admin', email: 'sub-foreign@x.com', password_hash: 'x', full_name: 'Foreign Admin', role: 'ADMIN' as any, school_id: 'sub-other-school', branch_id: null } }).catch(() => {});
        const foreignTok = jwt.sign(
            { id: 'sub-foreign-admin', email: 'sub-foreign@x.com', role: 'ADMIN', school_id: 'sub-other-school', branch_id: null, allowed_branch_ids: [] },
            config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });

        const res = await request(app).post('/api/substitutes/assign').set('Authorization', `Bearer ${foreignTok}`)
            .send({ timetable_id: timetableId, date: todayStr(), substitute_teacher_id: freeTeacherId });
        expect(res.status).toBe(404);

        await prisma.user.delete({ where: { id: 'sub-foreign-admin' } }).catch(() => {});
        await prisma.school.delete({ where: { id: 'sub-other-school' } }).catch(() => {});
    });
});
