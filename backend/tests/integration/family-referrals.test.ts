/**
 * Family referrals — who can create, see and update what.
 *
 * School A: Main branch (M) and branch X.
 *   - main admin (pinned to M, school-level)    → all branches, confidential included
 *   - branch admin on X                          → X only, confidential EXCLUDED
 *   - counselor on X                             → X, confidential included
 *   - counselor on M                             → nothing from X
 *   - parent A (child A in X), parent B (child B in X)
 * School B: an admin and one referral that must never leak into School A.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';
import { runAsPlatform } from '../../src/lib/tenantContext';

const SA = 'fref-school-a', SB = 'fref-school-b';
const BM = 'fref-a-main', BX = 'fref-a-x', BB = 'fref-b-main';
const U = {
    mainAdmin: 'fref-main-admin', branchAdmin: 'fref-branch-admin', counselorX: 'fref-counselor-x',
    counselorM: 'fref-counselor-m', parentA: 'fref-parent-a', parentB: 'fref-parent-b',
    stuA: 'fref-stu-a', stuB: 'fref-stu-b', adminB: 'fref-admin-b', parentSB: 'fref-parent-sb', stuSB: 'fref-stu-sb',
};
const ids: Record<string, string> = {};

const token = (id: string, role: string, school_id: string, branch_id: string) =>
    ({ Authorization: `Bearer ${jwt.sign({ id, email: `${id}@x.com`, role, school_id, branch_id }, config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' })}` });
const as = {
    // The main admin's view follows the branch switcher like every other admin
    // screen: "All Branches" sends X-Branch-Id: all.
    mainAdmin: () => ({ ...token(U.mainAdmin, 'ADMIN', SA, BM), 'X-Branch-Id': 'all' }),
    mainAdminOnMain: () => token(U.mainAdmin, 'ADMIN', SA, BM),
    branchAdmin: () => token(U.branchAdmin, 'ADMIN', SA, BX),
    counselorX: () => token(U.counselorX, 'COUNSELOR', SA, BX),
    counselorM: () => token(U.counselorM, 'COUNSELOR', SA, BM),
    parentA: () => token(U.parentA, 'PARENT', SA, BX),
    parentB: () => token(U.parentB, 'PARENT', SA, BX),
    adminB: () => token(U.adminB, 'ADMIN', SB, BB),
};

async function wipe() {
    await runAsPlatform(async () => {
        for (const s of [SA, SB]) {
            for (const m of ['familyReferral', 'auditLog', 'parentChild', 'parent', 'student', 'user', 'branch'] as const) {
                await (prisma as any)[m].deleteMany({ where: { school_id: s } }).catch(() => {});
            }
            await prisma.school.delete({ where: { id: s } }).catch(() => {});
        }
    });
}

describe('Family referrals', () => {
    beforeAll(async () => {
        await wipe();
        await runAsPlatform(async () => {
            await prisma.school.create({ data: { id: SA, name: 'Fref A', code: 'FREFA', slug: 'fref-a', plan_type: 'premium', subscription_status: 'active' } as any });
            await prisma.school.create({ data: { id: SB, name: 'Fref B', code: 'FREFB', slug: 'fref-b', plan_type: 'premium', subscription_status: 'active' } as any });
            await prisma.branch.create({ data: { id: BM, school_id: SA, name: 'Main', code: 'FAM', is_main: true } as any });
            await prisma.branch.create({ data: { id: BX, school_id: SA, name: 'X', code: 'FAX', is_main: false } as any });
            await prisma.branch.create({ data: { id: BB, school_id: SB, name: 'Main', code: 'FBM', is_main: true } as any });

            const mk = (id: string, role: string, school_id: string, branch_id: string) =>
                prisma.user.create({ data: { id, email: `${id}@x.com`, password_hash: 'x', full_name: id, role: role as any, school_id, branch_id } as any });
            await mk(U.mainAdmin, 'ADMIN', SA, BM);
            await mk(U.branchAdmin, 'ADMIN', SA, BX);
            await mk(U.counselorX, 'COUNSELOR', SA, BX);
            await mk(U.counselorM, 'COUNSELOR', SA, BM);
            await mk(U.parentA, 'PARENT', SA, BX);
            await mk(U.parentB, 'PARENT', SA, BX);
            await mk(U.stuA, 'STUDENT', SA, BX);
            await mk(U.stuB, 'STUDENT', SA, BX);
            await mk(U.adminB, 'ADMIN', SB, BB);
            await mk(U.parentSB, 'PARENT', SB, BB);
            await mk(U.stuSB, 'STUDENT', SB, BB);

            const parent = (user_id: string, school_id: string, branch_id: string, full_name: string) =>
                prisma.parent.create({ data: { user_id, school_id, branch_id, full_name } as any });
            const student = (user_id: string, school_id: string, branch_id: string, full_name: string, gid: string) =>
                prisma.student.create({ data: { user_id, school_id, branch_id, full_name, grade: 7, section: 'A', school_generated_id: gid } as any });
            ids.parentA = (await parent(U.parentA, SA, BX, 'Parent A')).id;
            ids.parentB = (await parent(U.parentB, SA, BX, 'Parent B')).id;
            ids.parentSB = (await parent(U.parentSB, SB, BB, 'Parent SB')).id;
            ids.childA = (await student(U.stuA, SA, BX, 'Child A', 'FREFA_FAX_STU_0001')).id;
            ids.childB = (await student(U.stuB, SA, BX, 'Child B', 'FREFA_FAX_STU_0002')).id;
            ids.childSB = (await student(U.stuSB, SB, BB, 'Child SB', 'FREFB_FBM_STU_0001')).id;
            await prisma.parentChild.create({ data: { parent_id: ids.parentA, student_id: ids.childA, school_id: SA, branch_id: BX } as any });
            await prisma.parentChild.create({ data: { parent_id: ids.parentB, student_id: ids.childB, school_id: SA, branch_id: BX } as any });
            await prisma.parentChild.create({ data: { parent_id: ids.parentSB, student_id: ids.childSB, school_id: SB, branch_id: BB } as any });

            // School B's referral, created directly — the only way it exists.
            ids.refSB = (await prisma.familyReferral.create({ data: {
                school_id: SB, branch_id: BB, student_id: ids.childSB, parent_id: ids.parentSB,
                referral_type: 'Health', need_description: 'SCHOOLBSECRET', urgency: 'High',
            } })).id;
        });
    }, 180000);
    afterAll(wipe, 180000);

    it('a parent can create a referral for their own child, stored in the child\'s branch', async () => {
        const open = await request(app).post('/api/referrals').set(as.parentA()).send({
            student_id: ids.childA, referral_type: 'Learning Support', urgency: 'Medium',
            need_description: 'OPENREFERRAL reading help', is_confidential: false,
        });
        expect(open.status, JSON.stringify(open.body)).toBe(201);
        expect(open.body.status).toBe('Submitted');
        expect(open.body.student?.name).toBe('Child A');
        ids.refOpen = open.body.id;

        const conf = await request(app).post('/api/referrals').set(as.parentA()).send({
            student_id: ids.childA, referral_type: 'Counselling', urgency: 'High',
            need_description: 'CONFIDENTIALREFERRAL', is_confidential: true,
        });
        expect(conf.status, JSON.stringify(conf.body)).toBe(201);
        ids.refConf = conf.body.id;

        const row = await runAsPlatform(() => prisma.familyReferral.findUnique({ where: { id: ids.refOpen } }));
        expect(row?.school_id).toBe(SA);
        expect(row?.branch_id).toBe(BX);
        expect(row?.parent_id).toBe(ids.parentA);
    });

    it('a parent cannot create a referral for a child that is not theirs (same school or another school)', async () => {
        for (const sid of [ids.childB, ids.childSB, 'does-not-exist']) {
            const res = await request(app).post('/api/referrals').set(as.parentA()).send({
                student_id: sid, referral_type: 'Health', urgency: 'Low', need_description: 'HIJACK',
            });
            expect(res.status, `${sid}: ${JSON.stringify(res.body)}`).toBe(403);
        }
        const hijacks = await runAsPlatform(() => prisma.familyReferral.count({ where: { need_description: 'HIJACK' } }));
        expect(hijacks).toBe(0);
    });

    it('rejects invalid input and ignores a client-supplied school or branch', async () => {
        const bad = await request(app).post('/api/referrals').set(as.parentA()).send({
            student_id: ids.childA, referral_type: 'Shelter', urgency: 'Low', need_description: 'x',
        });
        expect(bad.status).toBe(400);
        const empty = await request(app).post('/api/referrals').set(as.parentA()).send({
            student_id: ids.childA, referral_type: 'Health', urgency: 'Low', need_description: '   ',
        });
        expect(empty.status).toBe(400);
        const spoof = await request(app).post('/api/referrals').set(as.parentA()).send({
            student_id: ids.childA, referral_type: 'Other', urgency: 'Low', need_description: 'SPOOFTEST',
            school_id: SB, branch_id: BB, status: 'Resolved', parent_id: ids.parentB,
        });
        // Either refused outright, or stored strictly from the token — never in School B.
        if (spoof.status === 201) {
            const row = await runAsPlatform(() => prisma.familyReferral.findUnique({ where: { id: spoof.body.id } }));
            expect(row?.school_id).toBe(SA);
            expect(row?.branch_id).toBe(BX);
            expect(row?.status).toBe('Submitted');
            expect(row?.parent_id).toBe(ids.parentA);
            await runAsPlatform(() => prisma.familyReferral.delete({ where: { id: spoof.body.id } }));
        } else {
            expect(spoof.status).toBe(403);
        }
    });

    it('a parent sees only their own referrals', async () => {
        const a = await request(app).get('/api/referrals/mine').set(as.parentA());
        expect(a.status).toBe(200);
        expect(a.body.map((r: any) => r.id).sort()).toEqual([ids.refOpen, ids.refConf].sort());

        const b = await request(app).get('/api/referrals/mine').set(as.parentB());
        expect(b.status).toBe(200);
        expect(b.body).toEqual([]);
    });

    it('a parent cannot use the staff list or update endpoints', async () => {
        expect((await request(app).get('/api/referrals').set(as.parentA())).status).toBe(403);
        const res = await request(app).patch(`/api/referrals/${ids.refOpen}`).set(as.parentA()).send({ status: 'Resolved' });
        expect(res.status).toBe(403);
    });

    it("School A's admin cannot see School B's referrals, and School B cannot see School A's", async () => {
        const a = await request(app).get('/api/referrals').set(as.mainAdmin());
        expect(a.status).toBe(200);
        expect(JSON.stringify(a.body)).not.toContain('SCHOOLBSECRET');

        const b = await request(app).get('/api/referrals').set(as.adminB());
        expect(b.status).toBe(200);
        const bodyB = JSON.stringify(b.body);
        expect(bodyB).not.toContain('OPENREFERRAL');
        expect(bodyB).not.toContain('CONFIDENTIALREFERRAL');
        expect(b.body.map((r: any) => r.id)).toEqual([ids.refSB]);

        // A query-string school override must not widen anything.
        const q = await request(app).get(`/api/referrals?schoolId=${SB}&school_id=${SB}`).set(as.mainAdmin());
        expect(JSON.stringify(q.body)).not.toContain('SCHOOLBSECRET');

        const patch = await request(app).patch(`/api/referrals/${ids.refSB}`).set(as.mainAdmin()).send({ status: 'Closed' });
        expect(patch.status).toBe(404);
    });

    it('the main admin and the counselor of that branch see both referrals, confidential included', async () => {
        for (const who of [as.mainAdmin, as.counselorX]) {
            const res = await request(app).get('/api/referrals').set(who());
            expect(res.status).toBe(200);
            const got = res.body.map((r: any) => r.id);
            expect(got).toContain(ids.refOpen);
            expect(got).toContain(ids.refConf);
            expect(res.body.find((r: any) => r.id === ids.refOpen)?.parent_name).toBe('Parent A');
        }
        // With the switcher on Main, the main admin sees Main's referrals only.
        const onMain = await request(app).get('/api/referrals').set(as.mainAdminOnMain());
        expect(onMain.status).toBe(200);
        expect(onMain.body.map((r: any) => r.id)).not.toContain(ids.refOpen);
    });

    it('a branch admin sees their branch but never confidential referrals', async () => {
        const res = await request(app).get('/api/referrals').set(as.branchAdmin());
        expect(res.status).toBe(200);
        const got = res.body.map((r: any) => r.id);
        expect(got).toContain(ids.refOpen);
        expect(got).not.toContain(ids.refConf);
        expect(JSON.stringify(res.body)).not.toContain('CONFIDENTIALREFERRAL');

        const patch = await request(app).patch(`/api/referrals/${ids.refConf}`).set(as.branchAdmin()).send({ status: 'Closed' });
        expect(patch.status).toBe(404);
    });

    it("a counselor of another branch cannot see or update that branch's referrals", async () => {
        const res = await request(app).get('/api/referrals').set(as.counselorM());
        expect(res.status).toBe(200);
        expect(res.body.map((r: any) => r.id)).not.toContain(ids.refOpen);
        const patch = await request(app).patch(`/api/referrals/${ids.refOpen}`).set(as.counselorM()).send({ status: 'Closed' });
        expect(patch.status).toBe(404);
    });

    it('a branch admin and a counselor can update status and note, it persists, and the parent sees it', async () => {
        const r1 = await request(app).patch(`/api/referrals/${ids.refOpen}`).set(as.branchAdmin())
            .send({ status: 'In Progress', staff_note: 'Meeting booked for Monday' });
        expect(r1.status, JSON.stringify(r1.body)).toBe(200);
        expect(r1.body.status).toBe('In Progress');

        const r2 = await request(app).patch(`/api/referrals/${ids.refConf}`).set(as.counselorX()).send({ status: 'Resolved' });
        expect(r2.status, JSON.stringify(r2.body)).toBe(200);

        const [open, conf] = await runAsPlatform(() => Promise.all([
            prisma.familyReferral.findUnique({ where: { id: ids.refOpen } }),
            prisma.familyReferral.findUnique({ where: { id: ids.refConf } }),
        ]));
        expect(open?.status).toBe('In Progress');
        expect(open?.staff_note).toBe('Meeting booked for Monday');
        expect(open?.handled_by).toBe(U.branchAdmin);
        expect(conf?.status).toBe('Resolved');
        expect(conf?.handled_by).toBe(U.counselorX);

        const mine = await request(app).get('/api/referrals/mine').set(as.parentA());
        const seen = Object.fromEntries(mine.body.map((r: any) => [r.id, r]));
        expect(seen[ids.refOpen].status).toBe('In Progress');
        expect(seen[ids.refOpen].staff_note).toBe('Meeting booked for Monday');
        expect(seen[ids.refConf].status).toBe('Resolved');

        // The status change is audited without copying the referral's text.
        await new Promise(r => setTimeout(r, 300));
        const logs = await runAsPlatform(() => prisma.auditLog.findMany({ where: { school_id: SA, entity_id: ids.refOpen } }));
        expect(logs.length).toBeGreaterThan(0);
        expect(JSON.stringify(logs)).not.toContain('Meeting booked');
    });

    it('rejects an invalid status', async () => {
        const res = await request(app).patch(`/api/referrals/${ids.refOpen}`).set(as.mainAdmin()).send({ status: 'Deleted' });
        expect(res.status).toBe(400);
    });
});
