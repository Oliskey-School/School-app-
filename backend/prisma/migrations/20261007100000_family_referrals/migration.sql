-- Family referrals: a parent asks the school for support for their own child
-- (counselling, learning support, financial hardship, health, other).
--
-- Safe to re-run (every statement is guarded) and safe on a live database:
--   * the table is new, so no existing rows are locked or rewritten;
--   * RLS is enabled AND its policy created in this same migration. Production
--     has an event trigger that turns RLS on for every new table with no
--     policy (deny-all), so shipping the table without the policy would make
--     every read and write fail;
--   * the policy is the standard tenant + branch policy every school_id /
--     branch_id table uses (see 20260823000000_rls_performance);
--   * the composite (school_id, branch_id) -> Branch FK is the invariant the
--     migration-safety / db-security-check gates assert for every table that
--     carries both columns (see 20260924130000_school_branch_pair_all_tables).
--     branch_id is nullable, so ON DELETE SET NULL (branch_id) on PG15+, with
--     the same pre-15 fallback that migration uses.

CREATE TABLE IF NOT EXISTS "FamilyReferral" (
  "id"               TEXT NOT NULL,
  "school_id"        TEXT NOT NULL,
  "branch_id"        TEXT,
  "student_id"       TEXT NOT NULL,
  "parent_id"        TEXT NOT NULL,
  "referral_type"    TEXT NOT NULL,
  "need_description" TEXT NOT NULL,
  "urgency"          TEXT NOT NULL DEFAULT 'Medium',
  "is_confidential"  BOOLEAN NOT NULL DEFAULT false,
  "status"           TEXT NOT NULL DEFAULT 'Submitted',
  "staff_note"       TEXT,
  "handled_by"       TEXT,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL,
  "deleted_at"       TIMESTAMP(3),
  CONSTRAINT "FamilyReferral_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_FamilyReferral_school_branch" ON "FamilyReferral" ("school_id", "branch_id");
CREATE INDEX IF NOT EXISTS "idx_FamilyReferral_parent" ON "FamilyReferral" ("parent_id");

DO $$
DECLARE
  pg15 boolean := current_setting('server_version_num')::int >= 150000;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FamilyReferral_school_id_fkey') THEN
    ALTER TABLE "FamilyReferral" ADD CONSTRAINT "FamilyReferral_school_id_fkey"
      FOREIGN KEY ("school_id") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FamilyReferral_student_id_fkey') THEN
    ALTER TABLE "FamilyReferral" ADD CONSTRAINT "FamilyReferral_student_id_fkey"
      FOREIGN KEY ("student_id") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FamilyReferral_school_branch_fkey') THEN
    -- Same per-table exception handling as 20260924130000: if the Branch
    -- (school_id, id) key is somehow absent, record it and carry on rather
    -- than leave a failed row that blocks every later deploy (P3009). The
    -- migration-safety invariant ("every school_id+branch_id table carries
    -- <table>_school_branch_fkey") still fails CI loudly if this is skipped.
    BEGIN
      EXECUTE format(
        'ALTER TABLE "FamilyReferral" ADD CONSTRAINT "FamilyReferral_school_branch_fkey" '
        'FOREIGN KEY (school_id, branch_id) REFERENCES "Branch" (school_id, id) ON UPDATE CASCADE %s',
        CASE WHEN pg15 THEN 'ON DELETE SET NULL (branch_id)' ELSE 'ON DELETE NO ACTION' END);
    EXCEPTION WHEN others THEN
      RAISE WARNING 'FamilyReferral school/branch pair FK not added: %', SQLERRM;
    END;
  END IF;
END $$;

ALTER TABLE "FamilyReferral" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FamilyReferral" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "FamilyReferral";
CREATE POLICY tenant_isolation ON "FamilyReferral"
  USING ((school_id = (select current_setting('app.current_school_id', true)) AND (branch_id IS NULL OR (select current_setting('app.current_branch_ids', true)) = '' OR branch_id = ANY(string_to_array((select current_setting('app.current_branch_ids', true)), ',')))) OR (select coalesce(current_setting('app.bypass_rls', true), '')) = 'on')
  WITH CHECK ((school_id = (select current_setting('app.current_school_id', true)) AND (branch_id IS NULL OR (select current_setting('app.current_branch_ids', true)) = '' OR branch_id = ANY(string_to_array((select current_setting('app.current_branch_ids', true)), ',')))) OR (select coalesce(current_setting('app.bypass_rls', true), '')) = 'on');
