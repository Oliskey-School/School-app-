-- The application must connect as a role that CANNOT bypass row level security.
-- Dev/CI connected as the `postgres` superuser, for which RLS is never
-- enforced — so every tenant-isolation policy was untested there. Idempotent:
-- an existing role (production) is only re-asserted NOBYPASSRLS; its password
-- is never changed.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'oliskey_app') THEN
    CREATE ROLE oliskey_app NOLOGIN NOBYPASSRLS;
  END IF;
END $$;
ALTER ROLE oliskey_app NOBYPASSRLS NOSUPERUSER;
GRANT USAGE ON SCHEMA public TO oliskey_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO oliskey_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO oliskey_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO oliskey_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO oliskey_app;
