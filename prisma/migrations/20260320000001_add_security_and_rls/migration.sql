-- Migration: Add Security Functions and RLS Policies
-- Phase 1: Multi-tenancy isolation for local PostgreSQL (Prisma)

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 1: Helper Functions for Multi-Tenancy (TEXT types for compatibility)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_school_id_from_token()
RETURNS TEXT AS $$
DECLARE
    _school_id TEXT;
    _claims JSONB;
BEGIN
    _claims := COALESCE(
        NULLIF(current_setting('app.jwt_claims', true), '')::JSONB,
        '{}'::JSONB
    );
    _school_id := COALESCE(
        _claims -> 'app_metadata' ->> 'school_id',
        NULLIF(current_setting('app.current_school_id', true), ''),
        NULL
    );
    RETURN _school_id;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_branch_id_from_token()
RETURNS TEXT AS $$
DECLARE
    _branch_id TEXT;
    _claims JSONB;
BEGIN
    _claims := COALESCE(
        NULLIF(current_setting('app.jwt_claims', true), '')::JSONB,
        '{}'::JSONB
    );
    _branch_id := COALESCE(
        _claims -> 'app_metadata' ->> 'branch_id',
        _claims -> 'app_metadata' ->> 'active_branch_id',
        NULLIF(current_setting('app.current_branch_id', true), ''),
        NULL
    );
    RETURN _branch_id;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS TEXT AS $$
DECLARE
    _user_id TEXT;
    _claims JSONB;
BEGIN
    _claims := COALESCE(
        NULLIF(current_setting('app.jwt_claims', true), '')::JSONB,
        '{}'::JSONB
    );
    _user_id := COALESCE(
        _claims ->> 'sub',
        NULLIF(current_setting('app.current_user_id', true), ''),
        NULL
    );
    RETURN _user_id;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION is_user_admin(p_school_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM "User" 
        WHERE id = get_current_user_id()
          AND school_id = p_school_id
          AND role IN ('ADMIN', 'PROPRIETOR', 'SUPER_ADMIN')
    );
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM "User" 
        WHERE id = get_current_user_id()
          AND role = 'SUPER_ADMIN'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION is_main_school_admin(p_school_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN is_super_admin() OR EXISTS (
        SELECT 1 FROM "User" 
        WHERE id = get_current_user_id()
          AND school_id = p_school_id
          AND role IN ('ADMIN', 'PROPRIETOR')
          AND branch_id IS NULL
    );
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION is_demo_mode()
RETURNS BOOLEAN AS $$
DECLARE
    _claims JSONB;
BEGIN
    _claims := COALESCE(
        NULLIF(current_setting('app.jwt_claims', true), '')::JSONB,
        '{}'::JSONB
    );
    RETURN COALESCE(
        (_claims -> 'app_metadata' ->> 'is_demo')::BOOLEAN,
        FALSE
    );
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_demo_school_id()
RETURNS TEXT AS $$
BEGIN
    RETURN 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION generate_school_id(
    p_school_id TEXT,
    p_branch_id TEXT,
    p_role TEXT
)
RETURNS TEXT AS $$
DECLARE
    v_school_code TEXT;
    v_branch_code TEXT;
    v_role_code TEXT;
    v_seq_num INTEGER;
    v_new_id TEXT;
    v_school_name TEXT;
    v_branch_name TEXT;
BEGIN
    SELECT COALESCE(slug, name), name INTO v_school_code, v_school_name 
    FROM "School" WHERE id = p_school_id;
    
    IF v_school_code IS NULL THEN 
        v_school_code := COALESCE(
            UPPER(SUBSTRING(REGEXP_REPLACE(COALESCE(v_school_name, ''), '[^a-zA-Z]', '', 'g'), 1, 4)),
            'SCHL'
        );
    END IF;

    IF p_branch_id IS NOT NULL THEN
        SELECT code, name INTO v_branch_code, v_branch_name FROM "Branch" WHERE id = p_branch_id;
    END IF;
    
    IF v_branch_code IS NULL THEN 
        v_branch_code := COALESCE(
            UPPER(SUBSTRING(REGEXP_REPLACE(COALESCE(v_branch_name, ''), '[^a-zA-Z]', '', 'g'), 1, 4)),
            'MAIN'
        );
    END IF;

    CASE 
        WHEN p_role ILIKE '%student%' THEN v_role_code := 'STU';
        WHEN p_role ILIKE '%teacher%' THEN v_role_code := 'TCH';
        WHEN p_role ILIKE '%parent%' THEN v_role_code := 'PAR';
        WHEN p_role ILIKE '%admin%' AND p_role NOT ILIKE '%superadmin%' THEN v_role_code := 'ADM';
        WHEN p_role ILIKE '%superadmin%' THEN v_role_code := 'SADM';
        WHEN p_role ILIKE '%proprietor%' THEN v_role_code := 'PRO';
        ELSE v_role_code := UPPER(SUBSTRING(REGEXP_REPLACE(p_role, '[^a-zA-Z]', '', 'g'), 1, 4));
    END CASE;

    IF p_branch_id IS NOT NULL THEN
        SELECT COUNT(*) + 1 INTO v_seq_num 
        FROM "User" 
        WHERE school_id = p_school_id 
          AND role ILIKE p_role
          AND branch_id = p_branch_id;
    ELSE
        SELECT COUNT(*) + 1 INTO v_seq_num 
        FROM "User" 
        WHERE school_id = p_school_id 
          AND role ILIKE p_role;
    END IF;

    v_new_id := UPPER(FORMAT('%s_%s_%s_%s', 
        v_school_code, v_branch_code, v_role_code, LPAD(v_seq_num::TEXT, 4, '0')
    ));

    RETURN v_new_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 2: Enable RLS on Tables
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE "School" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Branch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Student" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Teacher" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Parent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Class" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentEnrollment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClassTeacher" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Assignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AssignmentSubmission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Announcement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Fee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentFee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AcademicPerformance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReportCard" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BehaviorNote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeacherAttendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SchoolMembership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeacherOfficeHour" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Appointment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ParentChild" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VolunteeringOpportunity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VolunteerSignup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VerificationCode" ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 3: RLS Policies
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "school_select" ON "School";
CREATE POLICY "school_select" ON "School" FOR SELECT USING (true);

DROP POLICY IF EXISTS "school_admin_all" ON "School";
CREATE POLICY "school_admin_all" ON "School" FOR ALL USING (is_super_admin() OR is_user_admin(id));

DROP POLICY IF EXISTS "branch_isolation" ON "Branch";
CREATE POLICY "branch_isolation" ON "Branch" FOR ALL USING (
    is_super_admin() OR school_id = get_school_id_from_token()
    OR (is_demo_mode() AND school_id = get_demo_school_id())
);

DROP POLICY IF EXISTS "user_isolation" ON "User";
CREATE POLICY "user_isolation" ON "User" FOR ALL USING (
    is_super_admin() OR id = get_current_user_id()
    OR (school_id = get_school_id_from_token() AND is_user_admin(school_id))
    OR (is_demo_mode() AND school_id = get_demo_school_id())
);

DROP POLICY IF EXISTS "student_isolation" ON "Student";
CREATE POLICY "student_isolation" ON "Student" FOR ALL USING (
    is_super_admin() OR school_id = get_school_id_from_token()
    OR (is_demo_mode() AND school_id = get_demo_school_id())
);

DROP POLICY IF EXISTS "teacher_isolation" ON "Teacher";
CREATE POLICY "teacher_isolation" ON "Teacher" FOR ALL USING (
    is_super_admin() OR school_id = get_school_id_from_token()
    OR (is_demo_mode() AND school_id = get_demo_school_id())
);

DROP POLICY IF EXISTS "parent_isolation" ON "Parent";
CREATE POLICY "parent_isolation" ON "Parent" FOR ALL USING (
    is_super_admin() OR school_id = get_school_id_from_token()
    OR (is_demo_mode() AND school_id = get_demo_school_id())
);

DROP POLICY IF EXISTS "class_isolation" ON "Class";
CREATE POLICY "class_isolation" ON "Class" FOR ALL USING (
    is_super_admin() OR school_id = get_school_id_from_token()
    OR (is_demo_mode() AND school_id = get_demo_school_id())
);

DROP POLICY IF EXISTS "enrollment_isolation" ON "StudentEnrollment";
CREATE POLICY "enrollment_isolation" ON "StudentEnrollment" FOR ALL USING (
    is_super_admin() OR school_id = get_school_id_from_token()
    OR (is_demo_mode() AND school_id = get_demo_school_id())
);

DROP POLICY IF EXISTS "classteacher_isolation" ON "ClassTeacher";
CREATE POLICY "classteacher_isolation" ON "ClassTeacher" FOR ALL USING (
    is_super_admin() OR EXISTS (
        SELECT 1 FROM "Class" c WHERE c.id = "ClassTeacher"."class_id"
        AND (c.school_id = get_school_id_from_token() OR (is_demo_mode() AND c.school_id = get_demo_school_id()))
    )
);

DROP POLICY IF EXISTS "attendance_isolation" ON "Attendance";
CREATE POLICY "attendance_isolation" ON "Attendance" FOR ALL USING (
    is_super_admin() OR EXISTS (
        SELECT 1 FROM "Class" c WHERE c.id = "Attendance"."class_id"
        AND (c.school_id = get_school_id_from_token() OR (is_demo_mode() AND c.school_id = get_demo_school_id()))
    )
);

DROP POLICY IF EXISTS "assignment_isolation" ON "Assignment";
CREATE POLICY "assignment_isolation" ON "Assignment" FOR ALL USING (
    is_super_admin() OR EXISTS (
        SELECT 1 FROM "Class" c WHERE c.id = "Assignment"."class_id"
        AND (c.school_id = get_school_id_from_token() OR (is_demo_mode() AND c.school_id = get_demo_school_id()))
    )
);

DROP POLICY IF EXISTS "submission_isolation" ON "AssignmentSubmission";
CREATE POLICY "submission_isolation" ON "AssignmentSubmission" FOR ALL USING (
    is_super_admin() OR EXISTS (
        SELECT 1 FROM "Assignment" a
        JOIN "Class" c ON c.id = a."class_id"
        WHERE a.id = "AssignmentSubmission"."assignment_id"
        AND (c.school_id = get_school_id_from_token() OR (is_demo_mode() AND c.school_id = get_demo_school_id()))
    )
);

DROP POLICY IF EXISTS "announcement_isolation" ON "Announcement";
CREATE POLICY "announcement_isolation" ON "Announcement" FOR ALL USING (
    is_super_admin() OR school_id = get_school_id_from_token()
    OR (is_demo_mode() AND school_id = get_demo_school_id())
);

DROP POLICY IF EXISTS "event_isolation" ON "Event";
CREATE POLICY "event_isolation" ON "Event" FOR ALL USING (
    is_super_admin() OR school_id = get_school_id_from_token()
    OR (is_demo_mode() AND school_id = get_demo_school_id())
);

DROP POLICY IF EXISTS "fee_isolation" ON "Fee";
CREATE POLICY "fee_isolation" ON "Fee" FOR ALL USING (
    is_super_admin() OR school_id = get_school_id_from_token()
    OR (is_demo_mode() AND school_id = get_demo_school_id())
);

DROP POLICY IF EXISTS "studentfee_isolation" ON "StudentFee";
CREATE POLICY "studentfee_isolation" ON "StudentFee" FOR ALL USING (
    is_super_admin() OR school_id = get_school_id_from_token()
    OR (is_demo_mode() AND school_id = get_demo_school_id())
);

DROP POLICY IF EXISTS "payment_isolation" ON "Payment";
CREATE POLICY "payment_isolation" ON "Payment" FOR ALL USING (
    is_super_admin() OR school_id = get_school_id_from_token()
    OR (is_demo_mode() AND school_id = get_demo_school_id())
);

DROP POLICY IF EXISTS "notification_isolation" ON "Notification";
CREATE POLICY "notification_isolation" ON "Notification" FOR ALL USING (
    is_super_admin() OR school_id = get_school_id_from_token()
    OR (is_demo_mode() AND school_id = get_demo_school_id())
);

DROP POLICY IF EXISTS "academic_isolation" ON "AcademicPerformance";
CREATE POLICY "academic_isolation" ON "AcademicPerformance" FOR ALL USING (
    is_super_admin() OR school_id = get_school_id_from_token()
    OR (is_demo_mode() AND school_id = get_demo_school_id())
);

DROP POLICY IF EXISTS "reportcard_isolation" ON "ReportCard";
CREATE POLICY "reportcard_isolation" ON "ReportCard" FOR ALL USING (
    is_super_admin() OR school_id = get_school_id_from_token()
    OR (is_demo_mode() AND school_id = get_demo_school_id())
);

DROP POLICY IF EXISTS "behaviornote_isolation" ON "BehaviorNote";
CREATE POLICY "behaviornote_isolation" ON "BehaviorNote" FOR ALL USING (
    is_super_admin() OR school_id = get_school_id_from_token()
    OR (is_demo_mode() AND school_id = get_demo_school_id())
);

DROP POLICY IF EXISTS "teacherattendance_isolation" ON "TeacherAttendance";
CREATE POLICY "teacherattendance_isolation" ON "TeacherAttendance" FOR ALL USING (
    is_super_admin() OR school_id = get_school_id_from_token()
    OR (is_demo_mode() AND school_id = get_demo_school_id())
);

DROP POLICY IF EXISTS "membership_isolation" ON "SchoolMembership";
CREATE POLICY "membership_isolation" ON "SchoolMembership" FOR ALL USING (
    is_super_admin() OR school_id = get_school_id_from_token()
    OR (is_demo_mode() AND school_id = get_demo_school_id())
);

DROP POLICY IF EXISTS "officehour_isolation" ON "TeacherOfficeHour";
CREATE POLICY "officehour_isolation" ON "TeacherOfficeHour" FOR ALL USING (
    is_super_admin() OR EXISTS (
        SELECT 1 FROM "Teacher" t
        WHERE t.id = "TeacherOfficeHour"."teacher_id"
        AND (t.school_id = get_school_id_from_token() OR (is_demo_mode() AND t.school_id = get_demo_school_id()))
    )
);

DROP POLICY IF EXISTS "appointment_isolation" ON "Appointment";
CREATE POLICY "appointment_isolation" ON "Appointment" FOR ALL USING (
    is_super_admin() OR school_id = get_school_id_from_token()
    OR (is_demo_mode() AND school_id = get_demo_school_id())
);

DROP POLICY IF EXISTS "parentchild_isolation" ON "ParentChild";
CREATE POLICY "parentchild_isolation" ON "ParentChild" FOR ALL USING (
    is_super_admin() OR school_id = get_school_id_from_token()
    OR (is_demo_mode() AND school_id = get_demo_school_id())
);

DROP POLICY IF EXISTS "opportunity_isolation" ON "VolunteeringOpportunity";
CREATE POLICY "opportunity_isolation" ON "VolunteeringOpportunity" FOR ALL USING (
    is_super_admin() OR school_id = get_school_id_from_token()
    OR (is_demo_mode() AND school_id = get_demo_school_id())
);

DROP POLICY IF EXISTS "volunteersignup_isolation" ON "VolunteerSignup";
CREATE POLICY "volunteersignup_isolation" ON "VolunteerSignup" FOR ALL USING (
    is_super_admin() OR school_id = get_school_id_from_token()
    OR (is_demo_mode() AND school_id = get_demo_school_id())
);

DROP POLICY IF EXISTS "verificationcode_isolation" ON "VerificationCode";
CREATE POLICY "verificationcode_isolation" ON "VerificationCode" FOR ALL USING (
    is_super_admin() OR user_id = get_current_user_id()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 4: Grant Permissions
-- ═══════════════════════════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION get_school_id_from_token() TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_branch_id_from_token() TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_current_user_id() TO PUBLIC;
GRANT EXECUTE ON FUNCTION is_user_admin(TEXT) TO PUBLIC;
GRANT EXECUTE ON FUNCTION is_super_admin() TO PUBLIC;
GRANT EXECUTE ON FUNCTION is_main_school_admin(TEXT) TO PUBLIC;
GRANT EXECUTE ON FUNCTION is_demo_mode() TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_demo_school_id() TO PUBLIC;
GRANT EXECUTE ON FUNCTION generate_school_id(TEXT, TEXT, TEXT) TO PUBLIC;

COMMIT;

-- Verify
SELECT 'Security migration complete' AS status;
