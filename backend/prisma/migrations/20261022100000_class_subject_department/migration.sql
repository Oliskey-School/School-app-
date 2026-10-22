-- Class subject departments: a subject taught in a class only to students of
-- one department (e.g. Literature for SSS 1 Arts students). One row per
-- (class, subject); no row means the subject is for every student in the class.
-- The class<->subject link itself stays in the implicit "_ClassToSubject" table,
-- so every existing read keeps working unchanged.
--
-- Safe to re-run (every statement is guarded) and safe on a live database:
--   * the table is new, so no existing rows are locked or rewritten;
--   * RLS is enabled AND its policy created in this same migration. Production
--     has an event trigger that turns RLS on for every new table with no
--     policy (deny-all), so shipping the table without the policy would make
--     every read and write fail;
--   * the policy is the standard tenant + branch policy every school_id /
--     branch_id table uses (copied from 20261007100000_family_referrals);
--   * the composite (school_id, branch_id) -> Branch FK is the invariant the
--     migration-safety / db-security-check gates assert for every table that
--     carries both columns (see 20260924130000_school_branch_pair_all_tables).
--     branch_id is nullable, so ON DELETE SET NULL (branch_id) on PG15+, with
--     the same pre-15 fallback that migration uses.

CREATE TABLE IF NOT EXISTS "ClassSubjectDepartment" (
  "id"         TEXT NOT NULL,
  "school_id"  TEXT NOT NULL,
  "branch_id"  TEXT,
  "class_id"   TEXT NOT NULL,
  "subject_id" TEXT NOT NULL,
  "department" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClassSubjectDepartment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClassSubjectDepartment_class_subject_key" ON "ClassSubjectDepartment" ("class_id", "subject_id");
CREATE INDEX IF NOT EXISTS "idx_ClassSubjectDepartment_school_branch" ON "ClassSubjectDepartment" ("school_id", "branch_id");

DO $$
DECLARE
  pg15 boolean := current_setting('server_version_num')::int >= 150000;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClassSubjectDepartment_school_id_fkey') THEN
    ALTER TABLE "ClassSubjectDepartment" ADD CONSTRAINT "ClassSubjectDepartment_school_id_fkey"
      FOREIGN KEY ("school_id") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  -- Deleting the class or the subject removes its department rows with it.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClassSubjectDepartment_class_id_fkey') THEN
    ALTER TABLE "ClassSubjectDepartment" ADD CONSTRAINT "ClassSubjectDepartment_class_id_fkey"
      FOREIGN KEY ("class_id") REFERENCES "Class" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClassSubjectDepartment_subject_id_fkey') THEN
    ALTER TABLE "ClassSubjectDepartment" ADD CONSTRAINT "ClassSubjectDepartment_subject_id_fkey"
      FOREIGN KEY ("subject_id") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClassSubjectDepartment_school_branch_fkey') THEN
    -- Same per-table exception handling as 20260924130000: if the Branch
    -- (school_id, id) key is somehow absent, record it and carry on rather
    -- than leave a failed row that blocks every later deploy (P3009). The
    -- migration-safety invariant ("every school_id+branch_id table carries
    -- <table>_school_branch_fkey") still fails CI loudly if this is skipped.
    BEGIN
      EXECUTE format(
        'ALTER TABLE "ClassSubjectDepartment" ADD CONSTRAINT "ClassSubjectDepartment_school_branch_fkey" '
        'FOREIGN KEY (school_id, branch_id) REFERENCES "Branch" (school_id, id) ON UPDATE CASCADE %s',
        CASE WHEN pg15 THEN 'ON DELETE SET NULL (branch_id)' ELSE 'ON DELETE NO ACTION' END);
    EXCEPTION WHEN others THEN
      RAISE WARNING 'ClassSubjectDepartment school/branch pair FK not added: %', SQLERRM;
    END;
  END IF;
END $$;

ALTER TABLE "ClassSubjectDepartment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClassSubjectDepartment" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ClassSubjectDepartment";
CREATE POLICY tenant_isolation ON "ClassSubjectDepartment"
  USING ((school_id = (select current_setting('app.current_school_id', true)) AND (branch_id IS NULL OR (select current_setting('app.current_branch_ids', true)) = '' OR branch_id = ANY(string_to_array((select current_setting('app.current_branch_ids', true)), ',')))) OR (select coalesce(current_setting('app.bypass_rls', true), '')) = 'on')
  WITH CHECK ((school_id = (select current_setting('app.current_school_id', true)) AND (branch_id IS NULL OR (select current_setting('app.current_branch_ids', true)) = '' OR branch_id = ANY(string_to_array((select current_setting('app.current_branch_ids', true)), ',')))) OR (select coalesce(current_setting('app.bypass_rls', true), '')) = 'on');
