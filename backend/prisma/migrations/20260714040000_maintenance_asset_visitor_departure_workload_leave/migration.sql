-- School Maintenance fixes, Asset Tracking QR/warranty, Visitor Log fields,
-- Student Departure (Gate Pass + Pickup Authorization), Teacher Workload
-- (duties + club advisor), Teacher Leave (no schema change — logic only).

ALTER TABLE "MaintenanceTicket" ALTER COLUMN "asset_id" DROP NOT NULL;
ALTER TABLE "MaintenanceTicket" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "MaintenanceTicket" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "MaintenanceTicket" ADD COLUMN IF NOT EXISTS "reported_by" TEXT;
ALTER TABLE "MaintenanceTicket" ALTER COLUMN "status" SET DEFAULT 'Pending';

ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "assigned_user_id" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "warranty_expiry" TIMESTAMP(3);
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "qr_code" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Asset_qr_code_key" ON "Asset"("qr_code");

ALTER TABLE "VisitorLog" ADD COLUMN IF NOT EXISTS "visitor_email" TEXT;
ALTER TABLE "VisitorLog" ADD COLUMN IF NOT EXISTS "host_name" TEXT;
ALTER TABLE "VisitorLog" ADD COLUMN IF NOT EXISTS "id_type" TEXT;
ALTER TABLE "VisitorLog" ADD COLUMN IF NOT EXISTS "id_number" TEXT;
ALTER TABLE "VisitorLog" ADD COLUMN IF NOT EXISTS "vehicle_info" TEXT;
ALTER TABLE "VisitorLog" ADD COLUMN IF NOT EXISTS "photo_url" TEXT;
ALTER TABLE "VisitorLog" ADD COLUMN IF NOT EXISTS "qr_code" TEXT;
ALTER TABLE "VisitorLog" ADD COLUMN IF NOT EXISTS "verification_status" TEXT NOT NULL DEFAULT 'Pending';

ALTER TABLE "ExtracurricularActivity" ADD COLUMN IF NOT EXISTS "advisor_teacher_id" TEXT;
DO $$ BEGIN
    ALTER TABLE "ExtracurricularActivity" ADD CONSTRAINT "ExtracurricularActivity_advisor_teacher_id_fkey"
        FOREIGN KEY ("advisor_teacher_id") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "AuthorizedPickupPerson" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "student_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT,
    "photo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "added_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AuthorizedPickupPerson_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AuthorizedPickupPerson_student_id_is_active_idx" ON "AuthorizedPickupPerson"("student_id", "is_active");
DO $$ BEGIN
    ALTER TABLE "AuthorizedPickupPerson" ADD CONSTRAINT "AuthorizedPickupPerson_school_id_fkey"
        FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "AuthorizedPickupPerson" ADD CONSTRAINT "AuthorizedPickupPerson_student_id_fkey"
        FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "StudentDeparture" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "student_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "pickup_person_id" TEXT,
    "pickup_person_name" TEXT,
    "is_authorized" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "requested_by" TEXT,
    "approved_by" TEXT,
    "confirmed_by" TEXT,
    "departure_time" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudentDeparture_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "StudentDeparture_school_id_status_idx" ON "StudentDeparture"("school_id", "status");
CREATE INDEX IF NOT EXISTS "StudentDeparture_student_id_idx" ON "StudentDeparture"("student_id");
DO $$ BEGIN
    ALTER TABLE "StudentDeparture" ADD CONSTRAINT "StudentDeparture_school_id_fkey"
        FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "StudentDeparture" ADD CONSTRAINT "StudentDeparture_student_id_fkey"
        FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "TeacherDuty" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "teacher_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeacherDuty_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TeacherDuty_teacher_id_idx" ON "TeacherDuty"("teacher_id");
DO $$ BEGIN
    ALTER TABLE "TeacherDuty" ADD CONSTRAINT "TeacherDuty_school_id_fkey"
        FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "TeacherDuty" ADD CONSTRAINT "TeacherDuty_teacher_id_fkey"
        FOREIGN KEY ("teacher_id") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
