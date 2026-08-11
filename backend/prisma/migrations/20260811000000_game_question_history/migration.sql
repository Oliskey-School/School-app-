-- Educational games: gamification progress on Student, and a history of every
-- AI-generated question shown to a student so future rounds never repeat one.

ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "xp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "level" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS "GameQuestionHistory" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "game_type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "question_text" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "GameQuestionHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "GameQuestionHistory_student_id_game_type_subject_idx" ON "GameQuestionHistory"("student_id", "game_type", "subject");

DO $$ BEGIN
    ALTER TABLE "GameQuestionHistory" ADD CONSTRAINT "GameQuestionHistory_school_id_fkey"
        FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "GameQuestionHistory" ADD CONSTRAINT "GameQuestionHistory_student_id_fkey"
        FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
