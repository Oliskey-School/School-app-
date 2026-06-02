-- Per-child per-term billing model (Lagos State Nigerian academic calendar)
-- Phase 1: schema additions, plan/status migration, academic_calendars table + 2025/2026 seed.
-- Idempotent — safe to re-run.

BEGIN;

-- 1. schools — add billing snapshot columns
ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS student_count          INT      DEFAULT 0,
  ADD COLUMN IF NOT EXISTS term_amount            INT      DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_term           INT,
  ADD COLUMN IF NOT EXISTS academic_session       TEXT,
  ADD COLUMN IF NOT EXISTS term_resumption_date   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS term_closing_date      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paystack_auth_code     TEXT,
  ADD COLUMN IF NOT EXISTS paystack_customer_code TEXT,
  ADD COLUMN IF NOT EXISTS trial_used             BOOLEAN  DEFAULT false;

-- 2. Migrate existing values to the new vocabulary.
--    plan_type: premium | enterprise | per_child | unlimited → advanced
--               (Free stays Free, Basic stays Basic)
UPDATE schools SET plan_type = 'advanced'
  WHERE plan_type IN ('premium', 'enterprise', 'unlimited');
UPDATE schools SET plan_type = 'basic'
  WHERE plan_type IN ('per_child');

-- subscription_status: 'trial' is gone — fold into 'free'.
UPDATE schools SET subscription_status = 'free'
  WHERE subscription_status = 'trial';

-- 3. Drop the new default so existing rows get clean 'free' going forward.
ALTER TABLE schools ALTER COLUMN subscription_status SET DEFAULT 'free';

-- 4. AcademicCalendar table
CREATE TABLE IF NOT EXISTS academic_calendars (
  id              SERIAL PRIMARY KEY,
  session         TEXT NOT NULL,
  term            INT  NOT NULL CHECK (term IN (1, 2, 3)),
  resumption_date TIMESTAMPTZ NOT NULL,
  closing_date    TIMESTAMPTZ NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session, term)
);
CREATE INDEX IF NOT EXISTS idx_academic_calendars_resumption ON academic_calendars(resumption_date);
CREATE INDEX IF NOT EXISTS idx_academic_calendars_closing    ON academic_calendars(closing_date);

-- 5. Seed Lagos State 2025/2026 term dates (the official Harmonised Calendar).
INSERT INTO academic_calendars (session, term, resumption_date, closing_date) VALUES
  ('2025/2026', 1, '2025-09-15 00:00:00+01', '2025-12-19 23:59:59+01'),
  ('2025/2026', 2, '2026-01-12 00:00:00+01', '2026-04-17 23:59:59+01'),
  ('2025/2026', 3, '2026-05-04 00:00:00+01', '2026-07-24 23:59:59+01')
ON CONFLICT (session, term) DO NOTHING;

COMMIT;
