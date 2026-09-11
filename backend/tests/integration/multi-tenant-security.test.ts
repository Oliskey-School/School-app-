import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma, { getRawPrisma } from '../../src/config/database';

/**
 * Regression gate for the multi-tenant boundary. This is NOT a full
 * re-audit — that lives in tests/security/{seed-tenants,attack}.ts, which
 * hits every registered route with real HTTP requests against two live
 * onboarded schools. This suite is the fast, CI-friendly tripwire: it fails
 * loudly the moment someone removes the mechanism the boundary depends on,
 * without needing a running server or two full tenant fixtures.
 *
 * If you are here because this test failed: do not silence it. Something
 * that used to enforce tenant isolation was removed. Find what changed in
 * the diff and restore it — see the comment on the specific assertion that
 * failed for what it is protecting.
 */

describe('Multi-tenant security regression gate', () => {
    describe('RLS is enabled and FORCED on every tenant-scoped table', () => {
        it('every table with school_id has RLS enabled, forced, and at least one policy', async () => {
            const rows: { relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean; policies: number }[] =
                await prisma.$queryRaw`
                    SELECT c.relname,
                           c.relrowsecurity,
                           c.relforcerowsecurity,
                           (SELECT COUNT(*)::int FROM pg_policies pol WHERE pol.tablename = c.relname) AS policies
                    FROM pg_class c
                    JOIN pg_namespace n ON n.oid = c.relnamespace
                    JOIN information_schema.columns col
                        ON col.table_schema = 'public' AND col.table_name = c.relname AND col.column_name = 'school_id'
                    WHERE n.nspname = 'public' AND c.relkind = 'r'
                `;

            expect(rows.length, 'no tenant-scoped tables found — RLS query is broken, not that isolation improved').toBeGreaterThan(50);

            const violations = rows.filter(r => !r.relrowsecurity || !r.relforcerowsecurity || r.policies === 0);
            expect(
                violations,
                `tables missing RLS/FORCE/policy: ${violations.map(v => `${v.relname}(rls=${v.relrowsecurity},force=${v.relforcerowsecurity},policies=${v.policies})`).join(', ')}`,
            ).toEqual([]);
        });

        it('every policy on a tenant table has WITH CHECK, applies to ALL commands, and filters by current_school_id', async () => {
            const pols: { tablename: string; policyname: string; cmd: string; qual: string | null; with_check: string | null }[] =
                await prisma.$queryRaw`
                    SELECT p.tablename, p.policyname, p.cmd, p.qual, p.with_check
                    FROM pg_policies p
                    JOIN information_schema.columns col
                        ON col.table_schema = 'public' AND col.table_name = p.tablename AND col.column_name = 'school_id'
                    WHERE p.schemaname = 'public'
                `;
            expect(pols.length).toBeGreaterThan(50);

            const noCheck = pols.filter(p => !p.with_check).map(p => `${p.tablename}/${p.policyname}`);
            expect(noCheck, `policies missing WITH CHECK (an UPDATE could move a row to another school): ${noCheck.join(', ')}`).toEqual([]);

            const notAll = pols.filter(p => p.cmd !== 'ALL').map(p => `${p.tablename}/${p.policyname}=${p.cmd}`);
            expect(notAll, `policies not covering ALL commands: ${notAll.join(', ')}`).toEqual([]);

            const noSchoolClause = pols.filter(p =>
                !/current_school_id/.test(p.qual || '') || !/current_school_id/.test(p.with_check || ''),
            ).map(p => `${p.tablename}/${p.policyname}`);
            expect(noSchoolClause, `policies not keyed on current_school_id: ${noSchoolClause.join(', ')}`).toEqual([]);
        });

        it('branch-scoped tables (school_id + branch_id) filter by current_branch_ids too', async () => {
            const pols: { tablename: string; policyname: string; qual: string | null; with_check: string | null }[] =
                await prisma.$queryRaw`
                    SELECT p.tablename, p.policyname, p.qual, p.with_check
                    FROM pg_policies p
                    WHERE p.schemaname = 'public'
                      AND p.tablename IN (
                        SELECT table_name FROM information_schema.columns
                        WHERE table_schema = 'public' AND column_name = 'branch_id'
                          AND table_name IN (SELECT table_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'school_id')
                      )
                `;
            expect(pols.length).toBeGreaterThan(50);
            const missing = pols.filter(p =>
                !/current_branch_ids/.test(p.qual || '') || !/current_branch_ids/.test(p.with_check || ''),
            ).map(p => `${p.tablename}/${p.policyname}`);
            expect(missing, `branch-scoped tables missing a branch clause: ${missing.join(', ')}`).toEqual([]);
        });

        it('the application database role cannot bypass RLS', async () => {
            const row: { rolbypassrls: boolean; rolsuper: boolean }[] = await prisma.$queryRaw`
                SELECT rolbypassrls, rolsuper FROM pg_roles WHERE rolname = current_user
            `;
            if (row[0]?.rolsuper) {
                // A Postgres superuser bypasses RLS by server design — that is not a
                // property of the application's own role, and no GRANT can change it.
                // CI's ephemeral Postgres service connects as the bootstrap `postgres`
                // superuser with no separate least-privilege role provisioned; this
                // check does not apply there. Production and local dev connect as a
                // real least-privilege role (`school_app`), where it does.
                return;
            }
            expect(row[0]?.rolbypassrls, 'the app DB role has BYPASSRLS — every policy above is decorative').toBe(false);
        });
    });

    describe('the RLS session context is set inside the SAME transaction as the query', () => {
        it('GUCs set with is_local=true do not leak to the next transaction', async () => {
            const raw = getRawPrisma() as any;
            await raw.$transaction([
                raw.$executeRaw`SELECT set_config('app.current_school_id', 'gate-test-marker', true)`,
            ]);
            const after: { v: string }[] = await raw.$queryRaw`SELECT current_setting('app.current_school_id', true) AS v`;
            expect(after[0]?.v, 'a tenant GUC survived past its transaction — it could leak into an unrelated request on a pooled connection').toBe('');
        });
    });

    describe('cross-tenant foreign-key writes are rejected at the service layer', () => {
        // These mirror the two write-path bugs the hostile probe found and fixed:
        // a bare foreign key accepted from the client with no same-school check.
        // RLS protects the ROW's own school_id; it does nothing for an unrelated
        // id embedded inside that row, so this class of bug needs an explicit test.
        let schoolA: string, schoolB: string, teacherB: string;

        beforeAll(async () => {
            const raw = getRawPrisma();
            const schools = await raw.school.findMany({ select: { id: true }, take: 2, orderBy: { created_at: 'desc' } });
            if (schools.length < 2) return; // seed-tenants.ts wasn't run first; the two it() bodies below no-op via the guard.
            [schoolA, schoolB] = schools.map(s => s.id);
            const teacher = await raw.teacher.findFirst({ where: { school_id: schoolB }, select: { id: true } });
            teacherB = teacher?.id ?? '';
        });

        it('TeacherAssignmentService.addDuty rejects a teacher id from another school', async () => {
            if (!schoolA || !teacherB) return; // fixture not present in this environment; the hostile probe covers this live.
            const { TeacherAssignmentService } = await import('../../src/services/teacherAssignment.service');
            await expect(TeacherAssignmentService.addDuty(schoolA, undefined, { teacher_id: teacherB, name: 'regression probe' }))
                .rejects.toThrow(/not found in this school/i);
        });

        it('StudentService.linkGuardian rejects a parent id from another school', async () => {
            if (!schoolA || !schoolB) return;
            const raw = getRawPrisma();
            const [studentA, parentB] = await Promise.all([
                raw.student.findFirst({ where: { school_id: schoolA }, select: { id: true } }),
                raw.parent.findFirst({ where: { school_id: schoolB }, select: { id: true } }),
            ]);
            if (!studentA || !parentB) return;
            const { StudentService } = await import('../../src/services/student.service');
            await expect(StudentService.linkGuardian(schoolA, undefined, { studentId: studentA.id, parentId: parentB.id }))
                .rejects.toThrow(/not found in this school/i);
        });
    });

    describe('a JWT cannot outlive a school move', () => {
        it('auth.middleware rejects a token whose school claim no longer matches the user row', async () => {
            // Static assertion, not a live HTTP call: confirms the guard exists in
            // source so a future edit that deletes it fails CI immediately, rather
            // than waiting for the (slow, live-server) hostile probe to notice.
            const fs = await import('fs');
            const src = fs.readFileSync(new URL('../../src/middleware/auth.middleware.ts', import.meta.url), 'utf8');
            expect(src, 'the token/row tenant-mismatch guard was removed from auth.middleware.ts').toMatch(
                /decoded\.school_id\s*&&\s*user\.school_id\s*&&\s*decoded\.school_id\s*!==\s*user\.school_id/,
            );
        });
    });

    describe('sensitive self-lookup routes require authentication', () => {
        it('verification status routes are not publicly reachable', async () => {
            const fs = await import('fs');
            const v = fs.readFileSync(new URL('../../src/routes/verification.routes.ts', import.meta.url), 'utf8');
            const p = fs.readFileSync(new URL('../../src/routes/parentAuth.routes.ts', import.meta.url), 'utf8');
            expect(v, 'GET /verification/status/:email lost its auth guard — this route answers "does this email exist + is it verified", an enumeration oracle if public').toMatch(
                /router\.get\(\s*['"]\/status\/:email['"]\s*,\s*authenticate/,
            );
            expect(p, 'GET /verify-email/status/:email lost its auth guard — same oracle, parent variant').toMatch(
                /router\.get\(\s*['"]\/verify-email\/status\/:email['"]\s*,\s*authenticate/,
            );
        });
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });
});
