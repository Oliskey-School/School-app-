-- Learning Hub "Customize" filter dimensions (PhET-style Subject Area, Grade
-- Band, Inclusive Features) — separate from the existing curriculum
-- grade_level/subject fields, which use our own school taxonomy.

ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "subject_area" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "grade_band" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "inclusive_features" TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS "Resource_school_id_subject_area_idx" ON "Resource"("school_id", "subject_area");
