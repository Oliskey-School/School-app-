-- Student module fixes: withdrawal workflow, unique constraints, soft-delete support.
-- All statements use IF NOT EXISTS so this is safe to run against a DB that already
-- received these changes via `prisma db push` during development.

-- F-2: Withdrawal workflow fields
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "withdrawal_reason" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "withdrawal_date" TIMESTAMP(3);

-- MED-7: Soft-delete support (deleted_at already in schema; guard in case not yet present)
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);

-- T3: Unique admission number per school (HIGH-2)
CREATE UNIQUE INDEX IF NOT EXISTS "Student_school_id_admission_number_key"
    ON "Student"("school_id", "admission_number");

-- T5: Unique school_generated_id per school (MED-6)
CREATE UNIQUE INDEX IF NOT EXISTS "Student_school_id_school_generated_id_key"
    ON "Student"("school_id", "school_generated_id");
