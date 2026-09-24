-- Correct the scope of payment-reference uniqueness introduced two migrations ago.
--
-- 20260925100000 made the unique index partial (gateway payments only) AND scoped
-- it to (school_id, reference). The partial half was right. The per-school half
-- was wrong, and it weakened the exact invariant the payment-security suite
-- defends: a cross-school replay test expects 409 when School B presents School
-- A's reference, and per-school scoping makes that a legal insert instead.
--
-- The reasoning error was treating a gateway reference like an internal
-- identifier. It is not. A Paystack reference is unique across the whole
-- gateway, so the SAME reference appearing under two different schools is never
-- two legitimate payments — it is one payment being claimed twice. Scoping the
-- constraint per tenant quietly permitted that.
--
-- What stays: the partial predicate. Offline methods are excluded because 'Cash'
-- is a placeholder a human types, and it legitimately repeats — production holds
-- four such rows, all payment_method 'Cash' with the reference literally 'Cash ',
-- across two schools. A blanket unique index would make recording a second cash
-- payment impossible. The deny-list means an unknown or future payment_method is
-- treated as a gateway and enforced, rather than silently exempted.
--
-- What changes: uniqueness is global over that partial set rather than
-- per-school, so a gateway reference can be used exactly once platform-wide.
--
-- Safe on the current data: all four production payments are offline and
-- therefore outside the predicate, and there are no gateway payments at all yet,
-- so the index builds over an empty set.
--
-- Idempotent: the DROP covers databases that received the scoped index, and the
-- CREATE is guarded.

DROP INDEX IF EXISTS "Payment_school_reference_gateway_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_gateway_reference_key"
    ON "Payment" (reference)
    WHERE reference IS NOT NULL
      AND reference <> ''
      AND lower(payment_method) NOT IN
          ('cash', 'bank transfer', 'cheque', 'check', 'pos', 'manual', 'offline', 'waiver');

-- Fail loudly rather than leaving a deploy green with no protection, which is
-- how the original migration let a missing payment control reach production.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'Payment_gateway_reference_key'
    ) THEN
        RAISE EXCEPTION
            'Payment_gateway_reference_key was not created — gateway replay protection is NOT active. Resolve duplicate gateway references and re-run.';
    END IF;
END $$;
