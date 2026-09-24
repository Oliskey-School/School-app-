-- One gateway reference must credit exactly one payment — enforced by the
-- database, not only by application code.
--
-- What already existed: ParentService.recordPayment takes
-- pg_advisory_xact_lock(hashtext('payment-ref:<school>:<ref>')) and then
-- refuses a reference already present. That is correct and it does serialise
-- concurrent replays, but it has two gaps a constraint closes for good:
--
--   1. It is scoped to ONE school. The platform verifies references against a
--      single Paystack/Flutterwave account, so a reference that succeeds for
--      School A is equally valid when presented by School B. The per-school
--      lookup cannot see the other tenant's row — RLS hides it — so the same
--      real payment could be recorded once per school.
--   2. It only guards that one code path. Any other writer of Payment (for
--      example TransactionService.createTransaction, which admins can call
--      directly) inserts a reference with no idempotency check at all.
--
-- A UNIQUE INDEX is the right backstop for both: uniqueness is checked by the
-- index itself, so it applies across every tenant and every code path, and
-- unlike a SELECT it is never filtered by row level security.
--
-- Deliberately conservative — this must be safe on a live database:
--   * Partial (WHERE reference IS NOT NULL): rows that never came from a
--     gateway are untouched, and NULLs would not conflict anyway.
--   * Created only when the data is already clean. If historical duplicates
--     exist the index is SKIPPED with a NOTICE instead of failing the
--     migration: a failed migration row makes every later `prisma migrate
--     deploy` abort with P3009, which is a far worse outcome than continuing
--     with the application-level guard that is already in place.
--     backend/src/scripts/db-security-check.ts reports whether the index is
--     present, so a skipped index is visible rather than silent.
--
-- If it is skipped, list the offenders with:
--   SELECT reference, count(*) FROM "Payment"
--    WHERE reference IS NOT NULL GROUP BY reference HAVING count(*) > 1;
-- resolve them, then re-run this migration body by hand.

DO $$
DECLARE dup_count bigint;
BEGIN
  SELECT count(*) INTO dup_count FROM (
    SELECT reference FROM "Payment"
     WHERE reference IS NOT NULL AND reference <> ''
     GROUP BY reference HAVING count(*) > 1
  ) d;

  IF dup_count > 0 THEN
    RAISE NOTICE 'Payment.reference has % duplicated value(s); unique index SKIPPED. Resolve them and re-run this migration body.', dup_count;
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS "Payment_reference_key"
      ON "Payment" (reference)
      WHERE reference IS NOT NULL AND reference <> '';
    RAISE NOTICE 'Payment_reference_key created — a gateway reference can now be recorded at most once platform-wide.';
  END IF;
END $$;
