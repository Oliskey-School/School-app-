/**
 * QR LESSON ATTENDANCE (real database) — teacher scans a classroom QR to mark
 * the start and end of a scheduled lesson; admin sees the verification report.
 *
 * Covers: classroom CRUD + role guard, room-name backfill onto the timetable,
 * scan-in/scan-out flow (with late + early-departure flags), window
 * enforcement, cross-school token rejection, and the admin daily report.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';

const S = 'qrla-school', B = 'qrla-main', S2 = 'qrla-other-school', B2 = 'qrla-other-main';
const ADMIN = 'qrla-admin', TCH_U = 'qrla-tch-u';
let teacherId = '';
let otherToken = '';

const tok = (id: string, role: string, schoolId = S, branchId: string | null = null) => jwt.sign(
    { id, email: `${id}@x.com`, role, school_id: schoolId, branch_id: branchId, allowed_branch_ids: [] },
    config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });

const asAdmin = () => tok(ADMIN, 'ADMIN');
const asTeacher = () => tok(TCH_U, 'TEACHER', S, B);

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const minsFromNow = (mins: number) => new Date(Date.now() + mins * 60_000);
const todayDow = () => (new Date().getDay() === 0 ? 7 : new Date().getDay());

async function makeLesson(classroomId: string | null, startMin: number, endMin: number, extra: any = {}) {
    return await prisma.timetable.create({
        data: {
            school_id: S, branch_id: B, subject: extra.subject || 'Mathematics',
            class_name: 'SSS 1', teacher_id: teacherId,
            day_of_week: todayDow(),
            start_time: hhmm(minsFromNow(startMin)), end_time: hhmm(minsFromNow(endMin)),
            status: 'Published',
            ...(classroomId ? { classroom_id: classroomId } : {}),
            ...extra.data,
        } as any
    });
}

async function cleanup() {
    for (const school of [S, S2]) {
        for (const m of ['lessonAttendance', 'timetable', 'classroom', 'teacher', 'user', 'branch'] as const) {
            await (prisma as any)[m]?.deleteMany?.({ where: { school_id: school } }).catch(() => {});
        }
        await prisma.school.delete({ where: { id: school } }).catch(() => {});
    }
}

describe('QR lesson attendance', () => {
    beforeAll(async () => {
        await cleanup();
        await prisma.school.create({ data: { id: S, name: 'QRLA', code: 'QRLA', slug: S, plan_type: 'enterprise', subscription_status: 'active' } });
        await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'QRLM', is_main: true } });
        await prisma.user.create({ data: { id: ADMIN, email: 'qrla-admin@x.com', password_hash: 'x', full_name: 'QRLA Admin', role: 'ADMIN' as any, school_id: S, branch_id: null } });
        await prisma.user.create({ data: { id: TCH_U, email: 'qrla-tch@x.com', password_hash: 'x', full_name: 'QRLA Teacher', role: 'TEACHER' as any, school_id: S, branch_id: B } });
        teacherId = (await prisma.teacher.create({ data: { user_id: TCH_U, school_id: S, branch_id: B, full_name: 'QRLA Teacher', subject_specialty: [], curriculum_eligibility: ['Nigerian'] } })).id;

        // A second, fully isolated school with its own classroom.
        await prisma.school.create({ data: { id: S2, name: 'QRLA2', code: 'QRLA2', slug: S2, plan_type: 'enterprise', subscription_status: 'active' } });
        await prisma.branch.create({ data: { id: B2, school_id: S2, name: 'Main', code: 'QRL2', is_main: true } });
        otherToken = (await (prisma as any).classroom.create({
            data: { school_id: S2, branch_id: B2, name: 'Other Room', qr_token: 'qrla-other-school-token' }
        })).qr_token;
    }, 60000);
    afterAll(cleanup, 60000);

    let roomA: any;     // classroom used for the happy-path scan flow
    let lessonNow: any; // lesson currently in progress in roomA

    it('admin creates a classroom and gets a permanent QR token', async () => {
        const res = await request(app).post('/api/classrooms')
            .set('Authorization', `Bearer ${asAdmin()}`).set('X-Branch-Id', B)
            .send({ name: 'QR Room 1', branch_id: B, capacity: 30 });
        expect(res.status).toBe(201);
        expect(res.body.qr_token).toMatch(/^OSK-ROOM-/);
        expect(res.body.branch_id).toBe(B);
        roomA = res.body;
    });

    it('teacher cannot create classrooms', async () => {
        const res = await request(app).post('/api/classrooms')
            .set('Authorization', `Bearer ${asTeacher()}`)
            .send({ name: 'Hack Room', branch_id: B });
        expect(res.status).toBe(403);
    });

    it('creating a classroom backfills timetable rows with the same room name', async () => {
        const lesson = await prisma.timetable.create({
            data: {
                school_id: S, branch_id: B, subject: 'English', class_name: 'SSS 1',
                teacher_id: teacherId, day_of_week: todayDow(),
                start_time: '07:00', end_time: '07:45', status: 'Published', room: 'QR Room 2',
            }
        });
        const res = await request(app).post('/api/classrooms')
            .set('Authorization', `Bearer ${asAdmin()}`).set('X-Branch-Id', B)
            .send({ name: 'qr room 2', branch_id: B }); // case-insensitive match
        expect(res.status).toBe(201);
        const linked = await prisma.timetable.findUnique({ where: { id: lesson.id } });
        expect((linked as any)?.classroom_id).toBe(res.body.id);
    });

    it('scan-in during the lesson window starts the lesson (not late within grace)', async () => {
        lessonNow = await makeLesson(roomA.id, -5, 40); // started 5 min ago (within 10-min grace)
        const res = await request(app).post('/api/classrooms/scan')
            .set('Authorization', `Bearer ${asTeacher()}`)
            .send({ qr_token: roomA.qr_token });
        expect(res.status).toBe(200);
        expect(res.body.action).toBe('in');
        expect(res.body.record.is_late).toBe(false);
        expect(res.body.record.status).toBe('in_progress');
    });

    it('second scan of the same QR ends the lesson with a duration (early departure flagged)', async () => {
        const res = await request(app).post('/api/classrooms/scan')
            .set('Authorization', `Bearer ${asTeacher()}`)
            .send({ qr_token: roomA.qr_token });
        expect(res.status).toBe(200);
        expect(res.body.action).toBe('out');
        expect(res.body.record.status).toBe('completed');
        expect(res.body.record.duration_minutes).toBeGreaterThanOrEqual(0);
        // Lesson still has ~40 min to run, so leaving now is an early departure.
        expect(res.body.record.is_early_departure).toBe(true);
    });

    it('a third scan is rejected — the lesson is already completed', async () => {
        const res = await request(app).post('/api/classrooms/scan')
            .set('Authorization', `Bearer ${asTeacher()}`)
            .send({ qr_token: roomA.qr_token });
        expect(res.status).toBe(400);
    });

    it('scan-in past the grace period is flagged late', async () => {
        const roomRes = await request(app).post('/api/classrooms')
            .set('Authorization', `Bearer ${asAdmin()}`).set('X-Branch-Id', B)
            .send({ name: 'QR Room Late', branch_id: B });
        await makeLesson(roomRes.body.id, -20, 30, { subject: 'Physics' }); // started 20 min ago
        const res = await request(app).post('/api/classrooms/scan')
            .set('Authorization', `Bearer ${asTeacher()}`)
            .send({ qr_token: roomRes.body.qr_token });
        expect(res.status).toBe(200);
        expect(res.body.record.is_late).toBe(true);
    });

    it('rejects a scan when no lesson is scheduled in that room now', async () => {
        const roomRes = await request(app).post('/api/classrooms')
            .set('Authorization', `Bearer ${asAdmin()}`).set('X-Branch-Id', B)
            .send({ name: 'QR Room Future', branch_id: B });
        await makeLesson(roomRes.body.id, 120, 160, { subject: 'Chemistry' }); // starts in 2h
        const res = await request(app).post('/api/classrooms/scan')
            .set('Authorization', `Bearer ${asTeacher()}`)
            .send({ qr_token: roomRes.body.qr_token });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/not time/i);
    });

    it('rejects a QR token from another school', async () => {
        const res = await request(app).post('/api/classrooms/scan')
            .set('Authorization', `Bearer ${asTeacher()}`)
            .send({ qr_token: otherToken });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/not a valid classroom/i);
    });

    it('admins cannot scan', async () => {
        const res = await request(app).post('/api/classrooms/scan')
            .set('Authorization', `Bearer ${asAdmin()}`)
            .send({ qr_token: roomA.qr_token });
        expect(res.status).toBe(403);
    });

    it('admin daily report joins the timetable with scan records', async () => {
        const res = await request(app).get('/api/classrooms/lesson-attendance/report')
            .set('Authorization', `Bearer ${asAdmin()}`);
        expect(res.status).toBe(200);

        const rows = res.body.lessons as any[];
        const done = rows.find(r => r.timetable_id === lessonNow.id);
        expect(done).toBeTruthy();
        expect(done.status).toBe('completed');
        expect(done.is_early_departure).toBe(true);
        expect(done.teacher_name).toBe('QRLA Teacher');

        // The teacher summary aggregates the day.
        const summary = (res.body.summary as any[]).find(s => s.teacher_id === teacherId);
        expect(summary).toBeTruthy();
        expect(summary.assigned).toBeGreaterThanOrEqual(3);
        expect(summary.completed).toBeGreaterThanOrEqual(1);
        expect(summary.late).toBeGreaterThanOrEqual(1);
    });

    it('teachers cannot read the admin report', async () => {
        const res = await request(app).get('/api/classrooms/lesson-attendance/report')
            .set('Authorization', `Bearer ${asTeacher()}`);
        expect(res.status).toBe(403);
    });

    it('teacher sees their own scans for today', async () => {
        const res = await request(app).get('/api/classrooms/lesson-attendance/mine/today')
            .set('Authorization', `Bearer ${asTeacher()}`);
        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThanOrEqual(2);
    });
});
