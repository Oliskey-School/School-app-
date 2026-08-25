-- Dedicated application database role: oliskey_app
--
-- WHY THIS EXISTS
-- ---------------
-- Supabase hands you a `postgres` role that has rolbypassrls = true. Any
-- connection using it ignores every row-level security policy in the database.
-- Verified on 2026-08-24 against project xpkzeypoeunuckvurfpx: a plain
-- `SELECT * FROM "Student"` with no app.current_school_id set returned rows.
--
-- That means the 182 tenant_isolation policies created by
-- 20260822000000_row_level_security and 20260822010000_branch_level_rls were
-- decorative — tenant isolation rested entirely on ~1,900 Prisma call sites
-- each remembering its own school_id filter, which is exactly the situation
-- those migrations were written to end.
--
-- This role fixes that. It is:
--   * NOBYPASSRLS  - policies actually apply to it
--   * not an owner - table owners are exempt from RLS unless the table is
--                    FORCEd; the app never owning a table removes that
--                    entire class of accident
--   * LOGIN only   - no CREATEDB, no CREATEROLE, no SUPERUSER
--
-- WHO USES WHICH CONNECTION
-- -------------------------
--   DATABASE_URL  -> oliskey_app  (the running Express app; RLS enforced)
--   DIRECT_URL    -> postgres     (Prisma migrations; needs DDL + ownership)
--
-- Keeping migrations on `postgres` is deliberate: migrations legitimately
-- create and alter tables, which the app role must never be able to do.
--
-- RUNNING IT
-- ----------
-- Replace :'app_password' with a real value and run as `postgres`:
--
--   psql "$DIRECT_URL" -v app_password=<generated> -f backend/prisma/app_role.sql
--
-- Pass the password unquoted; :'app_password' below adds the quoting.
--
-- Idempotent: safe to re-run. Re-running does NOT change an existing password.

-- 1. The role itself.
--
-- Built as a string and run with \gexec rather than inside a DO block: psql
-- does not substitute :variables inside dollar-quoted bodies, so the DO-block
-- form fails with `syntax error at or near ":"`. The WHERE NOT EXISTS makes
-- this a no-op when the role is already there, which is what keeps re-runs
-- from resetting a live password.
SELECT format('CREATE ROLE oliskey_app LOGIN PASSWORD %L', :'app_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'oliskey_app')
\gexec

-- Explicit, even though these are the defaults for a fresh role: this is the
-- security boundary the whole file exists to establish, so it is stated rather
-- than assumed.
ALTER ROLE oliskey_app NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE;

-- 2. Access to the schema, but not the right to add to it.
GRANT USAGE ON SCHEMA public TO oliskey_app;
REVOKE CREATE ON SCHEMA public FROM oliskey_app;

-- 3. Data access on everything that exists today.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO oliskey_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO oliskey_app;

-- 4. And on everything migrations create later, so a new table is not silently
--    invisible to the app until someone remembers to re-run this file.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO oliskey_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO oliskey_app;

-- 5. The app must never rewrite its own migration history.
REVOKE ALL ON TABLE public."_prisma_migrations" FROM oliskey_app;
