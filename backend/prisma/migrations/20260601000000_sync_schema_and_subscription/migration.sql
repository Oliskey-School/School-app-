-- DropIndex
DROP INDEX "Branch_code_key";

-- DropIndex
DROP INDEX "ClassTeacher_class_id_teacher_id_key";

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "branch_id" TEXT;

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "attachment_url" TEXT;

-- AlterTable
ALTER TABLE "AssignmentSubmission" DROP COLUMN "content",
DROP COLUMN "files",
ADD COLUMN     "file_url" TEXT,
ADD COLUMN     "text_submission" TEXT;

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "action_description" TEXT,
ADD COLUMN     "action_type" TEXT,
ADD COLUMN     "is_sensitive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "new_values" JSONB,
ADD COLUMN     "old_values" JSONB,
ADD COLUMN     "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "risk_level" TEXT NOT NULL DEFAULT 'Low',
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Success';

-- AlterTable
ALTER TABLE "BehaviorNote" ADD COLUMN     "parent_visible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'neutral';

-- AlterTable
ALTER TABLE "Branch" ADD COLUMN     "is_demo_virtual" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_active_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Budget" DROP COLUMN "amount",
DROP COLUMN "spent",
DROP COLUMN "year",
ADD COLUMN     "allocated_amount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "fiscal_year" TEXT NOT NULL,
ADD COLUMN     "spent_amount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ClassTeacher" ADD COLUMN     "branch_id" TEXT,
ADD COLUMN     "school_id" TEXT NOT NULL,
ADD COLUMN     "subject_id" TEXT;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "branch_id" TEXT;

-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "date" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ForumPost" ADD COLUMN     "author_avatar_url" TEXT;

-- AlterTable
ALTER TABLE "ForumTopic" ADD COLUMN     "author_avatar_url" TEXT;

-- AlterTable
ALTER TABLE "HealthLog" DROP COLUMN "medication",
ADD COLUMN     "logged_by" TEXT,
ADD COLUMN     "medication_administered" JSONB,
ADD COLUMN     "parent_notified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Parent" ADD COLUMN     "created_by" TEXT;

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "is_cbt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'draft',
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'QUIZ';

-- AlterTable
ALTER TABLE "ReportCard" ADD COLUMN     "academic_records" JSONB,
ADD COLUMN     "branch_id" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Draft',
ADD COLUMN     "teacher_remark" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "SalaryArrear" DROP COLUMN "amount",
DROP COLUMN "month",
DROP COLUMN "year",
ADD COLUMN     "amount_owed" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "due_date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'Pending';

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "academic_session" TEXT,
ADD COLUMN     "current_term" INTEGER,
ADD COLUMN     "curricula_config" TEXT[] DEFAULT ARRAY['NIGERIAN']::TEXT[],
ADD COLUMN     "infrastructure_config" JSONB,
ADD COLUMN     "lga" TEXT,
ADD COLUMN     "paystack_auth_code" TEXT,
ADD COLUMN     "paystack_customer_code" TEXT,
ADD COLUMN     "plan_id" INTEGER,
ADD COLUMN     "platform_version" TEXT DEFAULT '0.5.27',
ADD COLUMN     "student_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "term_amount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "term_closing_date" TIMESTAMP(3),
ADD COLUMN     "term_resumption_date" TIMESTAMP(3),
ADD COLUMN     "trial_used" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "subscription_status" SET DEFAULT 'free';

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "address" TEXT,
ADD COLUMN     "admission_number" TEXT,
ADD COLUMN     "created_by" TEXT,
ADD COLUMN     "curriculum_type" TEXT;

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "allowed_branch_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "british_qualification" TEXT,
ADD COLUMN     "curriculum_type" TEXT DEFAULT 'Nigerian',
ADD COLUMN     "degree_certificate" TEXT,
ADD COLUMN     "notification_preferences" JSONB DEFAULT '{"newSubmission": true, "parentMessage": true, "weeklySummary": false}',
ADD COLUMN     "subject_specialty" TEXT[],
ADD COLUMN     "trcn_certificate" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "allowed_branch_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "two_factor_secret" TEXT;

-- AlterTable
ALTER TABLE "VolunteeringOpportunity" ADD COLUMN     "role" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Open',
ADD COLUMN     "time" TEXT;

-- CreateTable
CREATE TABLE "EventRSVP" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "parent_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRSVP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavingsPlan" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "parent_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "target_amount" DOUBLE PRECISION NOT NULL,
    "current_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "target_date" TIMESTAMP(3) NOT NULL,
    "frequency" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavingsPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "price_monthly" DOUBLE PRECISION NOT NULL,
    "price_yearly" DOUBLE PRECISION NOT NULL,
    "features" JSONB,
    "limits" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformNotification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "target_schools" TEXT[],
    "created_by" TEXT,
    "sent_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionTemplate" (
    "id" TEXT NOT NULL,
    "inspection_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "schema" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InspectionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "inspector_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "overall_score" DOUBLE PRECISION,
    "overall_grade" TEXT,
    "start_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_time" TIMESTAMP(3),
    "signature_inspector" TEXT,
    "signature_school" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionResponse" (
    "id" TEXT NOT NULL,
    "inspection_id" TEXT NOT NULL,
    "field_id" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "score" DOUBLE PRECISION,
    "is_violation" BOOLEAN NOT NULL DEFAULT false,
    "comment" TEXT,

    CONSTRAINT "InspectionResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionPhoto" (
    "id" TEXT NOT NULL,
    "inspection_id" TEXT NOT NULL,
    "field_id" TEXT,
    "url" TEXT,
    "annotation" JSONB,
    "caption" TEXT,

    CONSTRAINT "InspectionPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionEscalation" (
    "id" TEXT NOT NULL,
    "inspection_id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "InspectionEscalation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolPolicy" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionSlip" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "due_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermissionSlip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "type" TEXT,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'available',
    "capacity" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "category" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'good',
    "condition" TEXT,
    "current_value" DOUBLE PRECISION,
    "serial_number" TEXT,
    "purchase_date" TIMESTAMP(3),
    "next_service_date" TIMESTAMP(3),
    "facility_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceTicket" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "asset_id" TEXT NOT NULL,
    "ticket_number" TEXT,
    "issue_title" TEXT NOT NULL,
    "issue_description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "status" TEXT NOT NULL DEFAULT 'Open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolDocument" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "url" TEXT NOT NULL,
    "expiry_date" TEXT,
    "verification_status" TEXT NOT NULL DEFAULT 'Pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitorLog" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "visitor_name" TEXT NOT NULL,
    "purpose" TEXT,
    "contact_phone" TEXT,
    "check_in" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "check_out" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyAlert" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "alert_type" TEXT NOT NULL DEFAULT 'general',
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "target_audiences" TEXT[],
    "sent_by" TEXT,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmergencyAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "device_type" TEXT,
    "location" TEXT,
    "last_active" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedReport" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "data_source" TEXT NOT NULL,
    "fields" TEXT[],
    "filters" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataRequest" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "requester_name" TEXT NOT NULL,
    "student_name" TEXT NOT NULL,
    "request_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "data_categories" TEXT[],
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "DataRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "student_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'generated',
    "due_date" TIMESTAMP(3) NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Backup" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "url" TEXT,
    "type" TEXT,
    "filename" TEXT,
    "file_path" TEXT,
    "size" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'Completed',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Backup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentalConsent" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "parent_name" TEXT NOT NULL,
    "consent_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "granted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentalConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationSetting" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "digest_time" TEXT NOT NULL DEFAULT '19:00',
    "categories" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KanbanColumn" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "KanbanColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KanbanTask" (
    "id" TEXT NOT NULL,
    "column_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "due_date" TIMESTAMP(3),
    "assignees" TEXT[],
    "labels" TEXT[],
    "comments" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KanbanTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_incident_logs" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "student_id" TEXT,
    "incident_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "incident_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "action_taken" TEXT,
    "location" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'low',
    "reported_by" TEXT,
    "witnesses" TEXT[],
    "parent_notified" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'resolved',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_incident_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_drills" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "drill_type" TEXT NOT NULL,
    "drill_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "start_time" TEXT,
    "end_time" TEXT,
    "duration" INTEGER,
    "participants" TEXT,
    "outcome" TEXT,
    "notes" TEXT,
    "conducted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_drills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safeguarding_policies" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "url" TEXT,
    "effective_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "review_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "safeguarding_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "vendor_name" TEXT NOT NULL,
    "vendor_code" TEXT,
    "vendor_type" TEXT,
    "contact_person" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalIntegration" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "integration_name" TEXT NOT NULL,
    "integration_type" TEXT,
    "base_url" TEXT,
    "sync_frequency" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "connection_status" TEXT NOT NULL DEFAULT 'disconnected',
    "last_sync_at" TIMESTAMP(3),
    "school_registration_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThirdPartyApp" (
    "id" TEXT NOT NULL,
    "app_name" TEXT NOT NULL,
    "app_slug" TEXT NOT NULL,
    "developer_name" TEXT,
    "category" TEXT,
    "description" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "total_installs" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThirdPartyApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppInstallation" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "installed_by" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "installed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uninstalled_at" TIMESTAMP(3),

    CONSTRAINT "AppInstallation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "sync_type" TEXT,
    "sync_direction" TEXT,
    "triggered_by" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "records_processed" INTEGER NOT NULL DEFAULT 0,
    "records_succeeded" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherAvailability" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time_start" TEXT NOT NULL,
    "time_end" TEXT NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "location" TEXT,
    "conference_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentTeacherConference" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "parent_id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "scheduled_time" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 30,
    "conference_type" TEXT NOT NULL DEFAULT 'In-Person',
    "meeting_link" TEXT,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Scheduled',
    "parent_notes" TEXT,
    "teacher_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentTeacherConference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CounselingAppointment" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "counselor_id" TEXT,
    "requested_date" TIMESTAMP(3) NOT NULL,
    "confirmed_date" TIMESTAMP(3),
    "appointment_type" TEXT NOT NULL DEFAULT 'Initial Consultation',
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CounselingAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "parent_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 0,
    "comment" TEXT NOT NULL,
    "image_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Submitted',
    "timeline" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherEvaluation" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 0,
    "feedback" TEXT NOT NULL,
    "performance_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppVersion" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadioContent" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "content_title" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT,
    "grade" TEXT,
    "audio_file_url" TEXT,
    "duration_minutes" INTEGER,
    "language" TEXT NOT NULL DEFAULT 'English',
    "content_type" TEXT NOT NULL DEFAULT 'Educational',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RadioContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadioPartner" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "station_name" TEXT NOT NULL,
    "location" TEXT,
    "frequency" TEXT,
    "coverage_area" TEXT,
    "contact_person" TEXT,
    "contact_phone" TEXT,
    "partnership_status" TEXT NOT NULL DEFAULT 'Active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RadioPartner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadioBroadcast" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "broadcast_date" TIMESTAMP(3) NOT NULL,
    "broadcast_time" TEXT NOT NULL,
    "frequency" TEXT,
    "estimated_listeners" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Scheduled',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RadioBroadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IVRLesson" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "lesson_title" TEXT NOT NULL,
    "subject" TEXT,
    "grade" TEXT,
    "audio_file_url" TEXT,
    "script" TEXT,
    "duration_seconds" INTEGER,
    "language" TEXT NOT NULL DEFAULT 'English',
    "lesson_type" TEXT NOT NULL DEFAULT 'Educational',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IVRLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IVRCall" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "call_status" TEXT NOT NULL DEFAULT 'Initiated',
    "call_duration_seconds" INTEGER NOT NULL DEFAULT 0,
    "initiated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "IVRCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SMSLesson" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "lesson_title" TEXT NOT NULL,
    "subject" TEXT,
    "grade" TEXT,
    "content" TEXT NOT NULL,
    "lesson_type" TEXT NOT NULL DEFAULT 'Educational',
    "language" TEXT NOT NULL DEFAULT 'English',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SMSLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SMSSchedule" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "scheduled_time" TEXT NOT NULL,
    "target_audience" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Scheduled',
    "recipients_count" INTEGER NOT NULL DEFAULT 0,
    "delivered_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "cost_naira" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SMSSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "USSDMenuStructure" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "menu_code" TEXT NOT NULL,
    "menu_level" INTEGER NOT NULL DEFAULT 0,
    "parent_menu_id" TEXT,
    "menu_text" TEXT NOT NULL,
    "menu_option" TEXT NOT NULL,
    "action_type" TEXT,
    "response_template" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "USSDMenuStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "USSDSession" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "current_menu_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_interaction" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "USSDSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "USSDTransaction" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "USSDTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentIDCard" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "card_number" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "is_printed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentIDCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentPlan" (
    "id" SERIAL NOT NULL,
    "fee_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "installment_count" INTEGER NOT NULL,
    "frequency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Installment" (
    "id" SERIAL NOT NULL,
    "payment_plan_id" INTEGER NOT NULL,
    "installment_number" INTEGER NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION,
    "paid_amount" DOUBLE PRECISION DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "transaction_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Installment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreProduct" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreOrder" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_email" TEXT,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "order_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreOrderItem" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "StoreOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicCalendar" (
    "id" SERIAL NOT NULL,
    "session" TEXT NOT NULL,
    "term" INTEGER NOT NULL,
    "resumption_date" TIMESTAMP(3) NOT NULL,
    "closing_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventRSVP_event_id_parent_id_key" ON "EventRSVP"("event_id", "parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionTemplate_inspection_type_key" ON "InspectionTemplate"("inspection_type");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolDocument_school_id_type_key" ON "SchoolDocument"("school_id", "type");

-- CreateIndex
CREATE INDEX "EmergencyAlert_school_id_sent_at_idx" ON "EmergencyAlert"("school_id", "sent_at");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_token_id_key" ON "UserSession"("token_id");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoice_number_key" ON "Invoice"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSetting_user_id_key" ON "NotificationSetting"("user_id");

-- CreateIndex
CREATE INDEX "health_incident_logs_school_id_incident_date_idx" ON "health_incident_logs"("school_id", "incident_date");

-- CreateIndex
CREATE INDEX "emergency_drills_school_id_drill_date_idx" ON "emergency_drills"("school_id", "drill_date");

-- CreateIndex
CREATE INDEX "safeguarding_policies_school_id_idx" ON "safeguarding_policies"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "ThirdPartyApp_app_slug_key" ON "ThirdPartyApp"("app_slug");

-- CreateIndex
CREATE INDEX "Complaint_school_id_parent_id_idx" ON "Complaint"("school_id", "parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "AppVersion_version_key" ON "AppVersion"("version");

-- CreateIndex
CREATE UNIQUE INDEX "USSDSession_session_id_key" ON "USSDSession"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_school_id_role_permission_id_key" ON "RolePermission"("school_id", "role", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "StudentIDCard_card_number_key" ON "StudentIDCard"("card_number");

-- CreateIndex
CREATE INDEX "StudentIDCard_school_id_idx" ON "StudentIDCard"("school_id");

-- CreateIndex
CREATE INDEX "StudentIDCard_student_id_idx" ON "StudentIDCard"("student_id");

-- CreateIndex
CREATE INDEX "PaymentPlan_student_id_idx" ON "PaymentPlan"("student_id");

-- CreateIndex
CREATE INDEX "PaymentPlan_fee_id_idx" ON "PaymentPlan"("fee_id");

-- CreateIndex
CREATE INDEX "Installment_payment_plan_id_idx" ON "Installment"("payment_plan_id");

-- CreateIndex
CREATE INDEX "Installment_due_date_idx" ON "Installment"("due_date");

-- CreateIndex
CREATE INDEX "StoreProduct_school_id_idx" ON "StoreProduct"("school_id");

-- CreateIndex
CREATE INDEX "StoreProduct_category_idx" ON "StoreProduct"("category");

-- CreateIndex
CREATE INDEX "StoreOrder_school_id_idx" ON "StoreOrder"("school_id");

-- CreateIndex
CREATE INDEX "StoreOrder_status_idx" ON "StoreOrder"("status");

-- CreateIndex
CREATE INDEX "StoreOrderItem_order_id_idx" ON "StoreOrderItem"("order_id");

-- CreateIndex
CREATE INDEX "AcademicCalendar_resumption_date_idx" ON "AcademicCalendar"("resumption_date");

-- CreateIndex
CREATE INDEX "AcademicCalendar_closing_date_idx" ON "AcademicCalendar"("closing_date");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicCalendar_session_term_key" ON "AcademicCalendar"("session", "term");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentSubmission_student_id_assignment_id_key" ON "AssignmentSubmission"("student_id", "assignment_id");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_school_id_code_key" ON "Branch"("school_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ClassTeacher_class_id_teacher_id_subject_id_key" ON "ClassTeacher"("class_id", "teacher_id", "subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_school_generated_id_key" ON "User"("school_generated_id");

-- AddForeignKey
ALTER TABLE "School" ADD CONSTRAINT "School_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parent" ADD CONSTRAINT "Parent_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTeacher" ADD CONSTRAINT "ClassTeacher_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTeacher" ADD CONSTRAINT "ClassTeacher_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTeacher" ADD CONSTRAINT "ClassTeacher_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRSVP" ADD CONSTRAINT "EventRSVP_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRSVP" ADD CONSTRAINT "EventRSVP_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsPlan" ADD CONSTRAINT "SavingsPlan_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsPlan" ADD CONSTRAINT "SavingsPlan_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsPlan" ADD CONSTRAINT "SavingsPlan_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamResult" ADD CONSTRAINT "ExamResult_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timetable" ADD CONSTRAINT "Timetable_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timetable" ADD CONSTRAINT "Timetable_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnonymousReport" ADD CONSTRAINT "AnonymousReport_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformNotification" ADD CONSTRAINT "PlatformNotification_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "InspectionTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionResponse" ADD CONSTRAINT "InspectionResponse_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionPhoto" ADD CONSTRAINT "InspectionPhoto_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionEscalation" ADD CONSTRAINT "InspectionEscalation_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolPolicy" ADD CONSTRAINT "SchoolPolicy_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionSlip" ADD CONSTRAINT "PermissionSlip_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTicket" ADD CONSTRAINT "MaintenanceTicket_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTicket" ADD CONSTRAINT "MaintenanceTicket_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolDocument" ADD CONSTRAINT "SchoolDocument_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitorLog" ADD CONSTRAINT "VisitorLog_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyAlert" ADD CONSTRAINT "EmergencyAlert_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedReport" ADD CONSTRAINT "SavedReport_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataRequest" ADD CONSTRAINT "DataRequest_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Backup" ADD CONSTRAINT "Backup_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentalConsent" ADD CONSTRAINT "ParentalConsent_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentalConsent" ADD CONSTRAINT "ParentalConsent_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSetting" ADD CONSTRAINT "NotificationSetting_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanbanColumn" ADD CONSTRAINT "KanbanColumn_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanbanTask" ADD CONSTRAINT "KanbanTask_column_id_fkey" FOREIGN KEY ("column_id") REFERENCES "KanbanColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_incident_logs" ADD CONSTRAINT "health_incident_logs_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_incident_logs" ADD CONSTRAINT "health_incident_logs_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_drills" ADD CONSTRAINT "emergency_drills_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safeguarding_policies" ADD CONSTRAINT "safeguarding_policies_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalIntegration" ADD CONSTRAINT "ExternalIntegration_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppInstallation" ADD CONSTRAINT "AppInstallation_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAvailability" ADD CONSTRAINT "TeacherAvailability_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAvailability" ADD CONSTRAINT "TeacherAvailability_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentTeacherConference" ADD CONSTRAINT "ParentTeacherConference_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentTeacherConference" ADD CONSTRAINT "ParentTeacherConference_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentTeacherConference" ADD CONSTRAINT "ParentTeacherConference_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentTeacherConference" ADD CONSTRAINT "ParentTeacherConference_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounselingAppointment" ADD CONSTRAINT "CounselingAppointment_counselor_id_fkey" FOREIGN KEY ("counselor_id") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounselingAppointment" ADD CONSTRAINT "CounselingAppointment_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounselingAppointment" ADD CONSTRAINT "CounselingAppointment_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherEvaluation" ADD CONSTRAINT "TeacherEvaluation_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherEvaluation" ADD CONSTRAINT "TeacherEvaluation_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadioBroadcast" ADD CONSTRAINT "RadioBroadcast_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "RadioContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadioBroadcast" ADD CONSTRAINT "RadioBroadcast_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "RadioPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IVRCall" ADD CONSTRAINT "IVRCall_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "IVRLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SMSSchedule" ADD CONSTRAINT "SMSSchedule_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "SMSLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "USSDMenuStructure" ADD CONSTRAINT "USSDMenuStructure_parent_menu_id_fkey" FOREIGN KEY ("parent_menu_id") REFERENCES "USSDMenuStructure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "USSDSession" ADD CONSTRAINT "USSDSession_current_menu_id_fkey" FOREIGN KEY ("current_menu_id") REFERENCES "USSDMenuStructure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentIDCard" ADD CONSTRAINT "StudentIDCard_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentIDCard" ADD CONSTRAINT "StudentIDCard_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPlan" ADD CONSTRAINT "PaymentPlan_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Installment" ADD CONSTRAINT "Installment_payment_plan_id_fkey" FOREIGN KEY ("payment_plan_id") REFERENCES "PaymentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreProduct" ADD CONSTRAINT "StoreProduct_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreOrder" ADD CONSTRAINT "StoreOrder_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreOrderItem" ADD CONSTRAINT "StoreOrderItem_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "StoreOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

