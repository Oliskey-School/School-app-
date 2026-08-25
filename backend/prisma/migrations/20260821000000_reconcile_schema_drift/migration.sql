-- Reconcile the migration chain with schema.prisma.
--
-- The chain had drifted badly: schema.prisma declared 197 models but the
-- migrations only ever created 181 tables, and 562 columns existed solely in
-- the local dev database (added by `prisma db push`, never captured as a
-- migration). A fresh database built from migrations alone therefore did not
-- match the schema the application expects.
--
-- This was discovered when 20260822000000_row_level_security failed against a
-- brand-new Supabase database with "column school_id does not exist": that
-- migration writes tenant_isolation policies over school_id for 37 tables that
-- no migration had ever given the column. This migration is dated to run
-- BEFORE the RLS migrations so those policies have the columns they need.
--
-- Generated with `prisma migrate diff --from-migrations --to-schema-datamodel`
-- and then made idempotent by hand, per the convention used by the other
-- migrations here.
--
-- NOTE: the 37 "school_id TEXT NOT NULL" adds have no default, so this is safe
-- on an empty database but will fail on a table that already holds rows. It is
-- intended for building a fresh database (Supabase, CI, local).

-- AlterEnum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'COUNSELOR';

-- DropForeignKey
ALTER TABLE "GameScore" DROP CONSTRAINT IF EXISTS "GameScore_school_id_fkey";

-- DropForeignKey
ALTER TABLE "SecureAnonymousReport" DROP CONSTRAINT IF EXISTS "SecureAnonymousReport_school_id_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_school_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "Student_school_bus_id_idx";

-- AlterTable
ALTER TABLE "AcademicPerformance" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "AcademicSettings" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "AcademicTrack" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "Achievement" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "AnonymousReport" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "AppInstallation" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "AssignmentSubmission" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "Backup" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "BehaviorNote" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "Budget" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "media_url" TEXT,
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "ChatParticipant" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "last_read_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "ChatRoom" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "ClassTeacher" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "Complaint" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "ComplianceReport" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "CounselingAppointment" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "Curriculum" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "CurriculumTopic" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "DataRequest" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "EducationalGame" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "class_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "grade" INTEGER,
ADD COLUMN IF NOT EXISTS     "subject" TEXT,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "EmergencyAlert" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "EventRSVP" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "ExamBody" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "ExamRegistration" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "ExamResult" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "ExternalIntegration" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "ExtracurricularActivity" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "ExtracurricularEvent" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "Facility" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "Fee" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "ForumPost" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "ForumTopic" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "GameScore" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT,
ALTER COLUMN "school_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "GeneratedResource" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "HealthLog" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "Hostel" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "HostelAllocation" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "HostelRoom" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "HostelVisitorLog" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "IVRCall" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "IVRLesson" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "Inspection" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "InspectionEscalation" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "InspectionPhoto" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "InspectionResponse" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "Installment" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "KanbanColumn" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "KanbanTask" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "LeaveType" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "LessonNote" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "LessonPlan" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "MaintenanceTicket" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "MenstrualSupportRequest" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "MentoringMatch" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "NotificationSetting" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "PDBadge" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "PDCertificate" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "PDCourse" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "PDEnrollment" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "PTAMeeting" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "Parent" ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "ParentChild" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "ParentTeacherConference" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "ParentalConsent" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "PaymentPlan" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "PaymentTransaction" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "Payslip" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "PayslipItem" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "PermissionSlip" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "PwaInstallEvent" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT,
ALTER COLUMN "school_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "QuizQuestion" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "QuizSubmission" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "RadioBroadcast" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "RadioContent" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "RadioPartner" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "ReportCard" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "RolePermission" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "SMSLesson" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "SMSSchedule" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "SalaryArrear" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "SalaryComponent" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "SavedReport" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "SavingsPlan" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "SchoolDocument" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "SchoolGallery" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "SchoolMembership" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "SchoolPolicy" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "SecureAnonymousReport" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT,
ALTER COLUMN "school_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "StoreOrder" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "StoreOrderItem" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "StoreProduct" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS     "display_name" TEXT,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT,
ADD COLUMN IF NOT EXISTS     "verification_status" TEXT NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "StudentActivity" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "StudentDocument" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "StudentEnrollment" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "StudentFee" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "StudentIDCard" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "Subject" ADD COLUMN IF NOT EXISTS     "color" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "SubstituteAssignment" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SyncLog" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "TeacherAttendance" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "TeacherAvailability" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "TeacherBadge" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "TeacherEvaluation" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "TeacherOfficeHour" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "TeacherRecognition" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "TeacherSalary" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "ThirdPartyApp" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "Timetable" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "TransportAssignment" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "TransportBus" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "TransportRoute" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "TransportStop" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "USSDMenuStructure" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "USSDSession" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "USSDTransaction" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT,
ALTER COLUMN "school_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "UserSession" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "VerificationCode" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "VirtualClassAttendance" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "school_id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "VirtualClassSession" ADD COLUMN IF NOT EXISTS     "class_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "VisitorLog" ADD COLUMN IF NOT EXISTS     "branch_id" TEXT,
ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "VolunteerSignup" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "VolunteeringOpportunity" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "emergency_drills" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "health_incident_logs" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "safeguarding_policies" ADD COLUMN IF NOT EXISTS     "created_by" TEXT,
ADD COLUMN IF NOT EXISTS     "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "updated_by" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "parent_teacher_chat_permissions" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "parent_id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "granted_by" TEXT NOT NULL,
    "duration_type" TEXT NOT NULL,
    "duration_value" INTEGER,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parent_teacher_chat_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PtaMeetingAttendee" (
    "id" TEXT NOT NULL,
    "meeting_id" TEXT NOT NULL,
    "parent_id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PtaMeetingAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LeaveBalance" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "teacher_id" TEXT NOT NULL,
    "leave_type_id" TEXT NOT NULL,
    "total_days" INTEGER NOT NULL DEFAULT 0,
    "used_days" INTEGER NOT NULL DEFAULT 0,
    "remaining_days" INTEGER NOT NULL DEFAULT 0,
    "academic_year" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "LeaveBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Scholarship" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "scholarship_name" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "scholarship_type" TEXT NOT NULL DEFAULT 'Merit-Based',
    "eligibility_criteria" TEXT,
    "application_deadline" TIMESTAMP(3),
    "slots_available" INTEGER NOT NULL DEFAULT 1,
    "slots_filled" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_renewable" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Scholarship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ScholarshipApplication" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "scholarship_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "applied_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "review_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "ScholarshipApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ScholarshipRecipient" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "scholarship_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "award_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "ScholarshipRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Donor" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "donor_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Donor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SponsorshipRequest" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "student_id" TEXT NOT NULL,
    "amount_needed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "SponsorshipRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Sponsorship" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "sponsor_id" TEXT,
    "student_id" TEXT NOT NULL,
    "amount_committed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Sponsorship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "IdVerificationRequest" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "student_id" TEXT NOT NULL,
    "user_id" TEXT,
    "full_name" TEXT NOT NULL,
    "document_type" TEXT NOT NULL DEFAULT 'Student ID',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "IdVerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ComplianceCheck" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "check_key" TEXT NOT NULL,
    "check_name" TEXT NOT NULL,
    "description" TEXT,
    "check_frequency" TEXT NOT NULL DEFAULT 'Daily',
    "last_result" TEXT NOT NULL DEFAULT 'Pending',
    "last_run_at" TIMESTAMP(3),
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "ComplianceCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "GlobalForumTopic" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "author_id" TEXT,
    "author_name" TEXT,
    "author_role" TEXT DEFAULT 'teacher',
    "post_count" INTEGER NOT NULL DEFAULT 0,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlobalForumTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "GlobalForumPost" (
    "id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "author_id" TEXT,
    "author_name" TEXT,
    "author_role" TEXT DEFAULT 'teacher',
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlobalForumPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BranchUserIdentity" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "school_generated_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "BranchUserIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SupportTicket" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General',
    "priority" TEXT NOT NULL DEFAULT 'Low',
    "status" TEXT NOT NULL DEFAULT 'open',
    "user_id" TEXT,
    "user_email" TEXT,
    "user_name" TEXT,
    "user_role" TEXT,
    "school_id" TEXT,
    "branch_id" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TeacherWorkload" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "week_start_date" TIMESTAMP(3) NOT NULL,
    "workload_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_periods" INTEGER NOT NULL DEFAULT 0,
    "total_hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "number_of_classes" INTEGER NOT NULL DEFAULT 0,
    "avg_class_size" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "TeacherWorkload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PtaMeetingAttendee_meeting_id_parent_id_key" ON "PtaMeetingAttendee"("meeting_id", "parent_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LeaveBalance_school_id_idx" ON "LeaveBalance"("school_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LeaveBalance_teacher_id_idx" ON "LeaveBalance"("teacher_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Scholarship_school_id_idx" ON "Scholarship"("school_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ScholarshipApplication_school_id_idx" ON "ScholarshipApplication"("school_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ScholarshipApplication_scholarship_id_idx" ON "ScholarshipApplication"("scholarship_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ScholarshipApplication_student_id_idx" ON "ScholarshipApplication"("student_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ScholarshipRecipient_school_id_idx" ON "ScholarshipRecipient"("school_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ScholarshipRecipient_scholarship_id_idx" ON "ScholarshipRecipient"("scholarship_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ScholarshipRecipient_student_id_idx" ON "ScholarshipRecipient"("student_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Donor_school_id_idx" ON "Donor"("school_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SponsorshipRequest_school_id_idx" ON "SponsorshipRequest"("school_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SponsorshipRequest_student_id_idx" ON "SponsorshipRequest"("student_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Sponsorship_school_id_idx" ON "Sponsorship"("school_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Sponsorship_student_id_idx" ON "Sponsorship"("student_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Sponsorship_status_idx" ON "Sponsorship"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IdVerificationRequest_school_id_branch_id_idx" ON "IdVerificationRequest"("school_id", "branch_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "IdVerificationRequest_school_id_student_id_key" ON "IdVerificationRequest"("school_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ComplianceCheck_school_id_check_key_key" ON "ComplianceCheck"("school_id", "check_key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GlobalForumTopic_last_activity_idx" ON "GlobalForumTopic"("last_activity");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GlobalForumPost_topic_id_idx" ON "GlobalForumPost"("topic_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BranchUserIdentity_school_id_branch_id_idx" ON "BranchUserIdentity"("school_id", "branch_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BranchUserIdentity_user_id_branch_id_key" ON "BranchUserIdentity"("user_id", "branch_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BranchUserIdentity_school_id_branch_id_role_number_key" ON "BranchUserIdentity"("school_id", "branch_id", "role", "number");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicket_school_id_idx" ON "SupportTicket"("school_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicket_user_id_idx" ON "SupportTicket"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicket_status_idx" ON "SupportTicket"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicket_created_at_idx" ON "SupportTicket"("created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeacherWorkload_teacher_id_idx" ON "TeacherWorkload"("teacher_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeacherWorkload_school_id_idx" ON "TeacherWorkload"("school_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeacherWorkload_week_start_date_idx" ON "TeacherWorkload"("week_start_date");

-- AddForeignKey
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_school_id_fkey";
ALTER TABLE "User" ADD CONSTRAINT "User_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_teacher_chat_permissions" DROP CONSTRAINT IF EXISTS "parent_teacher_chat_permissions_school_id_fkey";
ALTER TABLE "parent_teacher_chat_permissions" ADD CONSTRAINT "parent_teacher_chat_permissions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_teacher_chat_permissions" DROP CONSTRAINT IF EXISTS "parent_teacher_chat_permissions_parent_id_fkey";
ALTER TABLE "parent_teacher_chat_permissions" ADD CONSTRAINT "parent_teacher_chat_permissions_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_teacher_chat_permissions" DROP CONSTRAINT IF EXISTS "parent_teacher_chat_permissions_teacher_id_fkey";
ALTER TABLE "parent_teacher_chat_permissions" ADD CONSTRAINT "parent_teacher_chat_permissions_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtaMeetingAttendee" DROP CONSTRAINT IF EXISTS "PtaMeetingAttendee_meeting_id_fkey";
ALTER TABLE "PtaMeetingAttendee" ADD CONSTRAINT "PtaMeetingAttendee_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "PTAMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtaMeetingAttendee" DROP CONSTRAINT IF EXISTS "PtaMeetingAttendee_parent_id_fkey";
ALTER TABLE "PtaMeetingAttendee" ADD CONSTRAINT "PtaMeetingAttendee_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtaMeetingAttendee" DROP CONSTRAINT IF EXISTS "PtaMeetingAttendee_school_id_fkey";
ALTER TABLE "PtaMeetingAttendee" ADD CONSTRAINT "PtaMeetingAttendee_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecureAnonymousReport" DROP CONSTRAINT IF EXISTS "SecureAnonymousReport_school_id_fkey";
ALTER TABLE "SecureAnonymousReport" ADD CONSTRAINT "SecureAnonymousReport_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameScore" DROP CONSTRAINT IF EXISTS "GameScore_school_id_fkey";
ALTER TABLE "GameScore" ADD CONSTRAINT "GameScore_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" DROP CONSTRAINT IF EXISTS "LeaveBalance_teacher_id_fkey";
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" DROP CONSTRAINT IF EXISTS "LeaveBalance_leave_type_id_fkey";
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "LeaveType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" DROP CONSTRAINT IF EXISTS "LeaveBalance_school_id_fkey";
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scholarship" DROP CONSTRAINT IF EXISTS "Scholarship_school_id_fkey";
ALTER TABLE "Scholarship" ADD CONSTRAINT "Scholarship_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScholarshipApplication" DROP CONSTRAINT IF EXISTS "ScholarshipApplication_scholarship_id_fkey";
ALTER TABLE "ScholarshipApplication" ADD CONSTRAINT "ScholarshipApplication_scholarship_id_fkey" FOREIGN KEY ("scholarship_id") REFERENCES "Scholarship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScholarshipApplication" DROP CONSTRAINT IF EXISTS "ScholarshipApplication_student_id_fkey";
ALTER TABLE "ScholarshipApplication" ADD CONSTRAINT "ScholarshipApplication_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScholarshipApplication" DROP CONSTRAINT IF EXISTS "ScholarshipApplication_school_id_fkey";
ALTER TABLE "ScholarshipApplication" ADD CONSTRAINT "ScholarshipApplication_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScholarshipRecipient" DROP CONSTRAINT IF EXISTS "ScholarshipRecipient_scholarship_id_fkey";
ALTER TABLE "ScholarshipRecipient" ADD CONSTRAINT "ScholarshipRecipient_scholarship_id_fkey" FOREIGN KEY ("scholarship_id") REFERENCES "Scholarship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScholarshipRecipient" DROP CONSTRAINT IF EXISTS "ScholarshipRecipient_student_id_fkey";
ALTER TABLE "ScholarshipRecipient" ADD CONSTRAINT "ScholarshipRecipient_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScholarshipRecipient" DROP CONSTRAINT IF EXISTS "ScholarshipRecipient_school_id_fkey";
ALTER TABLE "ScholarshipRecipient" ADD CONSTRAINT "ScholarshipRecipient_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donor" DROP CONSTRAINT IF EXISTS "Donor_school_id_fkey";
ALTER TABLE "Donor" ADD CONSTRAINT "Donor_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorshipRequest" DROP CONSTRAINT IF EXISTS "SponsorshipRequest_school_id_fkey";
ALTER TABLE "SponsorshipRequest" ADD CONSTRAINT "SponsorshipRequest_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorshipRequest" DROP CONSTRAINT IF EXISTS "SponsorshipRequest_student_id_fkey";
ALTER TABLE "SponsorshipRequest" ADD CONSTRAINT "SponsorshipRequest_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sponsorship" DROP CONSTRAINT IF EXISTS "Sponsorship_school_id_fkey";
ALTER TABLE "Sponsorship" ADD CONSTRAINT "Sponsorship_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sponsorship" DROP CONSTRAINT IF EXISTS "Sponsorship_sponsor_id_fkey";
ALTER TABLE "Sponsorship" ADD CONSTRAINT "Sponsorship_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "Donor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sponsorship" DROP CONSTRAINT IF EXISTS "Sponsorship_student_id_fkey";
ALTER TABLE "Sponsorship" ADD CONSTRAINT "Sponsorship_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

