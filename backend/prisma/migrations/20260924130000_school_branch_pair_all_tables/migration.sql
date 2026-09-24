-- Finish the job started in 20260922093000: the DATABASE must reject a
-- branch that belongs to a different school, on every table that stores the
-- pair — not just twelve of them.
--
-- Why this is the root cause and not the previous mitigation:
--   20260922093000 added the composite FK to 12 core tables and left the other
--   ~165 to a CI assertion that scans for existing mismatches. That assertion
--   can only prove the rows present when it runs; it cannot stop the next
--   INSERT. RLS does not close the gap either — for a school-level admin
--   `app.current_branch_ids` is deliberately empty ("no branch restriction"),
--   so the branch clause accepts ANY branch id as long as school_id matches
--   the tenant. So on those 165 tables a correctly scoped, fully authorised
--   request could still write School A's row pointing at School B's branch.
--   Only a constraint on the pair prevents that, so every such table gets one.
--
-- Safety properties (this must be safe on a live database):
--   * NOT VALID  — no table scan, no long lock. The constraint is enforced for
--     every INSERT and UPDATE from the moment it exists; existing rows are left
--     for the separate VALIDATE step in 20260923100000 / a quiet window.
--   * ON DELETE mirrors each table's EXISTING single-column branch_id rule, so
--     deletion behaviour is unchanged: nullable branch_id => SET NULL (what
--     Student/Class already do), NOT NULL branch_id => CASCADE (what Classroom
--     already does). A NOT NULL column cannot take SET NULL, which is why the
--     two cases differ.
--   * Version-aware. `ON DELETE SET NULL (branch_id)` is PostgreSQL 15+ syntax;
--     on older servers the column-list form is skipped and a plain NO ACTION
--     composite FK is used instead. The pairing is still enforced — only the
--     delete-time convenience differs — so this migration no longer makes the
--     deployment depend on PG >= 15.
--   * Per-table exception handling: one unusual table cannot abort the whole
--     migration and leave a failed row that aborts every later deploy (P3009).
--   * Idempotent: skips any table that already carries the constraint.

DO $$
DECLARE
  r            record;
  pg15         boolean := current_setting('server_version_num')::int >= 150000;
  del_clause   text;
  added        int := 0;
  skipped      int := 0;
  failed       int := 0;
BEGIN
  FOR r IN
    SELECT c.oid,
           c.relname AS tbl,
           a_branch.attnotnull AS branch_required
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a_school ON a_school.attrelid = c.oid
           AND a_school.attname = 'school_id' AND a_school.attnum > 0 AND NOT a_school.attisdropped
      JOIN pg_attribute a_branch ON a_branch.attrelid = c.oid
           AND a_branch.attname = 'branch_id' AND a_branch.attnum > 0 AND NOT a_branch.attisdropped
     WHERE n.nspname = 'public'
       AND c.relkind = 'r'
       AND c.relname <> 'Branch'
       -- both columns must be text to match Branch(school_id, id)
       AND a_school.atttypid = 'text'::regtype
       AND a_branch.atttypid = 'text'::regtype
       AND NOT EXISTS (
             SELECT 1 FROM pg_constraint pc
              WHERE pc.conrelid = c.oid
                AND pc.conname = c.relname || '_school_branch_fkey')
     ORDER BY c.relname
  LOOP
    IF r.branch_required THEN
      -- branch_id is mandatory: the row cannot outlive its branch. Matches the
      -- CASCADE already on these tables' single-column branch_id FK.
      del_clause := 'ON DELETE CASCADE';
    ELSIF pg15 THEN
      del_clause := 'ON DELETE SET NULL (branch_id)';
    ELSE
      -- Pre-15 cannot null just one column of the key; keep the pairing and
      -- leave delete behaviour to the existing single-column FK.
      del_clause := 'ON DELETE NO ACTION';
    END IF;

    BEGIN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (school_id, branch_id) '
        'REFERENCES "Branch" (school_id, id) ON UPDATE CASCADE %s NOT VALID',
        r.tbl, r.tbl || '_school_branch_fkey', del_clause);
      added := added + 1;
    EXCEPTION WHEN others THEN
      failed := failed + 1;
      RAISE NOTICE 'school/branch pair FK skipped for %: %', r.tbl, SQLERRM;
    END;
  END LOOP;

  SELECT count(*) INTO skipped
    FROM pg_constraint WHERE contype = 'f' AND conname LIKE '%\_school\_branch\_fkey';

  RAISE NOTICE 'school/branch pair integrity: % constraint(s) added, % could not be added, % present in total (PG15 syntax: %)',
    added, failed, skipped, pg15;
END $$;
