-- Learning Hub: curated free/OER resources organized by academic level, per-student
-- progress tracking, and AI/teacher-generated study plans.

ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "grade_level" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "resource_kind" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "curriculum_type" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "source_name" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "is_curated" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Resource_school_id_grade_level_subject_idx" ON "Resource"("school_id", "grade_level", "subject");
CREATE INDEX IF NOT EXISTS "Resource_school_id_is_curated_idx" ON "Resource"("school_id", "is_curated");

CREATE TABLE IF NOT EXISTS "StudentResourceProgress" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "student_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "score" INTEGER,
    "time_spent_seconds" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudentResourceProgress_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "StudentResourceProgress_student_id_resource_id_key" ON "StudentResourceProgress"("student_id", "resource_id");
CREATE INDEX IF NOT EXISTS "StudentResourceProgress_school_id_student_id_idx" ON "StudentResourceProgress"("school_id", "student_id");
CREATE INDEX IF NOT EXISTS "StudentResourceProgress_school_id_resource_id_idx" ON "StudentResourceProgress"("school_id", "resource_id");

DO $$ BEGIN
    ALTER TABLE "StudentResourceProgress" ADD CONSTRAINT "StudentResourceProgress_school_id_fkey"
        FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "StudentResourceProgress" ADD CONSTRAINT "StudentResourceProgress_student_id_fkey"
        FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "StudentResourceProgress" ADD CONSTRAINT "StudentResourceProgress_resource_id_fkey"
        FOREIGN KEY ("resource_id") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "StudyPlan" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "student_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "generated_by" TEXT NOT NULL DEFAULT 'ai',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudyPlan_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "StudyPlan_school_id_student_id_idx" ON "StudyPlan"("school_id", "student_id");

DO $$ BEGIN
    ALTER TABLE "StudyPlan" ADD CONSTRAINT "StudyPlan_school_id_fkey"
        FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "StudyPlan" ADD CONSTRAINT "StudyPlan_student_id_fkey"
        FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "StudyPlanItem" (
    "id" TEXT NOT NULL,
    "study_plan_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "due_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudyPlanItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "StudyPlanItem_study_plan_id_idx" ON "StudyPlanItem"("study_plan_id");

DO $$ BEGIN
    ALTER TABLE "StudyPlanItem" ADD CONSTRAINT "StudyPlanItem_study_plan_id_fkey"
        FOREIGN KEY ("study_plan_id") REFERENCES "StudyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "StudyPlanItem" ADD CONSTRAINT "StudyPlanItem_resource_id_fkey"
        FOREIGN KEY ("resource_id") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
