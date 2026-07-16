-- Teacher QR attendance: physical classrooms with permanent QR tokens, a
-- classroom link on timetable lessons, and per-lesson scan records.

CREATE TABLE IF NOT EXISTS "Classroom" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "capacity" INTEGER,
    "qr_token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Classroom_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Classroom_qr_token_key" ON "Classroom"("qr_token");
CREATE UNIQUE INDEX IF NOT EXISTS "Classroom_branch_id_name_key" ON "Classroom"("branch_id", "name");

DO $$ BEGIN
    ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_school_id_fkey"
        FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_branch_id_fkey"
        FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Timetable" ADD COLUMN IF NOT EXISTS "classroom_id" TEXT;

DO $$ BEGIN
    ALTER TABLE "Timetable" ADD CONSTRAINT "Timetable_classroom_id_fkey"
        FOREIGN KEY ("classroom_id") REFERENCES "Classroom"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "LessonAttendance" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "timetable_id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "classroom_id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "class_name" TEXT,
    "scheduled_start" TEXT NOT NULL,
    "scheduled_end" TEXT NOT NULL,
    "scan_in_at" TIMESTAMP(3),
    "scan_out_at" TIMESTAMP(3),
    "duration_minutes" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "is_late" BOOLEAN NOT NULL DEFAULT false,
    "is_early_departure" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "LessonAttendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LessonAttendance_timetable_id_date_key" ON "LessonAttendance"("timetable_id", "date");
CREATE INDEX IF NOT EXISTS "LessonAttendance_school_id_date_idx" ON "LessonAttendance"("school_id", "date");
CREATE INDEX IF NOT EXISTS "LessonAttendance_teacher_id_date_idx" ON "LessonAttendance"("teacher_id", "date");

DO $$ BEGIN
    ALTER TABLE "LessonAttendance" ADD CONSTRAINT "LessonAttendance_school_id_fkey"
        FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "LessonAttendance" ADD CONSTRAINT "LessonAttendance_branch_id_fkey"
        FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "LessonAttendance" ADD CONSTRAINT "LessonAttendance_timetable_id_fkey"
        FOREIGN KEY ("timetable_id") REFERENCES "Timetable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "LessonAttendance" ADD CONSTRAINT "LessonAttendance_teacher_id_fkey"
        FOREIGN KEY ("teacher_id") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "LessonAttendance" ADD CONSTRAINT "LessonAttendance_classroom_id_fkey"
        FOREIGN KEY ("classroom_id") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
