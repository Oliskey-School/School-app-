/**
 * Production database security diagnostic — SAFE TO RUN ANYWHERE.
 *
 * Answers the questions that decide whether tenant isolation is actually
 * enforced in a given environment, without ever printing a credential:
 *
 *   CURRENT_DATABASE_ROLE / rolbypassrls / rolsuper   — is RLS inert?
 *   RLS status                                        — tables missing RLS or policies
 *   Migration health                                  — failed/orphan/pending rows
 *   Server version                                    — the migrations need PG >= 15
 *   Composite school/branch integrity                 — constraints present + violations
 *
 * Run against production with the SAME DATABASE_URL the app uses:
 *   npx tsx backend/src/scripts/db-security-check.ts
 *
 * Exit code 0 = all hard requirements met, 1 = at least one FAIL.
 * Nothing here writes to the database; every statement is a read.
 */
import { PrismaClient } from '../../generated/prisma-client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

type Level = 'PASS' | 'FAIL' | 'WARN' | 'INFO';
const results: Array<{ level: Level; check: string; detail: string }> = [];
const add = (level: Level, check: string, detail: string) => results.push({ level, check, detail });

/** Redact everything but host/database so output can be pasted into a ticket. */
function safeTarget(): string {
    const raw = process.env.DATABASE_URL || '';
    if (!raw) return '(DATABASE_URL not set)';
    try {
        const u = new URL(raw);
        return `${u.hostname}:${u.port || '5432'}${u.pathname} (user "${u.username}")`;
    } catch {
        return '(unparseable DATABASE_URL)';
    }
}

async function main() {
    console.log('='.repeat(72));
    console.log('DATABASE SECURITY CHECK');
    console.log('Target:', safeTarget());
    console.log('NODE_ENV:', process.env.NODE_ENV || '(unset)');
    console.log('='.repeat(72));

    // ── 1. The role the APPLICATION connects as ─────────────────────────────
    const roleRows = await prisma.$queryRawUnsafe<Array<{
        rolname: string; rolsuper: boolean; rolbypassrls: boolean; rolcanlogin: boolean;
    }>>(`SELECT rolname, rolsuper, rolbypassrls, rolcanlogin
           FROM pg_roles WHERE rolname = current_user`);
    const role = roleRows[0];
    console.log('\n-- 1. CONNECTION ROLE --');
    if (!role) {
        add('FAIL', 'current role', 'could not read pg_roles for current_user');
    } else {
        console.log(`CURRENT_DATABASE_ROLE : ${role.rolname}`);
        console.log(`rolbypassrls          : ${role.rolbypassrls}`);
        console.log(`rolsuper              : ${role.rolsuper}`);
        if (role.rolbypassrls || role.rolsuper) {
            add('FAIL', 'RLS enforceable',
                `connected as "${role.rolname}" (rolbypassrls=${role.rolbypassrls}, rolsuper=${role.rolsuper}) — EVERY tenant policy is inert`);
        } else {
            add('PASS', 'RLS enforceable', `"${role.rolname}" is NOSUPERUSER + NOBYPASSRLS`);
        }
    }

    // The dedicated app role, whether or not we are currently using it.
    const appRole = await prisma.$queryRawUnsafe<Array<{
        rolname: string; rolsuper: boolean; rolbypassrls: boolean; rolcanlogin: boolean;
    }>>(`SELECT rolname, rolsuper, rolbypassrls, rolcanlogin FROM pg_roles WHERE rolname = 'oliskey_app'`);
    if (!appRole.length) {
        add('WARN', 'oliskey_app role', 'does not exist in this database (migration 20260919150000 not applied here?)');
    } else {
        const a = appRole[0];
        console.log(`oliskey_app           : bypassrls=${a.rolbypassrls} super=${a.rolsuper} login=${a.rolcanlogin}`);
        if (a.rolbypassrls || a.rolsuper) add('FAIL', 'oliskey_app hardening', 'oliskey_app can bypass RLS');
        else add('PASS', 'oliskey_app hardening', 'NOSUPERUSER + NOBYPASSRLS');
        if (!a.rolcanlogin) add('WARN', 'oliskey_app login', 'role cannot LOGIN — DATABASE_URL cannot be pointed at it yet');
    }

    // ── 2. Server version (migrations use PG15-only syntax) ─────────────────
    const [{ v }] = await prisma.$queryRawUnsafe<Array<{ v: string }>>(
        `SELECT current_setting('server_version') AS v`);
    const major = parseInt(String(v).split('.')[0], 10);
    console.log('\n-- 2. SERVER VERSION --');
    console.log('server_version        :', v);
    if (Number.isFinite(major) && major < 15) {
        add('FAIL', 'PostgreSQL >= 15',
            `server is ${v}; migration 20260922093000 uses "ON DELETE SET NULL (branch_id)", which is PG15+ only and will fail to apply`);
    } else {
        add('PASS', 'PostgreSQL >= 15', `server is ${v}`);
    }

    // ── 3. RLS coverage ─────────────────────────────────────────────────────
    const noRls = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
        `SELECT c.relname AS tablename
           FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity
            AND c.relname <> '_prisma_migrations'
          ORDER BY 1`);
    const tenantNoRls = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
        `SELECT c.relname AS tablename
           FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity
            AND EXISTS (SELECT 1 FROM pg_attribute a
                         WHERE a.attrelid=c.oid AND a.attname='school_id'
                           AND a.attnum>0 AND NOT a.attisdropped)
          ORDER BY 1`);
    const noPolicy = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
        `SELECT c.relname AS tablename
           FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity
            AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=c.relname)
          ORDER BY 1`);
    console.log('\n-- 3. ROW LEVEL SECURITY --');
    console.log('tables without RLS          :', noRls.length, noRls.length ? `(${noRls.map(r => r.tablename).join(', ')})` : '');
    console.log('…of which carry school_id   :', tenantNoRls.length, tenantNoRls.length ? `(${tenantNoRls.map(r => r.tablename).join(', ')})` : '');
    console.log('RLS on but no policy        :', noPolicy.length, noPolicy.length ? `(${noPolicy.map(r => r.tablename).join(', ')})` : '');
    // A table holding school_id with no RLS is a tenant table anyone can read.
    if (tenantNoRls.length) {
        add('FAIL', 'tenant tables protected',
            `${tenantNoRls.length} table(s) carry school_id but have RLS disabled: ${tenantNoRls.map(r => r.tablename).join(', ')}`);
    } else {
        add('PASS', 'tenant tables protected', 'every table carrying school_id has RLS enabled');
    }
    if (noPolicy.length) {
        add('FAIL', 'policies present', `RLS enabled with NO policy (deny-all, likely a bug): ${noPolicy.map(r => r.tablename).join(', ')}`);
    } else {
        add('PASS', 'policies present', 'every RLS-enabled table has at least one policy');
    }

    // ── 4. Migration health ─────────────────────────────────────────────────
    console.log('\n-- 4. MIGRATION HEALTH --');
    const hasTable = await prisma.$queryRawUnsafe<Array<{ r: string | null }>>(
        `SELECT to_regclass('public._prisma_migrations')::text AS r`);
    if (!hasTable[0]?.r) {
        add('WARN', 'migration history', '_prisma_migrations does not exist — database was never migrated by Prisma');
        console.log('_prisma_migrations: MISSING');
    } else {
        const rows = await prisma.$queryRawUnsafe<Array<{
            migration_name: string; finished_at: Date | null; rolled_back_at: Date | null;
        }>>(`SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations`);
        const failed = rows.filter(r => !r.finished_at && !r.rolled_back_at);
        const counts = rows.reduce<Record<string, number>>((m, r) => (m[r.migration_name] = (m[r.migration_name] || 0) + 1, m), {});
        const dups = Object.entries(counts).filter(([, n]) => n > 1);

        let folder: string[] = [];
        const dir = path.resolve(__dirname, '../../prisma/migrations');
        try { folder = fs.readdirSync(dir).filter(f => /^\d/.test(f)); } catch { /* not shipped in the runtime bundle */ }
        const applied = new Set(rows.map(r => r.migration_name));
        const pending = folder.filter(f => !applied.has(f));
        const orphan = folder.length ? [...applied].filter(a => !folder.includes(a)) : [];

        console.log('applied rows          :', rows.length);
        console.log('failed (unfinished)   :', failed.length, failed.map(f => f.migration_name).join(', '));
        console.log('duplicate rows        :', dups.length, dups.map(([n, c]) => `${n} x${c}`).join(', '));
        console.log('pending (in folder)   :', pending.length, pending.join(', '));
        console.log('applied but not in repo:', orphan.length, orphan.join(', '));

        // A failed row makes `prisma migrate deploy` abort with P3009 — hard blocker.
        if (failed.length) {
            add('FAIL', 'migrate deploy can run',
                `${failed.length} failed migration row(s) (${failed.map(f => f.migration_name).join(', ')}) — prisma migrate deploy aborts with P3009 until resolved`);
        } else {
            add('PASS', 'migrate deploy can run', 'no failed migration rows');
        }
        if (dups.length) add('WARN', 'migration history clean', `duplicate rows: ${dups.map(([n, c]) => `${n} x${c}`).join(', ')}`);
        if (orphan.length) add('WARN', 'migration history clean', `applied but absent from this branch: ${orphan.join(', ')}`);
        if (pending.length) add('INFO', 'pending migrations', pending.join(', '));
    }

    // ── 5. school/branch composite integrity ────────────────────────────────
    console.log('\n-- 5. SCHOOL/BRANCH PAIR INTEGRITY --');
    const pairFks = await prisma.$queryRawUnsafe<Array<{ conrelid: string; conname: string; convalidated: boolean }>>(
        `SELECT c.conrelid::regclass::text AS conrelid, c.conname, c.convalidated
           FROM pg_constraint c
          WHERE c.contype='f' AND c.conname LIKE '%_school_branch_fkey'
          ORDER BY 1`);
    const bothCols = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
        `SELECT count(*) AS n FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace
          WHERE ns.nspname='public' AND c.relkind='r'
            AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attname='school_id' AND a.attnum>0 AND NOT a.attisdropped)
            AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attname='branch_id' AND a.attnum>0 AND NOT a.attisdropped)`);
    const total = Number(bothCols[0]?.n || 0);
    const unvalidated = pairFks.filter(f => !f.convalidated);
    console.log(`tables with school_id+branch_id : ${total}`);
    console.log(`composite FKs present           : ${pairFks.length} (${unvalidated.length} NOT VALIDATED)`);
    if (!pairFks.length) {
        add('FAIL', 'school/branch pairing', 'no composite (school_id, branch_id) foreign keys exist — the database cannot reject a cross-school branch');
    } else {
        add(pairFks.length < total ? 'WARN' : 'PASS', 'school/branch pairing',
            `${pairFks.length}/${total} tables carry the composite FK${unvalidated.length ? `; ${unvalidated.length} still NOT VALID (new writes checked, legacy rows unscanned)` : ''}`);
    }

    // ── verdict ─────────────────────────────────────────────────────────────
    console.log('\n' + '='.repeat(72));
    for (const r of results) console.log(`${r.level.padEnd(4)} | ${r.check.padEnd(28)} | ${r.detail}`);
    const fails = results.filter(r => r.level === 'FAIL');
    console.log('='.repeat(72));
    console.log(fails.length ? `RESULT: ${fails.length} FAILING CHECK(S) — NOT SAFE FOR PRODUCTION` : 'RESULT: all hard requirements met');
    await prisma.$disconnect();
    process.exit(fails.length ? 1 : 0);
}

main().catch(async (e) => {
    console.error('db-security-check failed:', e instanceof Error ? e.message : e);
    await prisma.$disconnect().catch(() => { });
    process.exit(1);
});
