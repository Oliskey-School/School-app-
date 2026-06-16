-- Configurable academics: per-school and per-branch terms + grading.
CREATE TABLE IF NOT EXISTS "AcademicSettings" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "terms" JSONB,
    "grading" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AcademicSettings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AcademicSettings_school_id_branch_id_key" ON "AcademicSettings"("school_id", "branch_id");
CREATE INDEX IF NOT EXISTS "AcademicSettings_school_id_idx" ON "AcademicSettings"("school_id");
