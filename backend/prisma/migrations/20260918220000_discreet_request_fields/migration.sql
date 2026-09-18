-- Discreet support requests: the student form sends what is needed, how many
-- and where to collect it; the table only had free-text notes, so the insert
-- failed (HTTP 500) and no request was ever recorded. Idempotent.
ALTER TABLE "MenstrualSupportRequest" ADD COLUMN IF NOT EXISTS "request_type" TEXT;
ALTER TABLE "MenstrualSupportRequest" ADD COLUMN IF NOT EXISTS "quantity" INTEGER;
ALTER TABLE "MenstrualSupportRequest" ADD COLUMN IF NOT EXISTS "pickup_location" TEXT;
