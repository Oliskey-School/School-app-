-- Department Management, School Clubs (attendance + achievement linkage),
-- School Calendar Automation and Digital Twin ride on existing tables and
-- need no schema change of their own.

ALTER TABLE "Budget" ADD COLUMN IF NOT EXISTS "department_id" TEXT;
ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "department_id" TEXT;
ALTER TABLE "Achievement" ADD COLUMN IF NOT EXISTS "activity_id" TEXT;

CREATE TABLE IF NOT EXISTS "Department" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "name" TEXT NOT NULL,
    "head_teacher_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Department_school_id_branch_id_name_key" ON "Department"("school_id", "branch_id", "name");
DO $$ BEGIN
    ALTER TABLE "Department" ADD CONSTRAINT "Department_school_id_fkey"
        FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "Department" ADD CONSTRAINT "Department_head_teacher_id_fkey"
        FOREIGN KEY ("head_teacher_id") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_department_id_fkey"
        FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "Budget" ADD CONSTRAINT "Budget_department_id_fkey"
        FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_activity_id_fkey"
        FOREIGN KEY ("activity_id") REFERENCES "ExtracurricularActivity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "DepartmentMeeting" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "department_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT,
    "agenda" JSONB,
    "minutes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "DepartmentMeeting_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "DepartmentMeeting_department_id_date_idx" ON "DepartmentMeeting"("department_id", "date");
DO $$ BEGIN
    ALTER TABLE "DepartmentMeeting" ADD CONSTRAINT "DepartmentMeeting_department_id_fkey"
        FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "DepartmentMeeting" ADD CONSTRAINT "DepartmentMeeting_school_id_fkey"
        FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ClubAttendance" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "activity_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Present',
    "marked_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClubAttendance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ClubAttendance_activity_id_student_id_date_key" ON "ClubAttendance"("activity_id", "student_id", "date");
CREATE INDEX IF NOT EXISTS "ClubAttendance_activity_id_date_idx" ON "ClubAttendance"("activity_id", "date");
DO $$ BEGIN
    ALTER TABLE "ClubAttendance" ADD CONSTRAINT "ClubAttendance_activity_id_fkey"
        FOREIGN KEY ("activity_id") REFERENCES "ExtracurricularActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "ClubAttendance" ADD CONSTRAINT "ClubAttendance_student_id_fkey"
        FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
