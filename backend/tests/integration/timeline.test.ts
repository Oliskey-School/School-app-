/**
 * SCHOOL TIMELINE (real database).
 *
 * Covers: auto-derived events (admission, suspension, exit) synthesized from
 * existing data, manually added custom entries, chronological ordering, and
 * access control (only admins add/remove).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';

const S = 'timeline-school', B = 'timeline-main';
const ADMIN = 'timeline-admin', TEACHER_U = 'timeline-teacher-u', STUDENT_U = 'timeline-student-u';
let studentId = '', teacherId = '';

const tok = (id: string, role: string, branchId: string | null = null) => jwt.sign(
    { id, email: `${id}@x.com`, role, school_id: S, branch_id: branchId, allowed_branch_ids: [] },
    config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });

const asAdmin = () => tok(ADMIN, 'ADMIN');
const asTeacher = () => tok(TEACHER_U, 'TEACHER', B);

async function cleanup() {
    for (const m of ['lifeEvent', 'studentSuspension', 'achievement', 'student', 'teacher', 'user', 'branch'] as const) {
        await (prisma as any)[m]?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
    }
    await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('School Timeline', () => {
    beforeAll(async () => {
        await cleanup();
        await prisma.school.create({ data: { id: S, name: 'TIMELINE', code: 'TML', slug: S, plan_type: 'enterprise', subscription_status: 'active' } });
        await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'TMLM', is_main: true } });
        await prisma.user.create({ data: { id: ADMIN, email: 'timeline-admin@x.com', password_hash: 'x', full_name: 'Timeline Admin', role: 'ADMIN' as any, school_id: S, branch_id: null } });
        await prisma.user.create({ data: { id: TEACHER_U, email: 'timeline-teacher@x.com', password_hash: 'x', full_name: 'Timeline Teacher', role: 'TEACHER' as any, school_id: S, branch_id: B } });
        await prisma.user.create({ data: { id: STUDENT_U, email: 'timeline-student@x.com', password_hash: 'x', full_name: 'Timeline Student', role: 'STUDENT' as any, school_id: S, branch_id: B } });

        teacherId = (await prisma.teacher.create({ data: { user_id: TEACHER_U, school_id: S, branch_id: B, full_name: 'Timeline Teacher' } })).id;
        studentId = (await prisma.student.create({
            data: { user_id: STUDENT_U, school_id: S, branch_id: B, full_name: 'Timeline Student', grade: 9, status: 'Graduated', exit_year: 2025, exit_class: 'JSS3', exit_date: new Date('2025-07-10') },
        })).id;
        await prisma.studentSuspension.create({ data: { school_id: S, branch_id: B, student_id: studentId, reason: 'Fighting', start_date: '2024-03-01', return_date: '2024-03-08', status: 'returned' } });
        await prisma.achievement.create({ data: { school_id: S, branch_id: B, student_id: studentId, title: 'Best in Science', date: new Date('2023-11-20'), type: 'academic' } });
    }, 60000);
    afterAll(cleanup, 60000);

    it('non-admins cannot add a timeline entry', async () => {
        const res = await request(app).post('/api/timeline')
            .set('Authorization', `Bearer ${asTeacher()}`)
            .send({ subject_type: 'student', subject_id: studentId, title: 'Should fail', event_date: '2024-01-01' });
        expect(res.status).toBe(403);
    });

    it('a student\'s timeline includes admission, suspension, achievement, and exit — chronologically ordered', async () => {
        const res = await request(app).get(`/api/timeline/student/${studentId}`).set('Authorization', `Bearer ${asAdmin()}`);
        expect(res.status).toBe(200);
        const types = res.body.map((e: any) => e.event_type);
        expect(types).toContain('Admission');
        expect(types).toContain('Suspension');
        expect(types).toContain('Achievement');
        expect(types).toContain('Graduated');

        const dates = res.body.map((e: any) => new Date(e.event_date).getTime());
        const sorted = [...dates].sort((a, b) => b - a);
        expect(dates).toEqual(sorted);
    });

    it('admin can add a custom entry, which appears in the timeline', async () => {
        const res = await request(app).post('/api/timeline')
            .set('Authorization', `Bearer ${asAdmin()}`)
            .send({ subject_type: 'student', subject_id: studentId, title: 'Made Prefect', event_date: '2024-09-01', event_type: 'Custom' });
        expect(res.status).toBe(201);

        const list = await request(app).get(`/api/timeline/student/${studentId}`).set('Authorization', `Bearer ${asAdmin()}`);
        expect(list.body.some((e: any) => e.title === 'Made Prefect' && e.source === 'manual')).toBe(true);
    });

    it('a teacher\'s timeline includes their hire date and any custom entries', async () => {
        await request(app).post('/api/timeline')
            .set('Authorization', `Bearer ${asAdmin()}`)
            .send({ subject_type: 'teacher', subject_id: teacherId, title: 'Completed Leadership Training', event_date: '2024-06-15' });

        const res = await request(app).get(`/api/timeline/teacher/${teacherId}`).set('Authorization', `Bearer ${asAdmin()}`);
        expect(res.status).toBe(200);
        expect(res.body.some((e: any) => e.event_type === 'Hired')).toBe(true);
        expect(res.body.some((e: any) => e.title === 'Completed Leadership Training')).toBe(true);
    });

    it('an auto-derived (non-manual) entry has no stored row to delete', async () => {
        // Auto entries (admission, suspension, exit, achievements) are synthesized
        // at read time from other tables, not stored LifeEvent rows — so their
        // synthetic ids correctly 404 rather than being deletable.
        const list = await request(app).get(`/api/timeline/student/${studentId}`).set('Authorization', `Bearer ${asAdmin()}`);
        const autoEntry = list.body.find((e: any) => e.source === 'auto');
        const res = await request(app).delete(`/api/timeline/${autoEntry.id}`).set('Authorization', `Bearer ${asAdmin()}`);
        expect(res.status).toBe(404);
    });

    it('a manually added entry can be deleted by an admin', async () => {
        const list = await request(app).get(`/api/timeline/student/${studentId}`).set('Authorization', `Bearer ${asAdmin()}`);
        const manualEntry = list.body.find((e: any) => e.title === 'Made Prefect');
        const res = await request(app).delete(`/api/timeline/${manualEntry.id}`).set('Authorization', `Bearer ${asAdmin()}`);
        expect(res.status).toBe(204);

        const after = await request(app).get(`/api/timeline/student/${studentId}`).set('Authorization', `Bearer ${asAdmin()}`);
        expect(after.body.some((e: any) => e.title === 'Made Prefect')).toBe(false);
    });
});
