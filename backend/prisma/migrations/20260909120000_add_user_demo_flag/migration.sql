-- Keep the demo identity flag in the database in sync with the auth layer.
-- Existing rows are real users, so the safe default is false.
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "is_demo" BOOLEAN NOT NULL DEFAULT false;
