/**
 * SCHOOL CALENDAR AUTOMATION + DIGITAL TWIN (real database).
 *
 * Calendar: creating, updating, and deleting an event automatically notifies
 * the audience mapped to that event's type — no manual "notify people" step.
 *
 * Digital Twin: a single live snapshot aggregates real data already tracked
 * elsewhere (attendance, fees, maintenance, visitors, risk alerts).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';

const S = 'caldt-school', B = 'caldt-main';
const ADMIN = 'caldt-admin', TEACHER_U = 'caldt-teacher-u', STUDENT_U = 'caldt-student-u';
let eventId = '';

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
    for (const m of ['notification', 'event', 'attendance', 'studentFee', 'user', 'branch'] as const) {
        await (prisma as any)[m]?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
    }
    await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('School Calendar Automation', () => {
    beforeAll(async () => {
        await cleanup();
        await prisma.school.create({ data: { id: S, name: 'CALDT', code: 'CALDT', slug: S, plan_type: 'enterprise', subscription_status: 'active' } });
        await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'CDM', is_main: true } });
        await prisma.user.create({ data: { id: ADMIN, email: 'caldt-admin@x.com', password_hash: 'x', full_name: 'CalDT Admin', role: 'ADMIN' as any, school_id: S, branch_id: null } });
        await prisma.user.create({ data: { id: TEACHER_U, email: 'caldt-teacher@x.com', password_hash: 'x', full_name: 'CalDT Teacher', role: 'TEACHER' as any, school_id: S, branch_id: B } });
    }, 60000);

    it('a non-admin cannot create a calendar event', async () => {
        const res = await request(app).post('/api/calendar').set('Authorization', `Bearer ${asTeacher()}`).send({ title: 'Sports Day', date: todayStr(), type: 'Sports Day' });
        expect(res.status).toBe(403);
    });

    it('creating a PTA event notifies parents and admins, not students', async () => {
        const res = await request(app).post('/api/calendar').set('Authorization', `Bearer ${asAdmin()}`)
            .send({ title: 'Term 2 PTA Meeting', date: todayStr(), type: 'PTA' });
        expect(res.status).toBe(201);
        eventId = res.body.id;

        const notif = await prisma.notification.findFirst({ where: { school_id: S, title: { contains: 'New Event' } } });
        expect(notif).toBeTruthy();
        expect(notif?.audience).toEqual(expect.arrayContaining(['parent', 'admin']));
        expect(notif?.audience).not.toContain('student');
    });

    it('a Holiday event notifies everyone', async () => {
        const res = await request(app).post('/api/calendar').set('Authorization', `Bearer ${asAdmin()}`)
            .send({ title: 'Mid-Term Break', date: todayStr(), type: 'Holiday' });
        expect(res.status).toBe(201);

        const notif = await prisma.notification.findFirst({ where: { school_id: S, title: { contains: 'Mid-Term Break' } } });
        expect(notif?.audience).toContain('all');
    });

    it('updating an event sends a change notification', async () => {
        const res = await request(app).put(`/api/calendar/${eventId}`).set('Authorization', `Bearer ${asAdmin()}`).send({ location: 'Main Hall' });
        expect(res.status).toBe(200);

        const notif = await prisma.notification.findFirst({ where: { school_id: S, title: { contains: 'Event Updated' } } });
        expect(notif).toBeTruthy();
    });

    it('deleting an event sends a cancellation notification and removes it from the list', async () => {
        const res = await request(app).delete(`/api/calendar/${eventId}`).set('Authorization', `Bearer ${asAdmin()}`);
        expect(res.status).toBe(200);

        const notif = await prisma.notification.findFirst({ where: { school_id: S, title: { contains: 'Event Cancelled' } } });
        expect(notif).toBeTruthy();

        const list = await request(app).get('/api/calendar').set('Authorization', `Bearer ${asAdmin()}`);
        expect(list.body.some((e: any) => e.id === eventId)).toBe(false);
    });
});

describe('School Digital Twin', () => {
    afterAll(cleanup, 60000);

    it('non-admins cannot view the Digital Twin snapshot', async () => {
        const res = await request(app).get('/api/digital-twin/snapshot').set('Authorization', `Bearer ${asTeacher()}`);
        expect(res.status).toBe(403);
    });

    it('the snapshot aggregates real counts with the correct shape', async () => {
        const res = await request(app).get('/api/digital-twin/snapshot').set('Authorization', `Bearer ${asAdmin()}`);
        expect(res.status).toBe(200);
        expect(typeof res.body.students_present).toBe('number');
        expect(typeof res.body.teachers_present).toBe('number');
        expect(typeof res.body.classes_running_pct).toBe('number');
        expect(res.body.estimates).toEqual(expect.arrayContaining(['buses_active', 'classes_running_pct']));
    });
});
