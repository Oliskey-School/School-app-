-- "Free Learning Resources" website catalog (Resource.resource_kind = 'website') —
-- describes a whole external site with a human-readable age range rather than
-- a single curriculum grade_level.

ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "recommended_age" TEXT;
