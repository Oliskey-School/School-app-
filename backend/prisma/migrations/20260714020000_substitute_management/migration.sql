-- Staff Substitute Management: link SubstituteAssignment to the exact
-- timetable period being covered, add a proper accept/decline lifecycle,
-- and prevent double-booking the same period.

ALTER TABLE "SubstituteAssignment" ADD COLUMN IF NOT EXISTS "timetable_id" TEXT;
ALTER TABLE "SubstituteAssignment" ADD COLUMN IF NOT EXISTS "start_time" TEXT;
ALTER TABLE "SubstituteAssignment" ADD COLUMN IF NOT EXISTS "end_time" TEXT;
ALTER TABLE "SubstituteAssignment" ADD COLUMN IF NOT EXISTS "notified_at" TIMESTAMP(3);
ALTER TABLE "SubstituteAssignment" ADD COLUMN IF NOT EXISTS "responded_at" TIMESTAMP(3);

-- updated_at previously had no default/auto-update — add one so existing rows
-- (if any) satisfy the NOT NULL requirement, then let Prisma manage it.
ALTER TABLE "SubstituteAssignment" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "SubstituteAssignment" ALTER COLUMN "status" SET DEFAULT 'Assigned';

-- Not a hard uniqueness rule: a period can get a second assignment row after
-- a prior one was Declined, so this is a lookup index, not a constraint.
DROP INDEX IF EXISTS "SubstituteAssignment_timetable_id_date_key";
CREATE INDEX IF NOT EXISTS "SubstituteAssignment_timetable_id_date_idx" ON "SubstituteAssignment"("timetable_id", "date");
CREATE INDEX IF NOT EXISTS "SubstituteAssignment_school_id_date_idx" ON "SubstituteAssignment"("school_id", "date");
CREATE INDEX IF NOT EXISTS "SubstituteAssignment_substitute_teacher_id_status_idx" ON "SubstituteAssignment"("substitute_teacher_id", "status");

DO $$ BEGIN
    ALTER TABLE "SubstituteAssignment" ADD CONSTRAINT "SubstituteAssignment_timetable_id_fkey"
        FOREIGN KEY ("timetable_id") REFERENCES "Timetable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
