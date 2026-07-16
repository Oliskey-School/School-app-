-- Student Early Warning System, School Timeline, Classroom Observation Module.

CREATE TABLE IF NOT EXISTS "StudentRiskFlag" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "student_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "level" TEXT NOT NULL,
    "reasons" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudentRiskFlag_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "StudentRiskFlag_student_id_key" ON "StudentRiskFlag"("student_id");
CREATE INDEX IF NOT EXISTS "StudentRiskFlag_school_id_status_idx" ON "StudentRiskFlag"("school_id", "status");
DO $$ BEGIN
    ALTER TABLE "StudentRiskFlag" ADD CONSTRAINT "StudentRiskFlag_school_id_fkey"
        FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "StudentRiskFlag" ADD CONSTRAINT "StudentRiskFlag_student_id_fkey"
        FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "LifeEvent" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "subject_type" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "event_date" TIMESTAMP(3) NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LifeEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LifeEvent_school_id_subject_type_subject_id_idx" ON "LifeEvent"("school_id", "subject_type", "subject_id");
DO $$ BEGIN
    ALTER TABLE "LifeEvent" ADD CONSTRAINT "LifeEvent_school_id_fkey"
        FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ObservationTemplate" (
    "id" TEXT NOT NULL,
    "school_id" TEXT,
    "name" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ObservationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClassroomObservation" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "template_id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "class_id" TEXT,
    "observer_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Submitted',
    "overall_score" DOUBLE PRECISION,
    "overall_grade" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "ClassroomObservation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ClassroomObservation_teacher_id_date_idx" ON "ClassroomObservation"("teacher_id", "date");
CREATE INDEX IF NOT EXISTS "ClassroomObservation_school_id_date_idx" ON "ClassroomObservation"("school_id", "date");
DO $$ BEGIN
    ALTER TABLE "ClassroomObservation" ADD CONSTRAINT "ClassroomObservation_school_id_fkey"
        FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "ClassroomObservation" ADD CONSTRAINT "ClassroomObservation_template_id_fkey"
        FOREIGN KEY ("template_id") REFERENCES "ObservationTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ObservationResponse" (
    "id" TEXT NOT NULL,
    "observation_id" TEXT NOT NULL,
    "criterion_key" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "comment" TEXT,
    CONSTRAINT "ObservationResponse_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ObservationResponse_observation_id_idx" ON "ObservationResponse"("observation_id");
DO $$ BEGIN
    ALTER TABLE "ObservationResponse" ADD CONSTRAINT "ObservationResponse_observation_id_fkey"
        FOREIGN KEY ("observation_id") REFERENCES "ClassroomObservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
