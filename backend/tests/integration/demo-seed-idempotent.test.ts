/**
 * P0 #1 — demo seeding must be idempotent and must adopt rows that already
 * hold a demo identity (prisma/seed.ts creates the admin with a random UUID id
 * and school_generated_id OLISKEY_MAIN_ADM_0001; the runtime seeder used to
 * INSERT a second row with the same global ID → P2002 → empty sandbox → 503).
 *
 * P0 #4 — a query with no tenant and no platform scope must NOT bypass RLS.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { DemoSeederService } from '../../src/services/demoSeeder.service';
import { runAsPlatform, runWithTenantContext } from '../../src/lib/tenantContext';

const DEMO_SCHOOL = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';

describe('Demo seeding is idempotent and adopts pre-existing identities', () => {
    beforeAll(async () => {
        // Simulate prisma/seed.ts having run first: the admin exists under a
        // RANDOM id but already owns the global ID the seeder derives.
        await runAsPlatform(async () => {
            await prisma.school.upsert({ where: { id: DEMO_SCHOOL }, update: {}, create: { id: DEMO_SCHOOL, name: 'Oliskey Demo', code: 'OLISKEY', slug: 'demo-school', plan_type: 'enterprise', subscription_status: 'active' } as any });
            const existing = await prisma.user.findFirst({ where: { school_generated_id: 'OLISKEY_MAIN_ADM_0001' } });
            if (!existing) {
                await prisma.user.create({ data: { email: 'admin@demo.com', password_hash: await bcrypt.hash('password123', 4), full_name: 'Seeded Admin', role: 'ADMIN' as any, school_id: DEMO_SCHOOL, school_generated_id: 'OLISKEY_MAIN_ADM_0001', email_verified: true } as any });
            }
        });
    }, 60000);

    it('ensureDemoData() succeeds twice in a row and never creates a duplicate global ID', async () => {
        await runAsPlatform(() => DemoSeederService.ensureDemoData());
        await runAsPlatform(() => DemoSeederService.ensureDemoData());
        const rows = await runAsPlatform(() => prisma.user.findMany({ where: { school_generated_id: 'OLISKEY_MAIN_ADM_0001' }, select: { id: true, email: true } }));
        expect(rows.length).toBe(1);
    }, 180000);

    it('seeding 5 more times in a row creates no duplicate user, school, branch or global ID', async () => {
        for (let i = 0; i < 5; i++) await runAsPlatform(() => DemoSeederService.ensureDemoData());
        const dupes = await runAsPlatform(async () => ({
            byGlobalId: await prisma.$queryRawUnsafe<any[]>(`SELECT school_generated_id, count(*)::int AS n FROM "User" WHERE school_id = $1 AND school_generated_id IS NOT NULL GROUP BY 1 HAVING count(*) > 1`, DEMO_SCHOOL),
            byEmail: await prisma.$queryRawUnsafe<any[]>(`SELECT email, count(*)::int AS n FROM "User" WHERE school_id = $1 GROUP BY 1 HAVING count(*) > 1`, DEMO_SCHOOL),
            branches: await prisma.$queryRawUnsafe<any[]>(`SELECT code, count(*)::int AS n FROM "Branch" WHERE school_id = $1 GROUP BY 1 HAVING count(*) > 1`, DEMO_SCHOOL),
            schools: await prisma.school.count({ where: { id: DEMO_SCHOOL } }),
        }));
        expect(dupes.byGlobalId, `duplicate global IDs: ${JSON.stringify(dupes.byGlobalId)}`).toEqual([]);
        expect(dupes.byEmail, `duplicate demo emails: ${JSON.stringify(dupes.byEmail)}`).toEqual([]);
        expect(dupes.branches, `duplicate branch codes: ${JSON.stringify(dupes.branches)}`).toEqual([]);
        expect(dupes.schools).toBe(1);
    }, 600000);

    it('10 CONCURRENT seeds leave exactly one of everything, and demo logins keep working while they run', async () => {
        const before = await runAsPlatform(() => prisma.user.count({ where: { school_id: DEMO_SCHOOL } }));
        const errors: unknown[] = [];
        // Seeds and logins race each other, which is what a burst of demo
        // visitors arriving at a cold sandbox actually looks like.
        const seeds = Array.from({ length: 10 }, () => runAsPlatform(() => DemoSeederService.ensureDemoData()).catch(e => errors.push(e)));
        const logins = Array.from({ length: 10 }, (_, i) =>
            request(app).post('/api/auth/demo/login').send({ role: ['admin', 'teacher', 'student', 'parent'][i % 4] })
                .then(r => r.status).catch(() => 0));
        const [, loginStatuses] = await Promise.all([Promise.all(seeds), Promise.all(logins)]);

        const fatal = errors.map(e => (e as any)?.message ?? String(e)).filter(m => /P2002|P2028|duplicate key|Transaction already closed/i.test(m));
        expect(fatal, `concurrent seeding failed:\n${fatal.slice(0, 3).join('\n')}`).toEqual([]);

        const after = await runAsPlatform(async () => ({
            users: await prisma.user.count({ where: { school_id: DEMO_SCHOOL } }),
            dupIds: await prisma.$queryRawUnsafe<any[]>(`SELECT school_generated_id, count(*)::int AS n FROM "User" WHERE school_id = $1 AND school_generated_id IS NOT NULL GROUP BY 1 HAVING count(*) > 1`, DEMO_SCHOOL),
            schools: await prisma.school.count({ where: { id: DEMO_SCHOOL } }),
        }));
        expect(after.dupIds, `duplicate global IDs after concurrent seeding: ${JSON.stringify(after.dupIds)}`).toEqual([]);
        expect(after.schools).toBe(1);
        expect(after.users, `user count grew from ${before} to ${after.users} across 10 identical seeds`).toBe(before);
        // A login may legitimately answer 503 "warming up" while a sandbox seeds,
        // but must never fail outright.
        const broken = loginStatuses.filter(st => ![200, 503].includes(st));
        expect(broken, `demo logins broke during seeding: ${broken.join(',')}`).toEqual([]);
    }, 900000);

    it('every demo role can sign in (no 503 "warming up")', async () => {
        for (const role of ['admin', 'teacher', 'student', 'parent']) {
            const r = await request(app).post('/api/auth/demo/login').send({ role });
            expect(r.status, `${role}: ${JSON.stringify(r.body).slice(0, 120)}`).toBe(200);
            expect(r.body.token || r.body.access_token).toBeTruthy();
        }
    }, 60000);
});

describe('RLS is never bypassed without an explicit platform scope', () => {
    it('no scope → tenant rows invisible; platform scope → visible; tenant scope → own school only', async () => {
        // a request that reached the database with neither a tenant nor a platform scope
        const unscoped = await runWithTenantContext({ schoolId: null }, () => prisma.user.count());
        const platform = await runAsPlatform(() => prisma.user.count());
        const scoped = await runWithTenantContext({ schoolId: DEMO_SCHOOL }, () => prisma.user.count());
        const foreign = await runWithTenantContext({ schoolId: '00000000-0000-4000-8000-000000000000' }, () => prisma.user.count());
        expect(platform).toBeGreaterThan(0);
        expect(unscoped).toBe(0);
        expect(scoped).toBeGreaterThan(0);
        expect(scoped).toBeLessThanOrEqual(platform);
        expect(foreign).toBe(0);
    });
});
