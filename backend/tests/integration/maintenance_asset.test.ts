/**
 * SCHOOL MAINTENANCE SYSTEM + ASSET TRACKING (real database).
 *
 * Maintenance: teacher submits a repair report (asset optional, location
 * required when no asset), status flows Pending -> In Progress -> Completed
 * with admin-only transitions and reporter notification.
 *
 * Asset Tracking: QR code auto-generated on creation, detail lookup by id
 * and by QR code returns warranty/location/assigned-user/maintenance history.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';

const S = 'maint-school', B = 'maint-main';
const ADMIN = 'maint-admin', TEACHER_U = 'maint-teacher-u';
let ticketId = '', assetId = '';

const tok = (id: string, role: string, branchId: string | null = null) => jwt.sign(
    { id, email: `${id}@x.com`, role, school_id: S, branch_id: branchId, allowed_branch_ids: [] },
    config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });

const asAdmin = () => tok(ADMIN, 'ADMIN');
const asTeacher = () => tok(TEACHER_U, 'TEACHER', B);

async function cleanup() {
    for (const m of ['maintenanceTicket', 'asset', 'facility', 'user', 'branch'] as const) {
        await (prisma as any)[m]?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
    }
    await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('School Maintenance System', () => {
    beforeAll(async () => {
        await cleanup();
        await prisma.school.create({ data: { id: S, name: 'MAINT', code: 'MAINT', slug: S, plan_type: 'enterprise', subscription_status: 'active' } });
        await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'MAINTM', is_main: true } });
        await prisma.user.create({ data: { id: ADMIN, email: 'maint-admin@x.com', password_hash: 'x', full_name: 'Maint Admin', role: 'ADMIN' as any, school_id: S, branch_id: null } });
        await prisma.user.create({ data: { id: TEACHER_U, email: 'maint-teacher@x.com', password_hash: 'x', full_name: 'Maint Teacher', role: 'TEACHER' as any, school_id: S, branch_id: B } });
    }, 60000);

    it('a teacher can report an issue without picking an asset, using a location instead', async () => {
        const res = await request(app).post('/api/maintenance').set('Authorization', `Bearer ${asTeacher()}`)
            .send({ issue_title: 'Fan not working', location: 'JSS2A', category: 'HVAC/Fan', priority: 'Medium' });
        expect(res.status).toBe(201);
        expect(res.body.data.status).toBe('Pending');
        ticketId = res.body.data.id;
    });

    it('rejects a report with neither an asset nor a location', async () => {
        const res = await request(app).post('/api/maintenance').set('Authorization', `Bearer ${asTeacher()}`)
            .send({ issue_title: 'Something broke' });
        expect(res.status).toBe(400);
    });

    it('a teacher (non-admin) cannot transition ticket status', async () => {
        const res = await request(app).patch(`/api/maintenance/${ticketId}/status`).set('Authorization', `Bearer ${asTeacher()}`)
            .send({ status: 'Completed' });
        expect(res.status).toBe(403);
    });

    it('cannot skip Pending straight to an invalid jump backward from Completed', async () => {
        const toProgress = await request(app).patch(`/api/maintenance/${ticketId}/status`).set('Authorization', `Bearer ${asAdmin()}`).send({ status: 'In Progress' });
        expect(toProgress.status).toBe(200);
        const toCompleted = await request(app).patch(`/api/maintenance/${ticketId}/status`).set('Authorization', `Bearer ${asAdmin()}`).send({ status: 'Completed' });
        expect(toCompleted.status).toBe(200);
        const invalid = await request(app).patch(`/api/maintenance/${ticketId}/status`).set('Authorization', `Bearer ${asAdmin()}`).send({ status: 'Pending' });
        expect(invalid.status).toBe(400);
    });

    it('the reporting teacher is notified as status changes', async () => {
        const notif = await prisma.notification.findFirst({ where: { school_id: S, user_id: TEACHER_U, title: { contains: 'Maintenance Update' } } });
        expect(notif).toBeTruthy();
    });

    it('the teacher sees their own reports via the mine filter', async () => {
        const res = await request(app).get('/api/maintenance?mine=true').set('Authorization', `Bearer ${asTeacher()}`);
        expect(res.status).toBe(200);
        expect(res.body.some((t: any) => t.id === ticketId)).toBe(true);
    });
});

describe('Asset Tracking', () => {
    // Reuses the school/branch/admin/teacher created in the describe above.
    afterAll(cleanup, 60000);

    it('creating an asset auto-generates a QR code', async () => {
        const res = await request(app).post('/api/infrastructure/assets').set('Authorization', `Bearer ${asAdmin()}`)
            .send({ name: 'Science Lab Microscope', category: 'Laboratory', location: 'Lab 1', current_value: 80000 });
        expect(res.status).toBe(201);
        expect(res.body.data.qr_code).toBeTruthy();
        assetId = res.body.data.id;
    });

    it('the asset detail view includes maintenance history', async () => {
        await request(app).post('/api/maintenance').set('Authorization', `Bearer ${asTeacher()}`)
            .send({ issue_title: 'Lens scratched', asset_id: assetId, priority: 'Low' });

        const res = await request(app).get(`/api/infrastructure/assets/${assetId}`).set('Authorization', `Bearer ${asAdmin()}`);
        expect(res.status).toBe(200);
        expect(res.body.data.maintenance_tickets.length).toBe(1);
    });

    it('scanning the QR code (lookup by code) returns the same asset', async () => {
        const asset = await (prisma as any).asset.findUnique({ where: { id: assetId } });
        const res = await request(app).get(`/api/infrastructure/assets/qr/${asset.qr_code}`).set('Authorization', `Bearer ${asAdmin()}`);
        expect(res.status).toBe(200);
        expect(res.body.data.id).toBe(assetId);
    });

    it('an unknown QR code returns 404', async () => {
        const res = await request(app).get('/api/infrastructure/assets/qr/NOT-A-REAL-CODE').set('Authorization', `Bearer ${asAdmin()}`);
        expect(res.status).toBe(404);
    });
});
