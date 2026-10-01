/**
 * school_id / branch_id pairing integrity.
 *
 * 177 tables carry BOTH school_id and branch_id, and the database has no
 * composite foreign key, unique key or trigger tying the pair together — the
 * only thing standing between a valid row and a row whose branch belongs to
 * ANOTHER school is application code plus the RLS branch clause. For a
 * school-level admin the RLS branch clause is deliberately empty ("no branch
 * restriction"), so the policy alone does NOT reject a foreign branch id.
 *
 * This test states the contract that matters in practice:
 *   1. a row may never end up with a branch that belongs to another school;
 *   2. writing one must be refused (or silently corrected), never persisted.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';
import { runAsPlatform, runWithTenantContext } from '../../src/lib/tenantContext';

const SA = 'sbi-a', SB = 'sbi-b', AB = 'sbi-ab', BB = 'sbi-bb', AU = 'sbi-a-admin';
const t = (p: any) => jwt.sign(p, config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });
const aMainAdmin = () => t({ id: AU, email: 'sbi-a@x.com', role: 'ADMIN', school_id: SA, branch_id: null, allowed_branch_ids: [] });

async function wipe() {
    await runAsPlatform(async () => {
        for (const s of [SA, SB]) {
            for (const m of ['class', 'subject', 'department', 'user', 'branch'] as const) {
                await (prisma as any)[m].deleteMany({ where: { school_id: s } }).catch(() => {});
            }
            await prisma.school.delete({ where: { id: s } }).catch(() => {});
        }
    });
}

describe('school_id / branch_id pairing', () => {
    beforeAll(async () => {
        await wipe();
        await runAsPlatform(async () => {
            await prisma.school.create({ data: { id: SA, name: 'SBI A', code: 'SBIA', slug: 'sbi-a', plan_type: 'premium', subscription_status: 'active' } as any });
            await prisma.school.create({ data: { id: SB, name: 'SBI B', code: 'SBIB', slug: 'sbi-b', plan_type: 'premium', subscription_status: 'active' } as any });
            await prisma.branch.create({ data: { id: AB, school_id: SA, name: 'A main', code: 'SBIAM', is_main: true } as any });
            await prisma.branch.create({ data: { id: BB, school_id: SB, name: 'B main', code: 'SBIBM', is_main: true } as any });
            await prisma.user.create({ data: { id: AU, email: 'sbi-a@x.com', password_hash: 'x', full_name: 'A admin', role: 'ADMIN' as any, school_id: SA, branch_id: null } as any });
        });
    }, 120000);
    afterAll(wipe, 120000);

    it('the API refuses to create a School A row pointing at School B’s branch', async () => {
        const res = await request(app).post('/api/classes')
            .set('Authorization', `Bearer ${aMainAdmin()}`)
            .set('x-branch-id', BB)
            .send({ name: 'Mismatched class', grade: 7, section: 'M', branch_id: BB });

        const rows = await runAsPlatform(() => prisma.$queryRawUnsafe<any[]>(
            `SELECT c.id, c.school_id, c.branch_id, b.school_id AS branch_school
               FROM "Class" c LEFT JOIN "Branch" b ON b.id = c.branch_id
              WHERE c.school_id = $1`, SA));
        const mismatched = rows.filter(r => r.branch_id && r.branch_school && r.branch_school !== r.school_id);
        expect(mismatched, `a row was stored whose branch belongs to another school (HTTP ${res.status}): ${JSON.stringify(mismatched)}`).toEqual([]);
    }, 120000);

    it('a direct scoped write cannot pair School A with School B’s branch', async () => {
        let accepted = false;
        await runWithTenantContext({ schoolId: SA, branchId: null, allowedBranchIds: [] }, async () => {
            try {
                await prisma.$executeRawUnsafe(
                    `INSERT INTO "Class" (id, school_id, branch_id, name, grade, section, created_at, updated_at) VALUES (gen_random_uuid()::text, $1, $2, 'mismatch', 7, 'M', now(), now())`,
                    SA, BB);
                accepted = true;
            } catch { /* refused */ }
        });
        const rows = await runAsPlatform(() => prisma.$queryRawUnsafe<any[]>(
            `SELECT c.id FROM "Class" c JOIN "Branch" b ON b.id = c.branch_id WHERE c.school_id <> b.school_id`));
        expect(accepted, 'the database accepted a school/branch pair from two different schools').toBe(false);
        expect(rows.length, 'mismatched Class rows exist').toBe(0);
    }, 120000);

    it('no row anywhere in the database pairs a school with another school’s branch', async () => {
        const offenders = await runAsPlatform(async () => {
            const tables: any[] = await prisma.$queryRawUnsafe(`
                SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname='public' AND c.relkind='r'
                  AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attname='school_id' AND a.attnum>0)
                  AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attname='branch_id' AND a.attnum>0)
                ORDER BY 1`);
            const bad: string[] = [];
            for (const { relname } of tables) {
                const r: any[] = await prisma.$queryRawUnsafe(
                    `SELECT count(*)::int AS n FROM "${relname}" x JOIN "Branch" b ON b.id = x.branch_id WHERE x.school_id <> b.school_id`);
                if (Number(r[0].n) > 0) bad.push(`${relname}: ${r[0].n}`);
            }
            return bad;
        });
        expect(offenders, `tables holding cross-school branch references:\n${offenders.join('\n')}`).toEqual([]);
    }, 300000);

    // The scan above proves only what is already stored; it cannot stop the
    // next INSERT. Migration 20260922093000 constrained 12 core tables and left
    // ~165 to that scan, so this asserts the constraint now exists on ALL of
    // them (20260924130000) — otherwise the invariant depends on a test run
    // rather than on the database.
    it('every table storing school_id + branch_id carries the composite foreign key', async () => {
        const unprotected = await runAsPlatform(() => prisma.$queryRawUnsafe<any[]>(`
            SELECT c.relname AS tbl
              FROM pg_class c
              JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname <> 'Branch'
               AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attname='school_id'  AND a.attnum>0 AND NOT a.attisdropped)
               AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attname='branch_id' AND a.attnum>0 AND NOT a.attisdropped)
               AND NOT EXISTS (
                     SELECT 1 FROM pg_constraint pc
                      WHERE pc.conrelid = c.oid AND pc.contype = 'f'
                        AND pc.conname = c.relname || '_school_branch_fkey')
             ORDER BY 1`));
        const names = unprotected.map(r => r.tbl);
        expect(names, `these tables can still be written with another school's branch:\n${names.join(', ')}`).toEqual([]);
    }, 120000);

    it('a non-core table also refuses a School A row pointing at School B’s branch', async () => {
        // Pick a constrained table that is NOT one of the original twelve, so
        // this fails if the constraint only ever reached the core tables.
        const core = ['User', 'Student', 'Teacher', 'Parent', 'Class', 'Subject',
            'StudentFee', 'Payment', 'ReportCard', 'Attendance', 'Assignment', 'Exam'];
        const candidates = await runAsPlatform(() => prisma.$queryRawUnsafe<any[]>(`
            SELECT c.relname AS tbl
              FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
              JOIN pg_constraint pc ON pc.conrelid=c.oid AND pc.contype='f'
                   AND pc.conname = c.relname || '_school_branch_fkey'
             WHERE n.nspname='public'
               AND NOT EXISTS (SELECT 1 FROM pg_attribute a
                                WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
                                  AND a.attnotnull AND a.atthasdef = false
                                  AND a.attname NOT IN ('id','school_id','branch_id','created_at','updated_at'))
             ORDER BY 1`));
        const target = candidates.map(r => r.tbl).find(t => !core.includes(t));
        if (!target) return; // nothing trivially insertable; the structural test above still covers it

        let accepted = false;
        await runWithTenantContext({ schoolId: SA, branchId: null, allowedBranchIds: [] }, async () => {
            try {
                await prisma.$executeRawUnsafe(
                    `INSERT INTO "${target}" (id, school_id, branch_id, created_at, updated_at)
                     VALUES (gen_random_uuid()::text, $1, $2, now(), now())`, SA, BB);
                accepted = true;
            } catch { /* refused, as it must be */ }
        });
        expect(accepted, `${target} accepted a school/branch pair from two different schools`).toBe(false);
    }, 120000);
});
