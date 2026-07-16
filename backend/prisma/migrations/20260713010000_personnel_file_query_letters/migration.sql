-- Teacher personnel file: permanent record entries (promotions, warnings,
-- commendations, disciplinary notes) and formal query letters with the
-- teacher's response and the admin's closing outcome.

CREATE TABLE IF NOT EXISTS "TeacherRecord" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "teacher_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT,
    "effective_date" TEXT,
    "attachment_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "TeacherRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TeacherRecord_teacher_id_type_idx" ON "TeacherRecord"("teacher_id", "type");
CREATE INDEX IF NOT EXISTS "TeacherRecord_school_id_teacher_id_idx" ON "TeacherRecord"("school_id", "teacher_id");

DO $$ BEGIN
    ALTER TABLE "TeacherRecord" ADD CONSTRAINT "TeacherRecord_school_id_fkey"
        FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "TeacherRecord" ADD CONSTRAINT "TeacherRecord_branch_id_fkey"
        FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "TeacherRecord" ADD CONSTRAINT "TeacherRecord_teacher_id_fkey"
        FOREIGN KEY ("teacher_id") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "QueryLetter" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "teacher_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "issue_date" TEXT NOT NULL,
    "response_deadline" TEXT NOT NULL,
    "attachment_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'pending',
    "issued_by" TEXT,
    "issued_by_name" TEXT,
    "response_text" TEXT,
    "response_attachment_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "responded_at" TIMESTAMP(3),
    "is_late_response" BOOLEAN NOT NULL DEFAULT false,
    "outcome_note" TEXT,
    "closed_by" TEXT,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "QueryLetter_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "QueryLetter_teacher_id_status_idx" ON "QueryLetter"("teacher_id", "status");
CREATE INDEX IF NOT EXISTS "QueryLetter_school_id_teacher_id_idx" ON "QueryLetter"("school_id", "teacher_id");

DO $$ BEGIN
    ALTER TABLE "QueryLetter" ADD CONSTRAINT "QueryLetter_school_id_fkey"
        FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "QueryLetter" ADD CONSTRAINT "QueryLetter_branch_id_fkey"
        FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "QueryLetter" ADD CONSTRAINT "QueryLetter_teacher_id_fkey"
        FOREIGN KEY ("teacher_id") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
