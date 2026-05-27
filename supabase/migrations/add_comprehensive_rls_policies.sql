-- =============================================================================
-- COMPREHENSIVE RLS POLICIES FOR MULTI-SCHOOL, MULTI-BRANCH ISOLATION
-- =============================================================================
-- This migration adds Row Level Security (RLS) policies to ALL tenant-scoped tables
-- to enforce strict school and branch isolation at the database level.
--
-- Pattern:
-- 1. Tables with only school_id: Check school_id = current_school_id
-- 2. Tables with school_id + branch_id: Check both school_id AND branch_id
-- 3. All policies use get_auth_school_id() and get_auth_branch_id() functions
-- =============================================================================

-- ============================================================================
-- 1. AUTH HELPER FUNCTIONS (already exist, kept for reference)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_auth_school_id() 
RETURNS TEXT AS $$
    SELECT COALESCE(current_setting('app.current_school_id', true)::TEXT, 
                    (current_user_id->'school_id')::TEXT);
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_auth_branch_id() 
RETURNS TEXT AS $$
    SELECT COALESCE(current_setting('app.current_branch_id', true)::TEXT, 
                    (current_user_id->'branch_id')::TEXT);
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- 2. CORE USER & TENANT TABLES (High Priority)
-- ============================================================================

-- User table (by school)
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "User";
CREATE POLICY school_isolation_policy ON "User"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- Student table (by school + branch)
ALTER TABLE "Student" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_branch_isolation_policy ON "Student";
CREATE POLICY school_branch_isolation_policy ON "Student"
    FOR ALL
    USING (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()))
    WITH CHECK (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()));

-- Teacher table (by school + branch)
ALTER TABLE "Teacher" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_branch_isolation_policy ON "Teacher";
CREATE POLICY school_branch_isolation_policy ON "Teacher"
    FOR ALL
    USING (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()))
    WITH CHECK (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()));

-- Parent table (by school + branch)
ALTER TABLE "Parent" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_branch_isolation_policy ON "Parent";
CREATE POLICY school_branch_isolation_policy ON "Parent"
    FOR ALL
    USING (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()))
    WITH CHECK (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()));

-- Class table (by school + branch)
ALTER TABLE "Class" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_branch_isolation_policy ON "Class";
CREATE POLICY school_branch_isolation_policy ON "Class"
    FOR ALL
    USING (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()))
    WITH CHECK (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()));

-- ============================================================================
-- 3. ACADEMIC & LEARNING TABLES
-- ============================================================================

-- StudentEnrollment
ALTER TABLE "StudentEnrollment" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_branch_isolation_policy ON "StudentEnrollment";
CREATE POLICY school_branch_isolation_policy ON "StudentEnrollment"
    FOR ALL
    USING (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()))
    WITH CHECK (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()));

-- ClassTeacher
ALTER TABLE "ClassTeacher" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_branch_isolation_policy ON "ClassTeacher";
CREATE POLICY school_branch_isolation_policy ON "ClassTeacher"
    FOR ALL
    USING (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()))
    WITH CHECK (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()));

-- Subject
ALTER TABLE "Subject" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_branch_isolation_policy ON "Subject";
CREATE POLICY school_branch_isolation_policy ON "Subject"
    FOR ALL
    USING (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()))
    WITH CHECK (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()));

-- Timetable
ALTER TABLE "Timetable" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_branch_isolation_policy ON "Timetable";
CREATE POLICY school_branch_isolation_policy ON "Timetable"
    FOR ALL
    USING (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()))
    WITH CHECK (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()));

-- LessonNote
ALTER TABLE "LessonNote" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "LessonNote";
CREATE POLICY school_isolation_policy ON "LessonNote"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- LessonPlan
ALTER TABLE "LessonPlan" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "LessonPlan";
CREATE POLICY school_isolation_policy ON "LessonPlan"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- Assignment
ALTER TABLE "Assignment" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "Assignment";
CREATE POLICY school_isolation_policy ON "Assignment"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- AssignmentSubmission
ALTER TABLE "AssignmentSubmission" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "AssignmentSubmission";
CREATE POLICY school_isolation_policy ON "AssignmentSubmission"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- Quiz
ALTER TABLE "Quiz" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "Quiz";
CREATE POLICY school_isolation_policy ON "Quiz"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- QuizQuestion
ALTER TABLE "QuizQuestion" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "QuizQuestion";
CREATE POLICY school_isolation_policy ON "QuizQuestion"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- QuizSubmission
ALTER TABLE "QuizSubmission" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "QuizSubmission";
CREATE POLICY school_isolation_policy ON "QuizSubmission"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- ============================================================================
-- 4. ATTENDANCE & PERFORMANCE TABLES
-- ============================================================================

-- Attendance
ALTER TABLE "Attendance" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_branch_isolation_policy ON "Attendance";
CREATE POLICY school_branch_isolation_policy ON "Attendance"
    FOR ALL
    USING (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()))
    WITH CHECK (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()));

-- TeacherAttendance
ALTER TABLE "TeacherAttendance" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_branch_isolation_policy ON "TeacherAttendance";
CREATE POLICY school_branch_isolation_policy ON "TeacherAttendance"
    FOR ALL
    USING (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()))
    WITH CHECK (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()));

-- VirtualClassAttendance
ALTER TABLE "VirtualClassAttendance" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "VirtualClassAttendance";
CREATE POLICY school_isolation_policy ON "VirtualClassAttendance"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- AcademicPerformance
ALTER TABLE "AcademicPerformance" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "AcademicPerformance";
CREATE POLICY school_isolation_policy ON "AcademicPerformance"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- BehaviorNote
ALTER TABLE "BehaviorNote" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "BehaviorNote";
CREATE POLICY school_isolation_policy ON "BehaviorNote"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- ReportCard
ALTER TABLE "ReportCard" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_branch_isolation_policy ON "ReportCard";
CREATE POLICY school_branch_isolation_policy ON "ReportCard"
    FOR ALL
    USING (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()))
    WITH CHECK (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()));

-- ============================================================================
-- 5. COMMUNICATION & ANNOUNCEMENTS
-- ============================================================================

-- Announcement
ALTER TABLE "Announcement" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_branch_isolation_policy ON "Announcement";
CREATE POLICY school_branch_isolation_policy ON "Announcement"
    FOR ALL
    USING (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()))
    WITH CHECK (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()));

-- Message
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "Message";
CREATE POLICY school_isolation_policy ON "Message"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- ChatRoom
ALTER TABLE "ChatRoom" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "ChatRoom";
CREATE POLICY school_isolation_policy ON "ChatRoom"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- ChatParticipant
ALTER TABLE "ChatParticipant" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "ChatParticipant";
CREATE POLICY school_isolation_policy ON "ChatParticipant"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- ChatMessage
ALTER TABLE "ChatMessage" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "ChatMessage";
CREATE POLICY school_isolation_policy ON "ChatMessage"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- ============================================================================
-- 6. FINANCIAL & FEE TABLES
-- ============================================================================

-- Fee
ALTER TABLE "Fee" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "Fee";
CREATE POLICY school_isolation_policy ON "Fee"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- StudentFee
ALTER TABLE "StudentFee" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "StudentFee";
CREATE POLICY school_isolation_policy ON "StudentFee"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- Payment
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "Payment";
CREATE POLICY school_isolation_policy ON "Payment"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- PaymentTransaction
ALTER TABLE "PaymentTransaction" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "PaymentTransaction";
CREATE POLICY school_isolation_policy ON "PaymentTransaction"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- Invoice
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "Invoice";
CREATE POLICY school_isolation_policy ON "Invoice"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- ============================================================================
-- 7. SALARY & PAYROLL TABLES
-- ============================================================================

-- TeacherSalary
ALTER TABLE "TeacherSalary" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "TeacherSalary";
CREATE POLICY school_isolation_policy ON "TeacherSalary"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- SalaryComponent
ALTER TABLE "SalaryComponent" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "SalaryComponent";
CREATE POLICY school_isolation_policy ON "SalaryComponent"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- Payslip
ALTER TABLE "Payslip" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "Payslip";
CREATE POLICY school_isolation_policy ON "Payslip"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- PayslipItem
ALTER TABLE "PayslipItem" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "PayslipItem";
CREATE POLICY school_isolation_policy ON "PayslipItem"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- SalaryArrear
ALTER TABLE "SalaryArrear" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_branch_isolation_policy ON "SalaryArrear";
CREATE POLICY school_branch_isolation_policy ON "SalaryArrear"
    FOR ALL
    USING (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()))
    WITH CHECK (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()));

-- ============================================================================
-- 8. EXAM & RESULTS TABLES
-- ============================================================================

-- Exam
ALTER TABLE "Exam" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_branch_isolation_policy ON "Exam";
CREATE POLICY school_branch_isolation_policy ON "Exam"
    FOR ALL
    USING (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()))
    WITH CHECK (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()));

-- ExamResult
ALTER TABLE "ExamResult" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_branch_isolation_policy ON "ExamResult";
CREATE POLICY school_branch_isolation_policy ON "ExamResult"
    FOR ALL
    USING (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()))
    WITH CHECK (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()));

-- ExamBody
ALTER TABLE "ExamBody" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_branch_isolation_policy ON "ExamBody";
CREATE POLICY school_branch_isolation_policy ON "ExamBody"
    FOR ALL
    USING (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()))
    WITH CHECK (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()));

-- ExamRegistration
ALTER TABLE "ExamRegistration" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_branch_isolation_policy ON "ExamRegistration";
CREATE POLICY school_branch_isolation_policy ON "ExamRegistration"
    FOR ALL
    USING (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()))
    WITH CHECK (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()));

-- ============================================================================
-- 9. HOSTEL & TRANSPORT TABLES
-- ============================================================================

-- Hostel
ALTER TABLE "Hostel" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_branch_isolation_policy ON "Hostel";
CREATE POLICY school_branch_isolation_policy ON "Hostel"
    FOR ALL
    USING (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()))
    WITH CHECK (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()));

-- HostelRoom
ALTER TABLE "HostelRoom" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "HostelRoom";
CREATE POLICY school_isolation_policy ON "HostelRoom"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- HostelAllocation
ALTER TABLE "HostelAllocation" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "HostelAllocation";
CREATE POLICY school_isolation_policy ON "HostelAllocation"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- HostelVisitorLog
ALTER TABLE "HostelVisitorLog" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "HostelVisitorLog";
CREATE POLICY school_isolation_policy ON "HostelVisitorLog"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- TransportRoute
ALTER TABLE "TransportRoute" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_branch_isolation_policy ON "TransportRoute";
CREATE POLICY school_branch_isolation_policy ON "TransportRoute"
    FOR ALL
    USING (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()))
    WITH CHECK (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()));

-- TransportBus
ALTER TABLE "TransportBus" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "TransportBus";
CREATE POLICY school_isolation_policy ON "TransportBus"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- TransportStop
ALTER TABLE "TransportStop" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "TransportStop";
CREATE POLICY school_isolation_policy ON "TransportStop"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- TransportAssignment
ALTER TABLE "TransportAssignment" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "TransportAssignment";
CREATE POLICY school_isolation_policy ON "TransportAssignment"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- ============================================================================
-- 10. EVENTS & ACTIVITIES
-- ============================================================================

-- Event
ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "Event";
CREATE POLICY school_isolation_policy ON "Event"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- EventRSVP
ALTER TABLE "EventRSVP" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "EventRSVP";
CREATE POLICY school_isolation_policy ON "EventRSVP"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- ExtracurricularActivity
ALTER TABLE "ExtracurricularActivity" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "ExtracurricularActivity";
CREATE POLICY school_isolation_policy ON "ExtracurricularActivity"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- StudentActivity
ALTER TABLE "StudentActivity" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "StudentActivity";
CREATE POLICY school_isolation_policy ON "StudentActivity"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- ExtracurricularEvent
ALTER TABLE "ExtracurricularEvent" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "ExtracurricularEvent";
CREATE POLICY school_isolation_policy ON "ExtracurricularEvent"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- Achievement
ALTER TABLE "Achievement" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "Achievement";
CREATE POLICY school_isolation_policy ON "Achievement"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- ============================================================================
-- 11. HEALTH & WELFARE TABLES
-- ============================================================================

-- HealthLog
ALTER TABLE "HealthLog" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "HealthLog";
CREATE POLICY school_isolation_policy ON "HealthLog"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- AnonymousReport
ALTER TABLE "AnonymousReport" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "AnonymousReport";
CREATE POLICY school_isolation_policy ON "AnonymousReport"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- MenstrualSupportRequest
ALTER TABLE "MenstrualSupportRequest" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "MenstrualSupportRequest";
CREATE POLICY school_isolation_policy ON "MenstrualSupportRequest"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- ============================================================================
-- 12. PROFESSIONAL DEVELOPMENT & LEARNING
-- ============================================================================

-- PDCourse
ALTER TABLE "PDCourse" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "PDCourse";
CREATE POLICY school_isolation_policy ON "PDCourse"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- PDEnrollment
ALTER TABLE "PDEnrollment" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "PDEnrollment";
CREATE POLICY school_isolation_policy ON "PDEnrollment"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- PDBadge
ALTER TABLE "PDBadge" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "PDBadge";
CREATE POLICY school_isolation_policy ON "PDBadge"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- PDCertificate
ALTER TABLE "PDCertificate" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "PDCertificate";
CREATE POLICY school_isolation_policy ON "PDCertificate"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- TeacherBadge
ALTER TABLE "TeacherBadge" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "TeacherBadge";
CREATE POLICY school_isolation_policy ON "TeacherBadge"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- TeacherRecognition
ALTER TABLE "TeacherRecognition" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "TeacherRecognition";
CREATE POLICY school_isolation_policy ON "TeacherRecognition"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- MentoringMatch
ALTER TABLE "MentoringMatch" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "MentoringMatch";
CREATE POLICY school_isolation_policy ON "MentoringMatch"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- SubstituteAssignment
ALTER TABLE "SubstituteAssignment" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "SubstituteAssignment";
CREATE POLICY school_isolation_policy ON "SubstituteAssignment"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- ============================================================================
-- 13. OPERATIONAL TABLES
-- ============================================================================

-- Budget
ALTER TABLE "Budget" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_branch_isolation_policy ON "Budget";
CREATE POLICY school_branch_isolation_policy ON "Budget"
    FOR ALL
    USING (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()))
    WITH CHECK (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()));

-- Appointment
ALTER TABLE "Appointment" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "Appointment";
CREATE POLICY school_isolation_policy ON "Appointment"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- TeacherOfficeHour
ALTER TABLE "TeacherOfficeHour" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "TeacherOfficeHour";
CREATE POLICY school_isolation_policy ON "TeacherOfficeHour"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- Notification
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "Notification";
CREATE POLICY school_isolation_policy ON "Notification"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- ============================================================================
-- 14. GAMES & LEARNING TOOLS
-- ============================================================================

-- EducationalGame
ALTER TABLE "EducationalGame" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "EducationalGame";
CREATE POLICY school_isolation_policy ON "EducationalGame"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- GameScore
ALTER TABLE "GameScore" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "GameScore";
CREATE POLICY school_isolation_policy ON "GameScore"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- ============================================================================
-- 15. REMAINING CORE TABLES
-- ============================================================================

-- ParentChild
ALTER TABLE "ParentChild" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "ParentChild";
CREATE POLICY school_isolation_policy ON "ParentChild"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- SchoolMembership
ALTER TABLE "SchoolMembership" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "SchoolMembership";
CREATE POLICY school_isolation_policy ON "SchoolMembership"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- LeaveType
ALTER TABLE "LeaveType" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "LeaveType";
CREATE POLICY school_isolation_policy ON "LeaveType"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- LeaveRequest
ALTER TABLE "LeaveRequest" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "LeaveRequest";
CREATE POLICY school_isolation_policy ON "LeaveRequest"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- SavingsPlan
ALTER TABLE "SavingsPlan" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "SavingsPlan";
CREATE POLICY school_isolation_policy ON "SavingsPlan"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- VirtualClassSession
ALTER TABLE "VirtualClassSession" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_branch_isolation_policy ON "VirtualClassSession";
CREATE POLICY school_branch_isolation_policy ON "VirtualClassSession"
    FOR ALL
    USING (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()))
    WITH CHECK (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()));

-- Resource
ALTER TABLE "Resource" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "Resource";
CREATE POLICY school_isolation_policy ON "Resource"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- ForumTopic
ALTER TABLE "ForumTopic" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "ForumTopic";
CREATE POLICY school_isolation_policy ON "ForumTopic"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- ForumPost
ALTER TABLE "ForumPost" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "ForumPost";
CREATE POLICY school_isolation_policy ON "ForumPost"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- GeneratedResource
ALTER TABLE "GeneratedResource" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "GeneratedResource";
CREATE POLICY school_isolation_policy ON "GeneratedResource"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- PTAMeeting
ALTER TABLE "PTAMeeting" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "PTAMeeting";
CREATE POLICY school_isolation_policy ON "PTAMeeting"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- CurriculumTopic
ALTER TABLE "CurriculumTopic" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "CurriculumTopic";
CREATE POLICY school_isolation_policy ON "CurriculumTopic"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- Curriculum
ALTER TABLE "Curriculum" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "Curriculum";
CREATE POLICY school_isolation_policy ON "Curriculum"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- AcademicTrack
ALTER TABLE "AcademicTrack" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "AcademicTrack";
CREATE POLICY school_isolation_policy ON "AcademicTrack"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- SchoolGallery
ALTER TABLE "SchoolGallery" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "SchoolGallery";
CREATE POLICY school_isolation_policy ON "SchoolGallery"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- ComplianceReport
ALTER TABLE "ComplianceReport" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "ComplianceReport";
CREATE POLICY school_isolation_policy ON "ComplianceReport"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- AuditLog
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "AuditLog";
CREATE POLICY school_isolation_policy ON "AuditLog"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- VolunteeringOpportunity
ALTER TABLE "VolunteeringOpportunity" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "VolunteeringOpportunity";
CREATE POLICY school_isolation_policy ON "VolunteeringOpportunity"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- VolunteerSignup
ALTER TABLE "VolunteerSignup" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "VolunteerSignup";
CREATE POLICY school_isolation_policy ON "VolunteerSignup"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- VerificationCode
ALTER TABLE "VerificationCode" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "VerificationCode";
CREATE POLICY school_isolation_policy ON "VerificationCode"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- TeacherAvailability
ALTER TABLE "TeacherAvailability" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "TeacherAvailability";
CREATE POLICY school_isolation_policy ON "TeacherAvailability"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- Inspection
ALTER TABLE "Inspection" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "Inspection";
CREATE POLICY school_isolation_policy ON "Inspection"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- InspectionResponse
ALTER TABLE "InspectionResponse" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "InspectionResponse";
CREATE POLICY school_isolation_policy ON "InspectionResponse"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- InspectionPhoto
ALTER TABLE "InspectionPhoto" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "InspectionPhoto";
CREATE POLICY school_isolation_policy ON "InspectionPhoto"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- InspectionEscalation
ALTER TABLE "InspectionEscalation" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "InspectionEscalation";
CREATE POLICY school_isolation_policy ON "InspectionEscalation"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Total tables with RLS enabled: 80+ mission-critical tables
-- All tables follow the pattern:
--   - school_id isolation as base requirement
--   - branch_id added where applicable for branch-level isolation
--   - Both SELECT and INSERT/UPDATE/DELETE operations scoped
-- All policies use centralized auth functions for consistency and maintainability
-- ============================================================================
