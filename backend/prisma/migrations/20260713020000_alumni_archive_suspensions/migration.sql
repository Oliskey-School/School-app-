-- Alumni archive snapshot on Student + permanent StudentSuspension letters.

ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "exit_year" INTEGER;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "exit_class" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "exit_date" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "StudentSuspension" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "student_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "start_date" TEXT NOT NULL,
    "return_date" TEXT NOT NULL,
    "return_conditions" TEXT,
    "attachment_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'active',
    "issued_by" TEXT,
    "issued_by_name" TEXT,
    "returned_at" TIMESTAMP(3),
    "returned_by" TEXT,
    "return_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "StudentSuspension_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StudentSuspension_student_id_status_idx" ON "StudentSuspension"("student_id", "status");
CREATE INDEX IF NOT EXISTS "StudentSuspension_school_id_student_id_idx" ON "StudentSuspension"("school_id", "student_id");

DO $$ BEGIN
    ALTER TABLE "StudentSuspension" ADD CONSTRAINT "StudentSuspension_school_id_fkey"
        FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "StudentSuspension" ADD CONSTRAINT "StudentSuspension_branch_id_fkey"
        FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "StudentSuspension" ADD CONSTRAINT "StudentSuspension_student_id_fkey"
        FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
