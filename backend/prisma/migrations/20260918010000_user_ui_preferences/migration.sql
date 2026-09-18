-- Account-level UI preferences (dark mode, appearance) so a user's settings
-- follow them to a new device instead of living only in one browser's
-- localStorage. Additive, nullable.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ui_preferences" JSONB;
