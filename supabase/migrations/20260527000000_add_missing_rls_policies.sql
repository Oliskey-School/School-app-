-- =============================================================================
-- ADD MISSING RLS POLICIES FOR TENANT-SCOPED TABLES
-- =============================================================================
-- Date: 2026-05-27
-- Companion to: add_comprehensive_rls_policies.sql
--
-- ⚠️ PREREQUISITE: This file depends on get_auth_school_id() and
-- get_auth_branch_id() being defined. The local Docker Postgres does NOT have
-- these functions yet; Supabase production may or may not have working
-- versions. Before applying anywhere, verify the helpers exist and resolve
-- correctly from the request context (Supabase sets app.current_school_id
-- via the auth.jwt() claims OR via SET LOCAL from your service).
--
-- If you see "function get_auth_school_id() does not exist" when running this,
-- run the helper-function CREATE OR REPLACE block from
-- add_comprehensive_rls_policies.sql FIRST, then re-run this file.
--
-- Audit finding (CODEBASE_AUDIT.md): 26 tables in the local schema carry a
-- `school_id` column but had no Row Level Security policy, leaving direct
-- Supabase-from-frontend access reliant on app-level filtering only.
--
-- This migration enables RLS and adds a school-isolation (or school+branch)
-- policy on each of those 26 tables using the existing helper functions:
--   - get_auth_school_id()  -> resolves to JWT/session school_id
--   - get_auth_branch_id()  -> resolves to JWT/session branch_id
--
-- Pattern conventions (matches add_comprehensive_rls_policies.sql):
--   - school-only tables: USING (school_id = get_auth_school_id())
--   - school+branch tables: ... AND (branch_id IS NULL OR branch_id = get_auth_branch_id())
--
-- IMPORTANT: in production (Supabase) the backend connects via the SERVICE
-- ROLE which bypasses RLS, so existing controllers are unaffected. RLS only
-- kicks in for direct frontend/anon-key access -- which is exactly where the
-- defense-in-depth gap was.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- SCHOOL-ONLY ISOLATION (19 tables)
-- ----------------------------------------------------------------------------

ALTER TABLE "AppInstallation" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "AppInstallation";
CREATE POLICY school_isolation_policy ON "AppInstallation"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

ALTER TABLE "Asset" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "Asset";
CREATE POLICY school_isolation_policy ON "Asset"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

ALTER TABLE "Backup" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "Backup";
CREATE POLICY school_isolation_policy ON "Backup"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- Branch carries school_id (the parent tenant); branches belong to one school.
ALTER TABLE "Branch" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "Branch";
CREATE POLICY school_isolation_policy ON "Branch"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

ALTER TABLE "Complaint" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "Complaint";
CREATE POLICY school_isolation_policy ON "Complaint"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

ALTER TABLE "CounselingAppointment" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "CounselingAppointment";
CREATE POLICY school_isolation_policy ON "CounselingAppointment"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

ALTER TABLE "EmergencyAlert" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "EmergencyAlert";
CREATE POLICY school_isolation_policy ON "EmergencyAlert"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

ALTER TABLE "ExternalIntegration" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "ExternalIntegration";
CREATE POLICY school_isolation_policy ON "ExternalIntegration"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

ALTER TABLE "Facility" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "Facility";
CREATE POLICY school_isolation_policy ON "Facility"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

ALTER TABLE "KanbanColumn" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "KanbanColumn";
CREATE POLICY school_isolation_policy ON "KanbanColumn"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

ALTER TABLE "ParentTeacherConference" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "ParentTeacherConference";
CREATE POLICY school_isolation_policy ON "ParentTeacherConference"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

ALTER TABLE "ParentalConsent" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "ParentalConsent";
CREATE POLICY school_isolation_policy ON "ParentalConsent"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

ALTER TABLE "PermissionSlip" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "PermissionSlip";
CREATE POLICY school_isolation_policy ON "PermissionSlip"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

ALTER TABLE "SavedReport" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "SavedReport";
CREATE POLICY school_isolation_policy ON "SavedReport"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

ALTER TABLE "SchoolPolicy" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "SchoolPolicy";
CREATE POLICY school_isolation_policy ON "SchoolPolicy"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

ALTER TABLE "SecureAnonymousReport" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "SecureAnonymousReport";
CREATE POLICY school_isolation_policy ON "SecureAnonymousReport"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

ALTER TABLE "SyncLog" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "SyncLog";
CREATE POLICY school_isolation_policy ON "SyncLog"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

ALTER TABLE "VisitorLog" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_isolation_policy ON "VisitorLog";
CREATE POLICY school_isolation_policy ON "VisitorLog"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- ----------------------------------------------------------------------------
-- SCHOOL + BRANCH ISOLATION (7 tables)
-- ----------------------------------------------------------------------------

ALTER TABLE "DataRequest" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_branch_isolation_policy ON "DataRequest";
CREATE POLICY school_branch_isolation_policy ON "DataRequest"
    FOR ALL
    USING (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()))
    WITH CHECK (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()));

ALTER TABLE "MaintenanceTicket" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_branch_isolation_policy ON "MaintenanceTicket";
CREATE POLICY school_branch_isolation_policy ON "MaintenanceTicket"
    FOR ALL
    USING (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()))
    WITH CHECK (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()));

ALTER TABLE "SchoolDocument" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_branch_isolation_policy ON "SchoolDocument";
CREATE POLICY school_branch_isolation_policy ON "SchoolDocument"
    FOR ALL
    USING (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()))
    WITH CHECK (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()));

ALTER TABLE "TeacherEvaluation" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_branch_isolation_policy ON "TeacherEvaluation";
CREATE POLICY school_branch_isolation_policy ON "TeacherEvaluation"
    FOR ALL
    USING (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()))
    WITH CHECK (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()));

ALTER TABLE "Vendor" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_branch_isolation_policy ON "Vendor";
CREATE POLICY school_branch_isolation_policy ON "Vendor"
    FOR ALL
    USING (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()))
    WITH CHECK (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()));

ALTER TABLE "emergency_drills" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_branch_isolation_policy ON "emergency_drills";
CREATE POLICY school_branch_isolation_policy ON "emergency_drills"
    FOR ALL
    USING (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()))
    WITH CHECK (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()));

ALTER TABLE "health_incident_logs" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_branch_isolation_policy ON "health_incident_logs";
CREATE POLICY school_branch_isolation_policy ON "health_incident_logs"
    FOR ALL
    USING (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()))
    WITH CHECK (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()));

ALTER TABLE "safeguarding_policies" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_branch_isolation_policy ON "safeguarding_policies";
CREATE POLICY school_branch_isolation_policy ON "safeguarding_policies"
    FOR ALL
    USING (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()))
    WITH CHECK (school_id = get_auth_school_id() AND (branch_id IS NULL OR branch_id = get_auth_branch_id()));

-- =============================================================================
-- VERIFICATION QUERIES (commented out - run manually to verify):
-- =============================================================================
-- SELECT tablename FROM pg_policies WHERE schemaname='public' ORDER BY tablename;
-- SELECT relname, relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
--   WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity=false
--     AND EXISTS (SELECT 1 FROM information_schema.columns
--                 WHERE table_schema='public' AND table_name=c.relname AND column_name='school_id');
