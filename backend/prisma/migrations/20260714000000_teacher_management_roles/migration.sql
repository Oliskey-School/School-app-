-- Teacher Management System: class-teacher vs subject-teacher roles on
-- ClassTeacher, plus session/term/effective-date/periods and an active/ended
-- lifecycle so rows become the permanent teaching-history record instead of
-- being deleted on reassignment.

ALTER TABLE "ClassTeacher" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'subject_teacher';
ALTER TABLE "ClassTeacher" ADD COLUMN IF NOT EXISTS "session" TEXT;
ALTER TABLE "ClassTeacher" ADD COLUMN IF NOT EXISTS "term" INTEGER;
ALTER TABLE "ClassTeacher" ADD COLUMN IF NOT EXISTS "effective_date" TIMESTAMP(3);
ALTER TABLE "ClassTeacher" ADD COLUMN IF NOT EXISTS "periods_per_week" INTEGER;
ALTER TABLE "ClassTeacher" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "ClassTeacher" ADD COLUMN IF NOT EXISTS "ended_at" TIMESTAMP(3);
ALTER TABLE "ClassTeacher" ADD COLUMN IF NOT EXISTS "ended_by" TEXT;

-- Existing rows are pre-existing subject-teacher assignments (role default
-- already covers this); rows created via the old "is_primary" convenience
-- flag (never actually set true anywhere in the app, but guard anyway) are
-- promoted to class_teacher for correctness.
UPDATE "ClassTeacher" SET "role" = 'class_teacher' WHERE "is_primary" = true AND "role" = 'subject_teacher';

CREATE INDEX IF NOT EXISTS "ClassTeacher_teacher_id_status_idx" ON "ClassTeacher"("teacher_id", "status");
CREATE INDEX IF NOT EXISTS "ClassTeacher_class_id_role_status_idx" ON "ClassTeacher"("class_id", "role", "status");
