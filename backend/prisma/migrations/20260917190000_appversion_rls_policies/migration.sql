-- "AppVersion" is a platform-global table: it has no school_id, so
-- 20260822000000_row_level_security (which only writes tenant_isolation
-- policies for school_id-bearing tables) never gave it a policy. That was
-- harmless on a plain Postgres where RLS stayed off — but Supabase installs an
-- event trigger (rls_auto_enable) that switches RLS on for every table created
-- in public, and a table with RLS on and NO policy is default-deny for any
-- role without BYPASSRLS. The app connects as oliskey_app (NOBYPASSRLS), so in
-- production /api/versions returned [] and the version-registration upsert
-- was rejected. Verified 2026-09-17 on xpkzeypoeunuckvurfpx:
-- relrowsecurity=true, 0 policies, 0 rows. The update banner then fell back
-- to the running bundle's own version and named the OLD release as "new".
--
-- Enable RLS everywhere (so local dev reproduces production instead of hiding
-- this) and add the two policies the table actually needs:
--   * every authenticated request may read the published version list;
--   * writes are platform-level — only the explicit transaction-local bypass
--     flag the app sets for unscoped operations (see config/database.ts).
ALTER TABLE "AppVersion" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS appversion_read ON "AppVersion";
CREATE POLICY appversion_read ON "AppVersion"
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS appversion_platform_write ON "AppVersion";
CREATE POLICY appversion_platform_write ON "AppVersion"
  FOR ALL
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');
