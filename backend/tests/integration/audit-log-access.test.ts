/**
 * Who may read the school's audit trail.
 *
 *  - /api/audit-logs and /api/dashboard/audit-logs: admin-type roles only
 *    (admin, proprietor, super admin). Parent, student, teacher → 403.
 *  - /api/dashboard/stats stays open (non-admin dashboards use it), but its
 *    audit-derived recentActivity is empty for non-admin roles.
 *  - A branch admin sees only their branch's audit rows; the main admin sees all.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';
import { runAsPlatform } from '../../src/lib/tenantContext';

const S = 'ala-school', BM = 'ala-main', BX = 'ala-x';
const U = {
    mainAdmin: 'ala-main-admin', branchAdmin: 'ala-branch-admin', teacher: 'ala-teacher',
    parent: 'ala-parent', student: 'ala-student',
};
const ids: Record<string, string> = {};

const token = (id: string, role: string, branch_id: string, extra: Record<string, string> = {}) =>
    ({ Authorization: `Bearer ${jwt.sign({ id, email: `${id}@x.com`, role, school_id: S, branch_id }, config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' })}`, ...extra });
const as = {
    mainAdmin: () => token(U.mainAdmin, 'ADMIN', BM, { 'X-Branch-Id': 'all' }),
    branchAdmin: () => token(U.branchAdmin, 'ADMIN', BX),
    teacher: () => token(U.teacher, 'TEACHER', BX),
    parent: () => token(U.parent, 'PARENT', BX),
    student: () => token(U.student, 'STUDENT', BX),
};

async function wipe() {
    await runAsPlatform(async () => {
        for (const m of ['auditLog', 'teacher', 'parent', 'student', 'user', 'branch'] as const) {
            await (prisma as any)[m].deleteMany({ where: { school_id: S } }).catch(() => {});
        }
        await prisma.school.delete({ where: { id: S } }).catch(() => {});
    });
}

describe('Audit trail access', () => {
    beforeAll(async () => {
        await wipe();
        await runAsPlatform(async () => {
            await prisma.school.create({ data: { id: S, name: 'ALA School', code: 'ALAS', slug: 'ala-school', plan_type: 'premium', subscription_status: 'active' } as any });
            await prisma.branch.create({ data: { id: BM, school_id: S, name: 'Main', code: 'ALAM', is_main: true } as any });
            await prisma.branch.create({ data: { id: BX, school_id: S, name: 'X', code: 'ALAX', is_main: false } as any });
            const mk = (id: string, role: string, branch_id: string) =>
                prisma.user.create({ data: { id, email: `${id}@x.com`, password_hash: 'x', full_name: id, role: role as any, school_id: S, branch_id } as any });
            await mk(U.mainAdmin, 'ADMIN', BM);
            await mk(U.branchAdmin, 'ADMIN', BX);
            await mk(U.teacher, 'TEACHER', BX);
            await mk(U.parent, 'PARENT', BX);
            await mk(U.student, 'STUDENT', BX);
            await prisma.teacher.create({ data: { user_id: U.teacher, school_id: S, branch_id: BX, full_name: 'Teacher', subject_specialty: [], curriculum_eligibility: ['Nigerian'] } as any });
            await prisma.parent.create({ data: { user_id: U.parent, school_id: S, branch_id: BX, full_name: 'Parent' } as any });
            await prisma.student.create({ data: { user_id: U.student, school_id: S, branch_id: BX, full_name: 'Student', grade: 7, section: 'A', school_generated_id: 'ALAS_ALAX_STU_0001' } as any });

            const log = (branch_id: string, user_id: string, action: string) =>
                prisma.auditLog.create({ data: { school_id: S, branch_id, user_id, action, action_type: 'UPDATE', entity_type: 'Test', entity_id: action } });
            ids.logMain = (await log(BM, U.mainAdmin, 'ALA_MAIN_UPDATE')).id;
            ids.logX = (await log(BX, U.branchAdmin, 'ALA_X_UPDATE')).id;
            ids.logTeacher = (await log(BX, U.teacher, 'ALA_TEACHER_UPDATE')).id;
        });
    }, 180000);
    afterAll(wipe, 180000);

    const auditEndpoints = ['/api/audit-logs', '/api/dashboard/audit-logs'];
    const allLogIds = () => [ids.logMain, ids.logX, ids.logTeacher];

    it('parent, student and teacher get 403 on both audit endpoints', async () => {
        for (const [who, headers] of [['parent', as.parent], ['student', as.student], ['teacher', as.teacher]] as const) {
            for (const url of auditEndpoints) {
                const res = await request(app).get(url).set(headers());
                expect(res.status, `${who} ${url}: ${JSON.stringify(res.body).slice(0, 120)}`).toBe(403);
                const body = JSON.stringify(res.body);
                for (const id of allLogIds()) expect(body).not.toContain(id);
            }
        }
    });

    it("a parent's and a teacher's dashboard stats carry no audit activity", async () => {
        for (const [who, headers] of [['parent', as.parent], ['teacher', as.teacher]] as const) {
            const res = await request(app).get('/api/dashboard/stats').set(headers());
            expect(res.status, `${who}: ${JSON.stringify(res.body).slice(0, 160)}`).toBe(200);
            expect(res.body.recentActivity ?? []).toEqual([]);
            const body = JSON.stringify(res.body);
            for (const id of allLogIds()) expect(body, `${who} saw audit row ${id}`).not.toContain(id);
        }
    });

    it('a branch admin sees only their branch on every audit reader', async () => {
        const a = await request(app).get('/api/audit-logs').set(as.branchAdmin());
        expect(a.status).toBe(200);
        const aIds = a.body.map((r: any) => r.id);
        expect(aIds).toContain(ids.logX);
        expect(aIds).not.toContain(ids.logMain);

        const d = await request(app).get('/api/dashboard/audit-logs').set(as.branchAdmin());
        expect(d.status).toBe(200);
        const dIds = d.body.map((r: any) => r.id);
        expect(dIds).toContain(ids.logX);
        expect(dIds).not.toContain(ids.logMain);

        const s = await request(app).get('/api/dashboard/stats').set(as.branchAdmin());
        expect(s.status).toBe(200);
        const sIds = (s.body.recentActivity || []).map((r: any) => r.id);
        expect(sIds.length).toBeGreaterThan(0);
        expect(sIds).not.toContain(ids.logMain);
    });

    it('the main admin sees all branches', async () => {
        for (const url of auditEndpoints) {
            const res = await request(app).get(url).set(as.mainAdmin());
            expect(res.status, url).toBe(200);
            const got = res.body.map((r: any) => r.id);
            for (const id of allLogIds()) expect(got, `${url} missing ${id}`).toContain(id);
        }
        const s = await request(app).get('/api/dashboard/stats').set(as.mainAdmin());
        expect(s.status).toBe(200);
        const sIds = (s.body.recentActivity || []).map((r: any) => r.id);
        expect(sIds).toContain(ids.logMain);
        expect(sIds).toContain(ids.logX);
    });
});
