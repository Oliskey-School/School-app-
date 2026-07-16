/**
 * CLASSROOM OBSERVATION MODULE (real database).
 *
 * Covers: default rubric template auto-creation, score/grade computation,
 * validation (score bounds, unknown criteria), teacher notification, and
 * access control (only admins create; teachers see only their own).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';

const S = 'obs-school', B = 'obs-main';
const ADMIN = 'obs-admin', TEACHER_U = 'obs-teacher-u', OTHER_TEACHER_U = 'obs-other-teacher-u';
let teacherId = '', otherTeacherId = '', classId = '';

const tok = (id: string, role: string, branchId: string | null = null) => jwt.sign(
    { id, email: `${id}@x.com`, role, school_id: S, branch_id: branchId, allowed_branch_ids: [] },
    config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });

const asAdmin = () => tok(ADMIN, 'ADMIN');
const asTeacher = () => tok(TEACHER_U, 'TEACHER', B);
const asOtherTeacher = () => tok(OTHER_TEACHER_U, 'TEACHER', B);

async function cleanup() {
    for (const m of ['observationResponse', 'classroomObservation', 'observationTemplate', 'class', 'teacher', 'user', 'branch'] as const) {
        await (prisma as any)[m]?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
    }
    await (prisma as any).observationTemplate.deleteMany({ where: { school_id: S } }).catch(() => {});
    await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('Classroom Observation Module', () => {
    let fullScores: { criterion_key: string; score: number }[];

    beforeAll(async () => {
        await cleanup();
        await prisma.school.create({ data: { id: S, name: 'OBS', code: 'OBS', slug: S, plan_type: 'enterprise', subscription_status: 'active' } });
        await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'OBSM', is_main: true } });
        await prisma.user.create({ data: { id: ADMIN, email: 'obs-admin@x.com', password_hash: 'x', full_name: 'Obs Admin', role: 'ADMIN' as any, school_id: S, branch_id: null } });
        await prisma.user.create({ data: { id: TEACHER_U, email: 'obs-teacher@x.com', password_hash: 'x', full_name: 'Observed Teacher', role: 'TEACHER' as any, school_id: S, branch_id: B } });
        await prisma.user.create({ data: { id: OTHER_TEACHER_U, email: 'obs-other-teacher@x.com', password_hash: 'x', full_name: 'Other Teacher', role: 'TEACHER' as any, school_id: S, branch_id: B } });

        teacherId = (await prisma.teacher.create({ data: { user_id: TEACHER_U, school_id: S, branch_id: B, full_name: 'Observed Teacher' } })).id;
        otherTeacherId = (await prisma.teacher.create({ data: { user_id: OTHER_TEACHER_U, school_id: S, branch_id: B, full_name: 'Other Teacher' } })).id;
        classId = (await prisma.class.create({ data: { school_id: S, branch_id: B, name: 'SS2A', grade: 10, section: 'A' } })).id;
    }, 60000);
    afterAll(cleanup, 60000);

    it('non-admins cannot record an observation', async () => {
        const res = await request(app).post('/api/observations').set('Authorization', `Bearer ${asTeacher()}`)
            .send({ teacher_id: teacherId, date: '2026-01-10', scores: [] });
        expect(res.status).toBe(403);
    });

    it('fetching the template auto-creates the default 5-criteria rubric', async () => {
        const res = await request(app).get('/api/observations/template').set('Authorization', `Bearer ${asAdmin()}`);
        expect(res.status).toBe(200);
        expect(res.body.criteria.length).toBe(5);
        const keys = res.body.criteria.map((c: any) => c.key);
        expect(keys).toEqual(['lesson_prep', 'teaching_method', 'student_participation', 'classroom_management', 'time_management']);
        fullScores = res.body.criteria.map((c: any) => ({ criterion_key: c.key, score: c.max_score }));
    });

    it('rejects a score above the criterion max', async () => {
        const res = await request(app).post('/api/observations').set('Authorization', `Bearer ${asAdmin()}`)
            .send({ teacher_id: teacherId, date: '2026-01-10', scores: [{ criterion_key: 'lesson_prep', score: 999 }] });
        expect(res.status).toBe(400);
    });

    it('rejects an unknown criterion key', async () => {
        const res = await request(app).post('/api/observations').set('Authorization', `Bearer ${asAdmin()}`)
            .send({ teacher_id: teacherId, date: '2026-01-10', scores: [{ criterion_key: 'nonexistent', score: 5 }] });
        expect(res.status).toBe(400);
    });

    it('a full-marks observation computes 100% and grade A, and notifies the teacher', async () => {
        const res = await request(app).post('/api/observations').set('Authorization', `Bearer ${asAdmin()}`)
            .send({ teacher_id: teacherId, class_id: classId, date: '2026-01-10', scores: fullScores, notes: 'Excellent lesson' });
        expect(res.status).toBe(201);
        expect(res.body.overall_score).toBe(100);
        expect(res.body.overall_grade).toBe('A');

        const notif = await prisma.notification.findFirst({ where: { school_id: S, title: { contains: 'Observation' } } });
        expect(notif).toBeTruthy();
    });

    it('the observed teacher sees their own observation with per-criterion scores', async () => {
        const res = await request(app).get('/api/observations/mine').set('Authorization', `Bearer ${asTeacher()}`);
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(1);
        expect(res.body[0].responses.length).toBe(5);
    });

    it('a different teacher sees no observations of their own', async () => {
        const res = await request(app).get('/api/observations/mine').set('Authorization', `Bearer ${asOtherTeacher()}`);
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(0);
    });

    it('admin can view observation history for a specific teacher', async () => {
        const res = await request(app).get(`/api/observations/teacher/${teacherId}`).set('Authorization', `Bearer ${asAdmin()}`);
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(1);
    });
});
