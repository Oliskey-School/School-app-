/**
 * STUDENT WRITES THAT USED TO GO NOWHERE.
 *  - a discreet support request answered 500 (unknown columns) and, even when
 *    stored, nothing on the staff side ever read it → now stored + listed;
 *  - a shared (audience) notification could never be marked read by a
 *    student (bulk endpoint only touched rows the user owned), and the
 *    single endpoint marked it read for EVERY user → per-user read marks.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';

const S = '7d5f1c1e-2222-4222-8222-222222222222', B = 'srn-main';
const STUDENT_A = 'srn-student-a', STUDENT_B = 'srn-student-b', ADMIN = 'srn-admin';
const token = (id: string, role: string) => jwt.sign(
    { id, email: `${id}@x.com`, role, school_id: S, branch_id: B, allowed_branch_ids: [] },
    config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });
const auth = (who: string, role: string) => ({ Authorization: `Bearer ${token(who, role)}` });

async function cleanup() {
    for (const m of ['notificationRead', 'notification', 'menstrualSupportRequest', 'student', 'user', 'branch'] as const) {
        await (prisma as any)[m]?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
    }
    await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('Student reports and notification read marks', () => {
    beforeAll(async () => {
        await cleanup();
        await prisma.school.create({ data: { id: S, name: 'SRN', code: 'SRN', slug: 'srn-school', plan_type: 'premium', subscription_status: 'active' } as any });
        await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'SRNMAIN', is_main: true } as any });
        for (const [uid, role] of [[STUDENT_A, 'STUDENT'], [STUDENT_B, 'STUDENT'], [ADMIN, 'ADMIN']]) {
            await prisma.user.create({ data: { id: uid, email: `${uid}@x.com`, password_hash: 'x', full_name: uid, role: role as any, school_id: S, branch_id: B } as any });
        }
        await prisma.student.create({ data: { id: 'srn-stu-a', user_id: STUDENT_A, school_id: S, branch_id: B, full_name: 'Pupil A', grade: 7, status: 'Active' } as any });
        await prisma.student.create({ data: { id: 'srn-stu-b', user_id: STUDENT_B, school_id: S, branch_id: B, full_name: 'Pupil B', grade: 7, status: 'Active' } as any });
    }, 60000);
    afterAll(cleanup, 60000);

    it('a discreet support request is stored with what/how many/where and the admin can see and progress it', async () => {
        const r = await request(app).post('/api/student-reports/discreet').set(auth(STUDENT_A, 'STUDENT'))
            .send({ request_type: 'Pads', quantity_needed: 2, notes: 'please', is_anonymous: true, pickup_location: 'Nurse Office' });
        expect(r.status).toBe(201);
        expect(r.body).toMatchObject({ request_type: 'Pads', quantity: 2, pickup_location: 'Nurse Office', status: 'pending', student_id: null });

        expect((await request(app).get('/api/student-reports/discreet').set(auth(STUDENT_A, 'STUDENT'))).status).toBe(403);
        const list = await request(app).get('/api/student-reports/discreet').set(auth(ADMIN, 'ADMIN'));
        expect(list.status).toBe(200);
        expect(list.body.some((x: any) => x.id === r.body.id)).toBe(true);

        const upd = await request(app).patch(`/api/student-reports/discreet/${r.body.id}`).set(auth(ADMIN, 'ADMIN')).send({ status: 'collected' });
        expect(upd.status).toBe(200);
        expect(upd.body.status).toBe('collected');
        expect((await request(app).patch(`/api/student-reports/discreet/${r.body.id}`).set(auth(ADMIN, 'ADMIN')).send({ status: 'bogus' })).status).toBe(400);
    });

    it('a shared notification is read per user: student A marks it, student B still sees it unread', async () => {
        const n = await prisma.notification.create({ data: { school_id: S, branch_id: B, title: 'Assembly', message: 'Hall at 8', category: 'System', audience: ['student'], is_read: false } as any });
        const before = await request(app).get('/api/notifications').set(auth(STUDENT_A, 'STUDENT'));
        expect(before.status).toBe(200);
        expect(before.body.find((x: any) => x.id === n.id)?.is_read).toBe(false);

        const mr = await request(app).put('/api/notifications/mark-read').set(auth(STUDENT_A, 'STUDENT')).send({ ids: [n.id] });
        expect(mr.status).toBe(200);
        expect(mr.body.updated).toBe(1);

        const a = await request(app).get('/api/notifications').set(auth(STUDENT_A, 'STUDENT'));
        expect(a.body.find((x: any) => x.id === n.id)?.is_read).toBe(true);
        const b = await request(app).get('/api/notifications').set(auth(STUDENT_B, 'STUDENT'));
        expect(b.body.find((x: any) => x.id === n.id)?.is_read).toBe(false);
        // the shared row itself is untouched
        expect((await prisma.notification.findUnique({ where: { id: n.id } }))?.is_read).toBe(false);

        // single-item endpoint behaves the same way
        const one = await request(app).put(`/api/notifications/${n.id}/read`).set(auth(STUDENT_B, 'STUDENT'));
        expect(one.status).toBe(200);
        const b2 = await request(app).get('/api/notifications').set(auth(STUDENT_B, 'STUDENT'));
        expect(b2.body.find((x: any) => x.id === n.id)?.is_read).toBe(true);
    });
});
