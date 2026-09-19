-- The application must connect as a role that CANNOT bypass row level security.
-- Dev/CI connected as the `postgres` superuser, for which RLS is never
-- enforced — so every tenant-isolation policy was untested there.
--
-- Idempotent and safe on managed Postgres (Supabase's `postgres` is not a
-- superuser and may not ALTER a role it did not create — that is reported, not
-- fatal). The role is created WITHOUT login and WITHOUT a password: each
-- environment grants login with its own secret
--   ALTER ROLE oliskey_app LOGIN PASSWORD '<secret>';
-- and points DATABASE_URL at it, so no migration ever bakes a credential into a
-- database. Verify with: SELECT rolbypassrls FROM pg_roles WHERE rolname = 'oliskey_app';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'oliskey_app') THEN
    CREATE ROLE oliskey_app NOLOGIN NOBYPASSRLS;
  END IF;
  BEGIN
    ALTER ROLE oliskey_app NOBYPASSRLS NOSUPERUSER;
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'oliskey_app: cannot ALTER ROLE here (managed Postgres); verify rolbypassrls = false manually';
  END;
END $$;
GRANT USAGE ON SCHEMA public TO oliskey_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO oliskey_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO oliskey_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO oliskey_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO oliskey_app;
