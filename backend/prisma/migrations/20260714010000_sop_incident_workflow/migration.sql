-- School SOP (Standard Operating Procedures): configurable incident-type
-- workflows, cases, permanent stage history, evidence, decisions, letters.

CREATE TABLE IF NOT EXISTS "SOPIncidentType" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'standard',
    "is_critical_alert" BOOLEAN NOT NULL DEFAULT false,
    "alert_audience" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "SOPIncidentType_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SOPIncidentType_school_id_is_active_idx" ON "SOPIncidentType"("school_id", "is_active");
DO $$ BEGIN
    ALTER TABLE "SOPIncidentType" ADD CONSTRAINT "SOPIncidentType_school_id_fkey"
        FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "SOPIncidentType" ADD CONSTRAINT "SOPIncidentType_branch_id_fkey"
        FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "SOPWorkflowStage" (
    "id" TEXT NOT NULL,
    "incident_type_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "notify_roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notify_user_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requires_evidence" BOOLEAN NOT NULL DEFAULT false,
    "requires_decision" BOOLEAN NOT NULL DEFAULT false,
    "is_terminal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SOPWorkflowStage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SOPWorkflowStage_incident_type_id_order_key" ON "SOPWorkflowStage"("incident_type_id", "order");
CREATE INDEX IF NOT EXISTS "SOPWorkflowStage_incident_type_id_idx" ON "SOPWorkflowStage"("incident_type_id");
DO $$ BEGIN
    ALTER TABLE "SOPWorkflowStage" ADD CONSTRAINT "SOPWorkflowStage_incident_type_id_fkey"
        FOREIGN KEY ("incident_type_id") REFERENCES "SOPIncidentType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "SOPCase" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "incident_type_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "involved_student_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "involved_teacher_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reported_by" TEXT NOT NULL,
    "reported_by_role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "current_stage_order" INTEGER NOT NULL DEFAULT 1,
    "critical_alert_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "SOPCase_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SOPCase_school_id_status_idx" ON "SOPCase"("school_id", "status");
CREATE INDEX IF NOT EXISTS "SOPCase_incident_type_id_idx" ON "SOPCase"("incident_type_id");
DO $$ BEGIN
    ALTER TABLE "SOPCase" ADD CONSTRAINT "SOPCase_school_id_fkey"
        FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "SOPCase" ADD CONSTRAINT "SOPCase_branch_id_fkey"
        FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "SOPCase" ADD CONSTRAINT "SOPCase_incident_type_id_fkey"
        FOREIGN KEY ("incident_type_id") REFERENCES "SOPIncidentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "SOPCaseStageLog" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "stage_order" INTEGER NOT NULL,
    "stage_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "notified_user_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "completed_by" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SOPCaseStageLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SOPCaseStageLog_case_id_idx" ON "SOPCaseStageLog"("case_id");
DO $$ BEGIN
    ALTER TABLE "SOPCaseStageLog" ADD CONSTRAINT "SOPCaseStageLog_case_id_fkey"
        FOREIGN KEY ("case_id") REFERENCES "SOPCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "SOPEvidence" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "file_type" TEXT,
    "description" TEXT,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SOPEvidence_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SOPEvidence_case_id_idx" ON "SOPEvidence"("case_id");
DO $$ BEGIN
    ALTER TABLE "SOPEvidence" ADD CONSTRAINT "SOPEvidence_case_id_fkey"
        FOREIGN KEY ("case_id") REFERENCES "SOPCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "SOPDecision" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "decision_text" TEXT NOT NULL,
    "outcome" TEXT NOT NULL DEFAULT 'no_action',
    "decided_by" TEXT NOT NULL,
    "decided_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linked_record_type" TEXT,
    "linked_record_id" TEXT,

    CONSTRAINT "SOPDecision_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SOPDecision_case_id_idx" ON "SOPDecision"("case_id");
DO $$ BEGIN
    ALTER TABLE "SOPDecision" ADD CONSTRAINT "SOPDecision_case_id_fkey"
        FOREIGN KEY ("case_id") REFERENCES "SOPCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "SOPLetter" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "draft_text" TEXT NOT NULL,
    "final_text" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "recipient_type" TEXT,
    "recipient_id" TEXT,
    "generated_by" TEXT NOT NULL,
    "sent_by" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SOPLetter_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SOPLetter_case_id_idx" ON "SOPLetter"("case_id");
DO $$ BEGIN
    ALTER TABLE "SOPLetter" ADD CONSTRAINT "SOPLetter_case_id_fkey"
        FOREIGN KEY ("case_id") REFERENCES "SOPCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
