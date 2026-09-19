-- Class QR codes (one per class) and lesson attendance by class. Idempotent.
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "qr_token" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Class_qr_token_key" ON "Class" ("qr_token");
ALTER TABLE "LessonAttendance" ALTER COLUMN "classroom_id" DROP NOT NULL;
ALTER TABLE "LessonAttendance" ADD COLUMN IF NOT EXISTS "class_id" TEXT;
CREATE INDEX IF NOT EXISTS "LessonAttendance_school_id_date_idx" ON "LessonAttendance" ("school_id", "date");
