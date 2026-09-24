-- Repair rows whose branch belongs to another school, then validate the
-- composite foreign keys added in 20260922093000.
--
-- Why this exists: those constraints were created NOT VALID so the deploy is
-- instant and lock-free, which means they guard every NEW write but leave
-- historical rows untouched. A rehearsal on a database seeded with real
-- pre-existing violations showed that the follow-up
--   ALTER TABLE ... VALIDATE CONSTRAINT ...
-- simply FAILS on any table that still holds one, so "deploy then validate
-- later" would have stalled halfway with no guidance.
--
-- Repair rule: the row's school_id is authoritative (it is what RLS filters on
-- and what every query scopes by); the branch pointer is the part that is
-- provably wrong. Such a row is therefore demoted to school-wide by setting
-- branch_id = NULL, which is a valid state everywhere in this schema (a NULL
-- branch means "not branch-specific") and keeps the row visible to its own
-- school instead of deleting anything. MATCH SIMPLE then accepts it.
--
-- Each repair is reported via RAISE NOTICE so a production run leaves a record
-- of exactly what it touched. VALIDATE takes only a SHARE UPDATE EXCLUSIVE
-- lock, so reads and writes continue during it.
--
-- Idempotent: re-running finds nothing to repair and re-validating is a no-op.
DO $$
DECLARE
  t text;
  repaired int;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'User','Student','Teacher','Parent','Class','Subject',
    'StudentFee','Payment','ReportCard','Attendance','Assignment','Exam'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = format('%I', t)::regclass AND conname = t || '_school_branch_fkey'
    ) THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'UPDATE %I x SET branch_id = NULL
         FROM "Branch" b
        WHERE b.id = x.branch_id AND b.school_id IS DISTINCT FROM x.school_id', t);
    GET DIAGNOSTICS repaired = ROW_COUNT;
    IF repaired > 0 THEN
      RAISE NOTICE 'school/branch repair: % row(s) in % had a branch from another school and were set to school-wide', repaired, t;
    END IF;

    EXECUTE format('ALTER TABLE %I VALIDATE CONSTRAINT %I', t, t || '_school_branch_fkey');
  END LOOP;
END $$;
