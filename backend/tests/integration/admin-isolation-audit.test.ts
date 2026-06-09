/**
 * COMPREHENSIVE ADMIN ISOLATION AUDIT
 *
 * Builds two schools, each with two branches, and seeds one record of every major
 * admin feature into each scope. Acting as a Main Admin of School A focused on a
 * branch, it exercises every admin LIST endpoint (what a page shows) and every
 * CREATE endpoint (what a "save" button does), asserting in all cases:
 *   - the active branch's record IS present / IS where new data lands
 *   - another branch's record is NEVER present   -> BRANCH isolation
 *   - another school's record is NEVER present    -> SCHOOL isolation
 * Switching the branch header flips visibility, proving each page reflects ONLY
 * the active branch. Create buttons ignore stale form branch values and always
 * write into the active branch (with that branch's Global ID).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';

const SA = 'audit-school-a', SB = 'audit-school-b';
const A1 = 'audit-a1', A2 = 'audit-a2', B1 = 'audit-b1';
const ADMIN_ID = 'audit-admin-a';

const ids: Record<string, Record<string, string>> = { A1: {}, A2: {}, B1: {} };

const token = () => jwt.sign(
    { id: ADMIN_ID, email: 'audit-admin@a.com', role: 'ADMIN', school_id: SA, branch_id: null, allowed_branch_ids: [] },
    config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });
const get = (path: string, branch: string) =>
    request(app).get(path).set('Authorization', `Bearer ${token()}`).set('X-Branch-Id', branch);
const post = (path: string, branch: string, body: any) =>
    request(app).post(path).set('Authorization', `Bearer ${token()}`).set('X-Branch-Id', branch).send(body);

async function cleanup() {
    for (const school of [SA, SB]) {
        for (const model of ['behaviorNote', 'transportBus', 'parent', 'student', 'teacher', 'subject', 'event', 'class', 'announcement', 'user', 'branch'] as const) {
            await (prisma as any)[model].deleteMany({ where: { school_id: school } }).catch(() => {});
        }
        await prisma.school.delete({ where: { id: school } }).catch(() => {});
    }
}

async function seedScope(school: string, branch: string, key: string) {
    const tag = `__AUDIT_${key}__`;
    ids[key].subject = (await prisma.subject.create({ data: { school_id: school, branch_id: branch, name: tag } })).id;
    ids[key].event = (await prisma.event.create({ data: { school_id: school, branch_id: branch, title: tag, date: new Date(), type: 'General' } })).id;
    ids[key].class = (await prisma.class.create({ data: { school_id: school, branch_id: branch, name: tag, grade: 7, section: key } })).id;
    ids[key].notice = (await prisma.announcement.create({ data: { school_id: school, branch_id: branch, title: tag, content: 'x', category: 'General', audience: ['all'] } })).id;
    ids[key].bus = (await prisma.transportBus.create({ data: { school_id: school, branch_id: branch, name: tag, capacity: 10 } })).id;

    const stuUser = await prisma.user.create({ data: { id: `${branch}-stu-user`, email: `${branch}-stu@a.com`, password_hash: 'x', full_name: tag, role: 'STUDENT' as any, school_id: school, branch_id: branch } });
    ids[key].studentUser = stuUser.id;
    ids[key].student = (await prisma.student.create({ data: { user_id: stuUser.id, school_id: school, branch_id: branch, full_name: tag, grade: 7 } })).id;

    const schoolCode = key === 'B1' ? 'AUDB' : 'AUDA';
    const branchCode = key === 'A1' ? 'AUDA1' : key === 'A2' ? 'AUDA2' : 'AUDB1';
    const homeTeacherId = `${schoolCode}_${branchCode}_TCH_0001`;
    const tchUser = await prisma.user.create({ data: { id: `${branch}-tch-user`, email: `${branch}-tch@a.com`, password_hash: 'x', full_name: tag, role: 'TEACHER' as any, school_id: school, branch_id: branch, school_generated_id: homeTeacherId } });
    ids[key].teacher = (await prisma.teacher.create({ data: { user_id: tchUser.id, school_id: school, branch_id: branch, full_name: tag, school_generated_id: homeTeacherId, subject_specialty: [], curriculum_eligibility: ['Nigerian'] } })).id;

    const parUser = await prisma.user.create({ data: { id: `${branch}-par-user`, email: `${branch}-par@a.com`, password_hash: 'x', full_name: tag, role: 'PARENT' as any, school_id: school, branch_id: branch } });
    ids[key].parent = (await prisma.parent.create({ data: { user_id: parUser.id, school_id: school, branch_id: branch, full_name: tag } })).id;

    ids[key].behavior = (await prisma.behaviorNote.create({ data: { student_id: ids[key].student, teacher_id: ids[key].teacher, school_id: school, branch_id: branch, note: tag, category: 'General' } })).id;
}

describe('Comprehensive Admin Isolation Audit', () => {
    beforeAll(async () => {
        await cleanup();
        for (const [id, name, code] of [[SA, 'Audit School A', 'AUDA'], [SB, 'Audit School B', 'AUDB']] as const) {
            await prisma.school.create({ data: { id, name, code, slug: id, plan_type: 'free' } });
        }
        for (const [id, school, isMain, code] of [[A1, SA, true, 'AUDA1'], [A2, SA, false, 'AUDA2'], [B1, SB, true, 'AUDB1']] as const) {
            await prisma.branch.create({ data: { id, school_id: school, name: id, code, is_main: isMain } });
        }
        await prisma.user.create({ data: { id: ADMIN_ID, email: 'audit-admin@a.com', password_hash: 'x', full_name: 'Audit Admin', role: 'ADMIN' as any, school_id: SA, branch_id: null } });
        await seedScope(SA, A1, 'A1');
        await seedScope(SA, A2, 'A2');
        await seedScope(SB, B1, 'B1');
    });

    afterAll(cleanup);

    const arr = (b: any) => (Array.isArray(b) ? b : b?.data || b?.students || []);
    const READS: Array<[string, string, string]> = [
        ['Subjects', '/api/subjects', 'subject'],
        ['Calendar', '/api/calendar', 'event'],
        ['Classes', '/api/classes', 'class'],
        ['Notices', '/api/notices', 'notice'],
        ['User Accounts', '/api/users', 'studentUser'],
        ['Students', '/api/students', 'student'],
        ['Teachers', '/api/teachers', 'teacher'],
        ['Parents', '/api/parents', 'parent'],
        ['Behavior Notes', '/api/behavior/notes', 'behavior'],
        ['Buses / Transport', '/api/buses', 'bus'],
    ];

    for (const [label, path, key] of READS) {
        it(`READ ${label}: Branch A1 sees only A1 (never A2, never School B)`, async () => {
            const res = await get(path, A1);
            expect(res.status).toBe(200);
            const got = arr(res.body).map((x: any) => x.id);
            expect(got).toContain(ids.A1[key]);
            expect(got).not.toContain(ids.A2[key]);  // branch isolation
            expect(got).not.toContain(ids.B1[key]);  // school isolation
        });
        it(`READ ${label}: switching to Branch A2 flips visibility`, async () => {
            const res = await get(path, A2);
            expect(res.status).toBe(200);
            const got = arr(res.body).map((x: any) => x.id);
            expect(got).toContain(ids.A2[key]);
            expect(got).not.toContain(ids.A1[key]);
            expect(got).not.toContain(ids.B1[key]);
        });
    }

    it('Dashboard stats count only the active branch', async () => {
        const res = await get('/api/dashboard/stats', A1);
        expect(res.status).toBe(200);
        expect(res.body.totalStudents).toBe(1); // exactly one per branch — never 2 or 3
    });

    // ---- CREATE buttons: a "save" must land in the ACTIVE branch, never another ----
    const WRITES: Array<[string, string, any, string, string]> = [
        ['Subject', '/api/subjects', { name: '__W_SUBJECT__' }, 'subject', 'name:__W_SUBJECT__'],
        ['Class', '/api/classes', { name: '__W_CLASS__', grade: 8, section: 'W' }, 'class', 'name:__W_CLASS__'],
        ['Notice', '/api/notices', { title: '__W_NOTICE__', content: 'x', category: 'General', audience: ['all'] }, 'announcement', 'title:__W_NOTICE__'],
        ['Calendar event', '/api/calendar', { title: '__W_EVENT__', date: new Date().toISOString(), type: 'General' }, 'event', 'title:__W_EVENT__'],
        ['Bus', '/api/buses', { name: '__W_BUS__', capacity: 5 }, 'transportBus', 'name:__W_BUS__'],
    ];
    for (const [label, path, body, model, finder] of WRITES) {
        it(`CREATE ${label} while on A1 saves it in A1 (isolated)`, async () => {
            const res = await post(path, A1, body);
            expect([200, 201]).toContain(res.status);
            const [f, v] = finder.split(':');
            const created = await (prisma as any)[model].findFirst({ where: { school_id: SA, [f]: v } });
            expect(created?.branch_id).toBe(A1);
        });
    }

    it('A teacher ASSIGNED to another branch shows there with THAT branch\'s ID (never the home/Main id)', async () => {
        // A1's teacher (home id ..._AUDA1_TCH_0001) is also assigned to A2.
        await prisma.teacher.update({ where: { id: ids.A1.teacher }, data: { allowed_branch_ids: [A2] } });
        await prisma.user.update({ where: { id: `${A1}-tch-user` }, data: { allowed_branch_ids: [A2] } });

        const res = await get('/api/teachers', A2);
        expect(res.status).toBe(200);
        const found = arr(res.body).find((x: any) => x.id === ids.A1.teacher);
        expect(found).toBeTruthy();                                            // appears in A2 (assigned)
        expect(String(found.school_generated_id).split('_')[1]).toBe('AUDA2'); // shows A2's branch code
        expect(String(found.school_generated_id)).not.toContain('_AUDA1_');    // NOT the home id

        await prisma.teacher.update({ where: { id: ids.A1.teacher }, data: { allowed_branch_ids: [] } });
        await prisma.user.update({ where: { id: `${A1}-tch-user` }, data: { allowed_branch_ids: [] } });
    });

    it('CREATE Teacher on A1 uses A1 even when the form posts a DIFFERENT branch', async () => {
        const res = await post('/api/teachers', A1, { full_name: 'Write Teacher', email: 'writetest-tch@a.com', branch_id: A2 });
        expect([200, 201]).toContain(res.status);
        const created = await prisma.teacher.findFirst({ where: { school_id: SA, email: 'writetest-tch@a.com' } });
        expect(created?.branch_id).toBe(A1);                 // active branch wins over the body
        expect(String(created?.school_generated_id).split('_')[1]).toBe('AUDA1'); // A1's Global ID
    });
});
