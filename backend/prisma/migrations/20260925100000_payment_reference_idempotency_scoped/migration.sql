-- Supersede the payment-reference uniqueness added by 20260924120000.
--
-- That migration created ONE GLOBAL unique index on "Payment"(reference), and
-- only when the table happened to hold no duplicates — otherwise it raised a
-- NOTICE and skipped, leaving the deploy green with no protection in place.
-- Both halves of that are wrong against real production data.
--
-- What the production table actually contains, checked before writing this:
-- four rows, every one payment_method = 'Cash', every one with the reference
-- literally 'Cash ' (trailing space), spread across TWO different schools and
-- four different amounts. They are hand-entered cash receipts, not duplicated
-- gateway transactions. There are currently no gateway payments at all.
--
-- So on production the old migration would have taken the skip branch and
-- silently applied nothing, while the migration list implied that payment
-- replay protection existed. That is the failure mode this whole audit is meant
-- to catch: on an empty CI database there are no duplicates, the index is
-- created, and everything looks green.
--
-- Two design faults are corrected here:
--
--   1. GLOBAL -> PER SCHOOL. A unique index on reference alone is cross-tenant:
--      whichever school first recorded reference 'X' would stop every other
--      school from ever using it. Uniqueness is scoped to (school_id, reference).
--
--   2. ALL ROWS -> GATEWAY ROWS ONLY. A gateway reference is externally
--      generated and must never repeat; 'Cash' is a placeholder a human types
--      and legitimately repeats. A blanket unique index would have made it
--      impossible to ever record a second cash payment. The index is therefore
--      partial, excluding the offline methods.
--
-- The exclusion list is deliberately a deny-list, not an allow-list: an unknown
-- or newly added payment_method is ENFORCED rather than exempted, so a future
-- gateway is protected the day it is introduced instead of silently slipping
-- through. Verified against production: zero conflicting (school_id, reference)
-- groups under this exact predicate, so the index builds cleanly.
--
-- This runs as a normal migration rather than an edit to 20260924120000,
-- because that migration has already been applied elsewhere and rewriting it
-- would break Prisma's checksum for those databases.
--
-- Idempotent: DROP ... IF EXISTS covers the database where the old global index
-- was created, and is a no-op on production where it was skipped.

DROP INDEX IF EXISTS "Payment_reference_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_school_reference_gateway_key"
    ON "Payment" (school_id, reference)
    WHERE reference IS NOT NULL
      AND reference <> ''
      AND lower(payment_method) NOT IN
          ('cash', 'bank transfer', 'cheque', 'check', 'pos', 'manual', 'offline', 'waiver');

-- Fail loudly if the index did not end up in place. The previous migration's
-- habit of reporting success while applying nothing is precisely what allowed a
-- missing payment control to reach production unnoticed.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'Payment_school_reference_gateway_key'
    ) THEN
        RAISE EXCEPTION
            'Payment_school_reference_gateway_key was not created — payment replay protection is NOT active. Resolve duplicate (school_id, reference) pairs for gateway payments and re-run.';
    END IF;
END $$;
