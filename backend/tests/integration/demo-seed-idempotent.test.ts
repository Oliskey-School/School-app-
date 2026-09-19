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
