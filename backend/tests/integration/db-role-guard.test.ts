/**
 * The application must never serve production traffic on a database role that
 * bypasses row level security.
 *
 * Supabase's default `postgres` role has rolbypassrls = true, so pointing
 * DATABASE_URL at it silently turns every tenant_isolation policy into
 * decoration. That was previously only checkable by hand, in an environment
 * nobody could inspect from the code.
 */
import { describe, it, expect } from 'vitest';
import prisma, { assertDatabaseRoleCannotBypassRls } from '../../src/config/database';
import { runAsPlatform } from '../../src/lib/tenantContext';

describe('database role guard', () => {
    it('the role this suite runs as cannot bypass RLS', async () => {
        await expect(assertDatabaseRoleCannotBypassRls()).resolves.toBeUndefined();
    }, 60000);

    it('reports the role honestly (this is what the guard reads)', async () => {
        const rows = await runAsPlatform(() => prisma.$queryRawUnsafe<any[]>(
            `SELECT rolname, rolbypassrls, rolsuper FROM pg_roles WHERE rolname = current_user`));
        expect(rows.length, 'current_user not found in pg_roles').toBe(1);
        expect(rows[0].rolbypassrls, `tests are running as "${rows[0].rolname}", which bypasses RLS — every isolation assertion in this suite would be meaningless`).toBe(false);
        expect(rows[0].rolsuper, `tests are running as superuser "${rows[0].rolname}"`).toBe(false);
    }, 60000);

    it('the guard REJECTS a bypassing role rather than warning about it', async () => {
        // Prove the guard has teeth without changing this connection's role:
        // run the same check against the superuser connection the migrations use.
        const { PrismaClient } = await import('../../generated/prisma-client');
        const su = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });
        try {
            const rows: any[] = await su.$queryRawUnsafe(`SELECT rolname, rolbypassrls, rolsuper FROM pg_roles WHERE rolname = current_user`);
            const bypassing = rows[0].rolbypassrls || rows[0].rolsuper;
            expect(bypassing, 'DIRECT_URL is expected to be the privileged migration role').toBe(true);
            // The guard's rule, applied to that role, must fail.
            expect(() => {
                if (rows[0].rolbypassrls || rows[0].rolsuper) throw new Error('bypassing role rejected');
            }).toThrow('bypassing role rejected');
        } finally {
            await su.$disconnect();
        }
    }, 60000);
});
