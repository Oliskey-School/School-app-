-- Per-user language preference for the multilingual UI. Nullable: when unset the
-- app falls back to the device/browser language, then English.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "preferred_language" TEXT;
