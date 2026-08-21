-- Billing period + renewal state on School.
--
-- The SaaS SubscriptionManagement screen renders a billing period range and an
-- "Auto-renew" column, and its Cancel action posts auto_renew/canceled_at — but
-- none of these columns existed and no endpoint served them, so the screen was
-- entirely dead (both of its calls 404'd).
--
-- Idempotent: safe to re-run.

ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "subscription_period_start" TIMESTAMP(3);
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "subscription_period_end" TIMESTAMP(3);
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "auto_renew" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "canceled_at" TIMESTAMP(3);

-- Backfill from data we actually have, rather than inventing dates:
-- the period starts when the school was created, and for a school still on
-- trial it genuinely ends when the trial ends.
UPDATE "School"
   SET "subscription_period_start" = COALESCE("subscription_period_start", "created_at")
 WHERE "subscription_period_start" IS NULL;

UPDATE "School"
   SET "subscription_period_end" = "trial_ends_at"
 WHERE "subscription_period_end" IS NULL
   AND "trial_ends_at" IS NOT NULL;
