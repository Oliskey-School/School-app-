-- Repair, then VALIDATE, the composite school/branch foreign keys that
-- 20260924130000_school_branch_pair_all_tables left permanently NOT VALID.
--
-- Why this exists: that migration added the (school_id, branch_id) -> Branch
-- pair constraint to every remaining business table, correctly creating each
-- one NOT VALID so the deploy is instant and lock-free. Unlike the earlier
-- batch (20260922093000, validated by 20260923100000) nothing ever validated
-- these, so 165 constraints were left half-applied.
--
-- What NOT VALID actually means matters here, because it is easy to read the
-- gap as larger than it is: Postgres still enforces a NOT VALID foreign key on
-- every INSERT and UPDATE. What it skips is the one-off scan of rows that
-- already existed. So new writes were already protected; the hole was that
-- historical rows were never checked, and the constraint could never be relied
-- on for reasoning about the table as a whole.
--
-- Verified against the live production database before writing this: every
-- table carrying both school_id and branch_id was queried for rows whose branch
-- belongs to a different school, and the result was zero. So on today's
-- production data the VALIDATE below is a pure no-op scan and cannot fail. The
-- repair step is kept anyway, because a migration must not assume the data it
-- happens to meet — a VALIDATE that hits a single violating row aborts the whole
-- deploy, which is exactly the stall 20260923100000 was written to avoid.
--
-- Repair rule is inherited from 20260923100000 so both batches behave the same:
-- the row's school_id is authoritative (it is what RLS filters on and what every
-- query scopes by), so the branch pointer is the provably wrong half. Such a row
-- is demoted to school-wide with branch_id = NULL — a valid state everywhere in
-- this schema — which keeps the row visible to its own school rather than
-- deleting anything.
--
-- Constraints are discovered from pg_constraint rather than hard-coded, so this
-- cannot drift out of step with the table list in 20260924130000.
--
-- VALIDATE takes only a SHARE UPDATE EXCLUSIVE lock, so reads and writes
-- continue throughout. Idempotent: an already-validated constraint is skipped,
-- and a re-run finds nothing to repair.
DO $$
DECLARE
  r record;
  repaired int;
  validated int := 0;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl, con.conname AS cname
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.contype = 'f'
      AND NOT con.convalidated
      AND n.nspname = 'public'
      AND con.conname LIKE '%\_school\_branch\_fkey'
    ORDER BY c.relname
  LOOP
    EXECUTE format(
      'UPDATE %I x SET branch_id = NULL
         FROM "Branch" b
        WHERE b.id = x.branch_id AND b.school_id IS DISTINCT FROM x.school_id', r.tbl);
    GET DIAGNOSTICS repaired = ROW_COUNT;
    IF repaired > 0 THEN
      RAISE NOTICE 'school/branch repair: % row(s) in "%" demoted to school-wide', repaired, r.tbl;
    END IF;

    EXECUTE format('ALTER TABLE %I VALIDATE CONSTRAINT %I', r.tbl, r.cname);
    validated := validated + 1;
  END LOOP;

  RAISE NOTICE 'school/branch pair constraints validated: %', validated;
END $$;
