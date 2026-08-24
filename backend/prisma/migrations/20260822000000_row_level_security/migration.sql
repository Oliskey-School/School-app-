-- Row-Level Security: real tenant isolation enforced by PostgreSQL.
--
-- Until now isolation rested entirely on ~1,900 Prisma call sites each
-- remembering its own school_id filter. CLAUDE.md and ISOLATION_GUIDE.md both
-- claimed RLS enforced it; the database had 0 policies. A single forgotten
-- filter leaked another school's data (several such misses were found and fixed
-- in earlier rounds). This makes the database itself refuse those rows.
--
-- backend/src/config/database.ts already sets app.current_school_id with
-- set_config(..., true) inside Prisma's array-batch transaction, so the value is
-- transaction-local and pinned to the same pooled connection as the query.
--
-- The bypass flag covers operations that legitimately have no tenant yet:
-- login (user looked up by email), school onboarding, platform/SUPER_ADMIN
-- reads and seeds. It is set explicitly, per transaction, in database.ts.
--
-- Idempotent: safe to re-run.

ALTER TABLE "AcademicPerformance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AcademicPerformance" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "AcademicPerformance";
CREATE POLICY tenant_isolation ON "AcademicPerformance" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "AcademicSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AcademicSettings" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "AcademicSettings";
CREATE POLICY tenant_isolation ON "AcademicSettings" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "AcademicTrack" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AcademicTrack" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "AcademicTrack";
CREATE POLICY tenant_isolation ON "AcademicTrack" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Achievement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Achievement" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Achievement";
CREATE POLICY tenant_isolation ON "Achievement" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Announcement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Announcement" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Announcement";
CREATE POLICY tenant_isolation ON "Announcement" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "AnonymousReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AnonymousReport" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "AnonymousReport";
CREATE POLICY tenant_isolation ON "AnonymousReport" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "AppInstallation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AppInstallation" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "AppInstallation";
CREATE POLICY tenant_isolation ON "AppInstallation" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Appointment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Appointment" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Appointment";
CREATE POLICY tenant_isolation ON "Appointment" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Asset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Asset" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Asset";
CREATE POLICY tenant_isolation ON "Asset" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Assignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Assignment" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Assignment";
CREATE POLICY tenant_isolation ON "Assignment" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "AssignmentSubmission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AssignmentSubmission" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "AssignmentSubmission";
CREATE POLICY tenant_isolation ON "AssignmentSubmission" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attendance" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Attendance";
CREATE POLICY tenant_isolation ON "Attendance" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "AuditLog";
CREATE POLICY tenant_isolation ON "AuditLog" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "AuthorizedPickupPerson" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuthorizedPickupPerson" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "AuthorizedPickupPerson";
CREATE POLICY tenant_isolation ON "AuthorizedPickupPerson" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Backup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Backup" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Backup";
CREATE POLICY tenant_isolation ON "Backup" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "BehaviorNote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BehaviorNote" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "BehaviorNote";
CREATE POLICY tenant_isolation ON "BehaviorNote" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Branch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Branch" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Branch";
CREATE POLICY tenant_isolation ON "Branch" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "BranchUserIdentity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BranchUserIdentity" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "BranchUserIdentity";
CREATE POLICY tenant_isolation ON "BranchUserIdentity" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Budget" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Budget" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Budget";
CREATE POLICY tenant_isolation ON "Budget" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "ChatMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatMessage" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ChatMessage";
CREATE POLICY tenant_isolation ON "ChatMessage" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "ChatParticipant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatParticipant" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ChatParticipant";
CREATE POLICY tenant_isolation ON "ChatParticipant" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "ChatRoom" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatRoom" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ChatRoom";
CREATE POLICY tenant_isolation ON "ChatRoom" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Class" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Class" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Class";
CREATE POLICY tenant_isolation ON "Class" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "ClassTeacher" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClassTeacher" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ClassTeacher";
CREATE POLICY tenant_isolation ON "ClassTeacher" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Classroom" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Classroom" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Classroom";
CREATE POLICY tenant_isolation ON "Classroom" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "ClassroomObservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClassroomObservation" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ClassroomObservation";
CREATE POLICY tenant_isolation ON "ClassroomObservation" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "ClubAttendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClubAttendance" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ClubAttendance";
CREATE POLICY tenant_isolation ON "ClubAttendance" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Complaint" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Complaint" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Complaint";
CREATE POLICY tenant_isolation ON "Complaint" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "ComplianceCheck" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ComplianceCheck" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ComplianceCheck";
CREATE POLICY tenant_isolation ON "ComplianceCheck" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "ComplianceReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ComplianceReport" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ComplianceReport";
CREATE POLICY tenant_isolation ON "ComplianceReport" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "CounselingAppointment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CounselingAppointment" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "CounselingAppointment";
CREATE POLICY tenant_isolation ON "CounselingAppointment" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Curriculum" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Curriculum" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Curriculum";
CREATE POLICY tenant_isolation ON "Curriculum" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "CurriculumTopic" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CurriculumTopic" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "CurriculumTopic";
CREATE POLICY tenant_isolation ON "CurriculumTopic" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "DataRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DataRequest" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "DataRequest";
CREATE POLICY tenant_isolation ON "DataRequest" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Department" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Department" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Department";
CREATE POLICY tenant_isolation ON "Department" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "DepartmentMeeting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DepartmentMeeting" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "DepartmentMeeting";
CREATE POLICY tenant_isolation ON "DepartmentMeeting" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Donor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Donor" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Donor";
CREATE POLICY tenant_isolation ON "Donor" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "EducationalGame" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EducationalGame" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "EducationalGame";
CREATE POLICY tenant_isolation ON "EducationalGame" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "EmergencyAlert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmergencyAlert" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "EmergencyAlert";
CREATE POLICY tenant_isolation ON "EmergencyAlert" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Event" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Event";
CREATE POLICY tenant_isolation ON "Event" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "EventRSVP" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventRSVP" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "EventRSVP";
CREATE POLICY tenant_isolation ON "EventRSVP" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Exam" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Exam" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Exam";
CREATE POLICY tenant_isolation ON "Exam" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "ExamBody" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExamBody" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ExamBody";
CREATE POLICY tenant_isolation ON "ExamBody" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "ExamRegistration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExamRegistration" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ExamRegistration";
CREATE POLICY tenant_isolation ON "ExamRegistration" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "ExamResult" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExamResult" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ExamResult";
CREATE POLICY tenant_isolation ON "ExamResult" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "ExternalIntegration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExternalIntegration" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ExternalIntegration";
CREATE POLICY tenant_isolation ON "ExternalIntegration" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "ExtracurricularActivity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExtracurricularActivity" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ExtracurricularActivity";
CREATE POLICY tenant_isolation ON "ExtracurricularActivity" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "ExtracurricularEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExtracurricularEvent" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ExtracurricularEvent";
CREATE POLICY tenant_isolation ON "ExtracurricularEvent" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Facility" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Facility" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Facility";
CREATE POLICY tenant_isolation ON "Facility" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Fee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Fee" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Fee";
CREATE POLICY tenant_isolation ON "Fee" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "ForumPost" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ForumPost" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ForumPost";
CREATE POLICY tenant_isolation ON "ForumPost" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "ForumTopic" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ForumTopic" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ForumTopic";
CREATE POLICY tenant_isolation ON "ForumTopic" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "GameQuestionHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GameQuestionHistory" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "GameQuestionHistory";
CREATE POLICY tenant_isolation ON "GameQuestionHistory" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "GameScore" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GameScore" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "GameScore";
CREATE POLICY tenant_isolation ON "GameScore" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "GeneratedResource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GeneratedResource" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "GeneratedResource";
CREATE POLICY tenant_isolation ON "GeneratedResource" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "HealthLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HealthLog" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "HealthLog";
CREATE POLICY tenant_isolation ON "HealthLog" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Hostel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Hostel" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Hostel";
CREATE POLICY tenant_isolation ON "Hostel" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "HostelAllocation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HostelAllocation" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "HostelAllocation";
CREATE POLICY tenant_isolation ON "HostelAllocation" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "HostelRoom" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HostelRoom" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "HostelRoom";
CREATE POLICY tenant_isolation ON "HostelRoom" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "HostelVisitorLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HostelVisitorLog" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "HostelVisitorLog";
CREATE POLICY tenant_isolation ON "HostelVisitorLog" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "IVRCall" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IVRCall" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "IVRCall";
CREATE POLICY tenant_isolation ON "IVRCall" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "IVRLesson" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IVRLesson" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "IVRLesson";
CREATE POLICY tenant_isolation ON "IVRLesson" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "IdVerificationRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IdVerificationRequest" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "IdVerificationRequest";
CREATE POLICY tenant_isolation ON "IdVerificationRequest" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Inspection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Inspection" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Inspection";
CREATE POLICY tenant_isolation ON "Inspection" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "InspectionEscalation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InspectionEscalation" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "InspectionEscalation";
CREATE POLICY tenant_isolation ON "InspectionEscalation" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "InspectionPhoto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InspectionPhoto" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "InspectionPhoto";
CREATE POLICY tenant_isolation ON "InspectionPhoto" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "InspectionResponse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InspectionResponse" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "InspectionResponse";
CREATE POLICY tenant_isolation ON "InspectionResponse" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Installment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Installment" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Installment";
CREATE POLICY tenant_isolation ON "Installment" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Invoice";
CREATE POLICY tenant_isolation ON "Invoice" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "KanbanColumn" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KanbanColumn" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "KanbanColumn";
CREATE POLICY tenant_isolation ON "KanbanColumn" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "KanbanTask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KanbanTask" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "KanbanTask";
CREATE POLICY tenant_isolation ON "KanbanTask" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "LeaveBalance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LeaveBalance" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "LeaveBalance";
CREATE POLICY tenant_isolation ON "LeaveBalance" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "LeaveRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LeaveRequest" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "LeaveRequest";
CREATE POLICY tenant_isolation ON "LeaveRequest" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "LeaveType" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LeaveType" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "LeaveType";
CREATE POLICY tenant_isolation ON "LeaveType" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "LessonAttendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LessonAttendance" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "LessonAttendance";
CREATE POLICY tenant_isolation ON "LessonAttendance" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "LessonNote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LessonNote" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "LessonNote";
CREATE POLICY tenant_isolation ON "LessonNote" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "LessonPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LessonPlan" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "LessonPlan";
CREATE POLICY tenant_isolation ON "LessonPlan" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "LifeEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LifeEvent" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "LifeEvent";
CREATE POLICY tenant_isolation ON "LifeEvent" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "MaintenanceTicket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MaintenanceTicket" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "MaintenanceTicket";
CREATE POLICY tenant_isolation ON "MaintenanceTicket" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "MenstrualSupportRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MenstrualSupportRequest" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "MenstrualSupportRequest";
CREATE POLICY tenant_isolation ON "MenstrualSupportRequest" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "MentoringMatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MentoringMatch" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "MentoringMatch";
CREATE POLICY tenant_isolation ON "MentoringMatch" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Message";
CREATE POLICY tenant_isolation ON "Message" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Notification";
CREATE POLICY tenant_isolation ON "Notification" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "NotificationSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationSetting" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "NotificationSetting";
CREATE POLICY tenant_isolation ON "NotificationSetting" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "ObservationTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ObservationTemplate" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ObservationTemplate";
CREATE POLICY tenant_isolation ON "ObservationTemplate" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "PDBadge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PDBadge" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "PDBadge";
CREATE POLICY tenant_isolation ON "PDBadge" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "PDCertificate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PDCertificate" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "PDCertificate";
CREATE POLICY tenant_isolation ON "PDCertificate" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "PDCourse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PDCourse" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "PDCourse";
CREATE POLICY tenant_isolation ON "PDCourse" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "PDEnrollment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PDEnrollment" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "PDEnrollment";
CREATE POLICY tenant_isolation ON "PDEnrollment" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "PTAMeeting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PTAMeeting" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "PTAMeeting";
CREATE POLICY tenant_isolation ON "PTAMeeting" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Parent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Parent" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Parent";
CREATE POLICY tenant_isolation ON "Parent" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "ParentChild" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ParentChild" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ParentChild";
CREATE POLICY tenant_isolation ON "ParentChild" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "ParentTeacherConference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ParentTeacherConference" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ParentTeacherConference";
CREATE POLICY tenant_isolation ON "ParentTeacherConference" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "ParentalConsent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ParentalConsent" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ParentalConsent";
CREATE POLICY tenant_isolation ON "ParentalConsent" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Payment";
CREATE POLICY tenant_isolation ON "Payment" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "PaymentPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentPlan" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "PaymentPlan";
CREATE POLICY tenant_isolation ON "PaymentPlan" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "PaymentTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentTransaction" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "PaymentTransaction";
CREATE POLICY tenant_isolation ON "PaymentTransaction" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Payslip" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payslip" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Payslip";
CREATE POLICY tenant_isolation ON "Payslip" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "PayslipItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PayslipItem" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "PayslipItem";
CREATE POLICY tenant_isolation ON "PayslipItem" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "PermissionSlip" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PermissionSlip" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "PermissionSlip";
CREATE POLICY tenant_isolation ON "PermissionSlip" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "PtaMeetingAttendee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PtaMeetingAttendee" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "PtaMeetingAttendee";
CREATE POLICY tenant_isolation ON "PtaMeetingAttendee" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "PwaInstallEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PwaInstallEvent" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "PwaInstallEvent";
CREATE POLICY tenant_isolation ON "PwaInstallEvent" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "QueryLetter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QueryLetter" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "QueryLetter";
CREATE POLICY tenant_isolation ON "QueryLetter" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Quiz" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Quiz" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Quiz";
CREATE POLICY tenant_isolation ON "Quiz" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "QuizQuestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuizQuestion" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "QuizQuestion";
CREATE POLICY tenant_isolation ON "QuizQuestion" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "QuizSubmission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuizSubmission" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "QuizSubmission";
CREATE POLICY tenant_isolation ON "QuizSubmission" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "RadioBroadcast" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RadioBroadcast" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "RadioBroadcast";
CREATE POLICY tenant_isolation ON "RadioBroadcast" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "RadioContent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RadioContent" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "RadioContent";
CREATE POLICY tenant_isolation ON "RadioContent" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "RadioPartner" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RadioPartner" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "RadioPartner";
CREATE POLICY tenant_isolation ON "RadioPartner" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "ReportCard" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReportCard" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ReportCard";
CREATE POLICY tenant_isolation ON "ReportCard" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Resource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Resource" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Resource";
CREATE POLICY tenant_isolation ON "Resource" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "RolePermission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RolePermission" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "RolePermission";
CREATE POLICY tenant_isolation ON "RolePermission" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "SMSLesson" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SMSLesson" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "SMSLesson";
CREATE POLICY tenant_isolation ON "SMSLesson" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "SMSSchedule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SMSSchedule" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "SMSSchedule";
CREATE POLICY tenant_isolation ON "SMSSchedule" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "SOPCase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SOPCase" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "SOPCase";
CREATE POLICY tenant_isolation ON "SOPCase" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "SOPIncidentType" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SOPIncidentType" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "SOPIncidentType";
CREATE POLICY tenant_isolation ON "SOPIncidentType" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "SalaryArrear" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SalaryArrear" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "SalaryArrear";
CREATE POLICY tenant_isolation ON "SalaryArrear" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "SalaryComponent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SalaryComponent" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "SalaryComponent";
CREATE POLICY tenant_isolation ON "SalaryComponent" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "SavedReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SavedReport" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "SavedReport";
CREATE POLICY tenant_isolation ON "SavedReport" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "SavingsPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SavingsPlan" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "SavingsPlan";
CREATE POLICY tenant_isolation ON "SavingsPlan" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Scholarship" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Scholarship" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Scholarship";
CREATE POLICY tenant_isolation ON "Scholarship" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "ScholarshipApplication" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ScholarshipApplication" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ScholarshipApplication";
CREATE POLICY tenant_isolation ON "ScholarshipApplication" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "ScholarshipRecipient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ScholarshipRecipient" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ScholarshipRecipient";
CREATE POLICY tenant_isolation ON "ScholarshipRecipient" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "SchoolDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SchoolDocument" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "SchoolDocument";
CREATE POLICY tenant_isolation ON "SchoolDocument" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "SchoolGallery" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SchoolGallery" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "SchoolGallery";
CREATE POLICY tenant_isolation ON "SchoolGallery" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "SchoolMembership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SchoolMembership" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "SchoolMembership";
CREATE POLICY tenant_isolation ON "SchoolMembership" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "SchoolPolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SchoolPolicy" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "SchoolPolicy";
CREATE POLICY tenant_isolation ON "SchoolPolicy" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "SecureAnonymousReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SecureAnonymousReport" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "SecureAnonymousReport";
CREATE POLICY tenant_isolation ON "SecureAnonymousReport" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Sponsorship" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Sponsorship" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Sponsorship";
CREATE POLICY tenant_isolation ON "Sponsorship" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "SponsorshipRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SponsorshipRequest" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "SponsorshipRequest";
CREATE POLICY tenant_isolation ON "SponsorshipRequest" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "StoreOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StoreOrder" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "StoreOrder";
CREATE POLICY tenant_isolation ON "StoreOrder" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "StoreOrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StoreOrderItem" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "StoreOrderItem";
CREATE POLICY tenant_isolation ON "StoreOrderItem" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "StoreProduct" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StoreProduct" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "StoreProduct";
CREATE POLICY tenant_isolation ON "StoreProduct" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Student" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Student" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Student";
CREATE POLICY tenant_isolation ON "Student" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "StudentActivity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentActivity" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "StudentActivity";
CREATE POLICY tenant_isolation ON "StudentActivity" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "StudentDeparture" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentDeparture" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "StudentDeparture";
CREATE POLICY tenant_isolation ON "StudentDeparture" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "StudentDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentDocument" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "StudentDocument";
CREATE POLICY tenant_isolation ON "StudentDocument" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "StudentEnrollment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentEnrollment" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "StudentEnrollment";
CREATE POLICY tenant_isolation ON "StudentEnrollment" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "StudentFee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentFee" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "StudentFee";
CREATE POLICY tenant_isolation ON "StudentFee" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "StudentIDCard" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentIDCard" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "StudentIDCard";
CREATE POLICY tenant_isolation ON "StudentIDCard" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "StudentResourceProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentResourceProgress" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "StudentResourceProgress";
CREATE POLICY tenant_isolation ON "StudentResourceProgress" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "StudentRiskFlag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentRiskFlag" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "StudentRiskFlag";
CREATE POLICY tenant_isolation ON "StudentRiskFlag" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "StudentSuspension" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentSuspension" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "StudentSuspension";
CREATE POLICY tenant_isolation ON "StudentSuspension" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "StudyPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudyPlan" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "StudyPlan";
CREATE POLICY tenant_isolation ON "StudyPlan" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Subject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subject" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Subject";
CREATE POLICY tenant_isolation ON "Subject" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "SubstituteAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SubstituteAssignment" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "SubstituteAssignment";
CREATE POLICY tenant_isolation ON "SubstituteAssignment" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "SupportTicket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupportTicket" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "SupportTicket";
CREATE POLICY tenant_isolation ON "SupportTicket" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "SyncLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SyncLog" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "SyncLog";
CREATE POLICY tenant_isolation ON "SyncLog" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Teacher" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Teacher" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Teacher";
CREATE POLICY tenant_isolation ON "Teacher" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "TeacherAttendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeacherAttendance" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "TeacherAttendance";
CREATE POLICY tenant_isolation ON "TeacherAttendance" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "TeacherAvailability" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeacherAvailability" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "TeacherAvailability";
CREATE POLICY tenant_isolation ON "TeacherAvailability" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "TeacherBadge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeacherBadge" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "TeacherBadge";
CREATE POLICY tenant_isolation ON "TeacherBadge" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "TeacherDuty" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeacherDuty" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "TeacherDuty";
CREATE POLICY tenant_isolation ON "TeacherDuty" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "TeacherEvaluation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeacherEvaluation" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "TeacherEvaluation";
CREATE POLICY tenant_isolation ON "TeacherEvaluation" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "TeacherOfficeHour" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeacherOfficeHour" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "TeacherOfficeHour";
CREATE POLICY tenant_isolation ON "TeacherOfficeHour" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "TeacherRecognition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeacherRecognition" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "TeacherRecognition";
CREATE POLICY tenant_isolation ON "TeacherRecognition" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "TeacherRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeacherRecord" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "TeacherRecord";
CREATE POLICY tenant_isolation ON "TeacherRecord" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "TeacherSalary" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeacherSalary" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "TeacherSalary";
CREATE POLICY tenant_isolation ON "TeacherSalary" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "TeacherWorkload" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeacherWorkload" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "TeacherWorkload";
CREATE POLICY tenant_isolation ON "TeacherWorkload" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "ThirdPartyApp" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ThirdPartyApp" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ThirdPartyApp";
CREATE POLICY tenant_isolation ON "ThirdPartyApp" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Timetable" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Timetable" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Timetable";
CREATE POLICY tenant_isolation ON "Timetable" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "TransportAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TransportAssignment" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "TransportAssignment";
CREATE POLICY tenant_isolation ON "TransportAssignment" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "TransportBus" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TransportBus" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "TransportBus";
CREATE POLICY tenant_isolation ON "TransportBus" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "TransportRoute" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TransportRoute" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "TransportRoute";
CREATE POLICY tenant_isolation ON "TransportRoute" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "TransportStop" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TransportStop" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "TransportStop";
CREATE POLICY tenant_isolation ON "TransportStop" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "USSDMenuStructure" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "USSDMenuStructure" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "USSDMenuStructure";
CREATE POLICY tenant_isolation ON "USSDMenuStructure" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "USSDSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "USSDSession" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "USSDSession";
CREATE POLICY tenant_isolation ON "USSDSession" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "USSDTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "USSDTransaction" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "USSDTransaction";
CREATE POLICY tenant_isolation ON "USSDTransaction" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "User";
CREATE POLICY tenant_isolation ON "User" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "UserSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserSession" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "UserSession";
CREATE POLICY tenant_isolation ON "UserSession" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "Vendor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vendor" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Vendor";
CREATE POLICY tenant_isolation ON "Vendor" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "VerificationCode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VerificationCode" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "VerificationCode";
CREATE POLICY tenant_isolation ON "VerificationCode" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "VirtualClassAttendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VirtualClassAttendance" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "VirtualClassAttendance";
CREATE POLICY tenant_isolation ON "VirtualClassAttendance" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "VirtualClassSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VirtualClassSession" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "VirtualClassSession";
CREATE POLICY tenant_isolation ON "VirtualClassSession" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "VisitorLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VisitorLog" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "VisitorLog";
CREATE POLICY tenant_isolation ON "VisitorLog" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "VolunteerSignup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VolunteerSignup" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "VolunteerSignup";
CREATE POLICY tenant_isolation ON "VolunteerSignup" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "VolunteeringOpportunity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VolunteeringOpportunity" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "VolunteeringOpportunity";
CREATE POLICY tenant_isolation ON "VolunteeringOpportunity" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "emergency_drills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "emergency_drills" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "emergency_drills";
CREATE POLICY tenant_isolation ON "emergency_drills" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "health_incident_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "health_incident_logs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "health_incident_logs";
CREATE POLICY tenant_isolation ON "health_incident_logs" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "parent_teacher_chat_permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "parent_teacher_chat_permissions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "parent_teacher_chat_permissions";
CREATE POLICY tenant_isolation ON "parent_teacher_chat_permissions" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE "safeguarding_policies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "safeguarding_policies" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "safeguarding_policies";
CREATE POLICY tenant_isolation ON "safeguarding_policies" USING (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (school_id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');

-- School is the tenant root: scoped on its own id.
ALTER TABLE "School" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "School" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "School";
CREATE POLICY tenant_isolation ON "School" USING (id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (id = current_setting('app.current_school_id', true) OR coalesce(current_setting('app.bypass_rls', true), '') = 'on');
