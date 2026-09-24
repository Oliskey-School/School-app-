-- A branch_id must belong to the SAME school as the row that points at it.
--
-- 177 tables carry both school_id and branch_id, and nothing in the database
-- tied the pair together: no composite foreign key, no unique key to target and
-- no trigger. The RLS branch clause does not close this either — for a
-- school-level admin `app.current_branch_ids` is deliberately empty ("no branch
-- restriction"), so the policy accepts ANY branch id. Proven by
-- tests/integration/school-branch-integrity.test.ts, which could insert a row
-- with School A's school_id and School B's branch id straight through a
-- correctly scoped tenant connection.
--
-- Strategy (deliberately conservative, safe on a live database):
--   1. UNIQUE (school_id, id) on Branch — the target a composite FK needs. It
--      is an index build on a small table; `id` is already unique so the
--      constraint can never fail.
--   2. Composite FKs on the CORE tenant tables, added NOT VALID. NOT VALID is
--      instant: it takes no table scan and no long lock, and it enforces the
--      pairing for every INSERT and UPDATE from this moment on. Existing rows
--      are not scanned here — they are covered by the database-wide invariant
--      assertion in the test above, which fails CI if any mismatch exists.
--   3. Validating the historical rows is a SEPARATE, online step so it can be
--      run during a quiet window (it takes only a SHARE UPDATE EXCLUSIVE lock):
--        ALTER TABLE "Student" VALIDATE CONSTRAINT "Student_school_branch_fkey";
--      ...and likewise for each constraint created below.
--
-- MATCH SIMPLE (the default) means a NULL branch_id skips the check, which is
-- exactly right: school-wide rows legitimately have no branch.
--
-- The remaining ~165 tables are intentionally NOT changed in this migration:
-- one DDL statement per table on a live database is a bigger change than the
-- risk warrants in one step, and the invariant test covers all of them. Extend
-- the list below table-by-table as each is verified clean.

ALTER TABLE "Branch" DROP CONSTRAINT IF EXISTS "Branch_school_id_id_key";
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_school_id_id_key" UNIQUE (school_id, id);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'User','Student','Teacher','Parent','Class','Subject',
    'StudentFee','Payment','ReportCard','Attendance','Assignment','Exam'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM pg_attribute a WHERE a.attrelid = format('%I', t)::regclass
        AND a.attname = 'branch_id' AND a.attnum > 0 AND NOT a.attisdropped
    ) THEN
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', t, t || '_school_branch_fkey');
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (school_id, branch_id) REFERENCES "Branch" (school_id, id) ON UPDATE CASCADE ON DELETE SET NULL (branch_id) NOT VALID',
        t, t || '_school_branch_fkey');
    END IF;
  END LOOP;
END $$;
