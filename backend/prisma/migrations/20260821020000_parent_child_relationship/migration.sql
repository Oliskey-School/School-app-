-- The parent "Link a New Child" form collects a relationship (Father / Mother /
-- Guardian / Other) but ParentChild had no column for it, so every answer was
-- silently dropped. Idempotent: safe to re-run.

ALTER TABLE "ParentChild" ADD COLUMN IF NOT EXISTS "relationship" TEXT;
