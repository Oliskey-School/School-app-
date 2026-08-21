-- Discreet (menstrual) support requests: the student-facing form has always
-- collected request_type, quantity_needed and a pickup location, but the
-- columns were never created. Every POST /api/student-reports/discreet failed
-- with `Unknown argument 'request_type'`, so no request was ever stored.
--
-- Idempotent: safe to re-run and safe on databases where a previous manual
-- attempt already added one of the columns.

ALTER TABLE "MenstrualSupportRequest" ADD COLUMN IF NOT EXISTS "request_type" TEXT;
ALTER TABLE "MenstrualSupportRequest" ADD COLUMN IF NOT EXISTS "quantity_needed" INTEGER;
ALTER TABLE "MenstrualSupportRequest" ADD COLUMN IF NOT EXISTS "pickup_location" TEXT;
