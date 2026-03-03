-- Migration: 153_demo_mode_connectivity_bypass.sql
-- Description: Allows unauthenticated (anon) access specifically for the Demo School to fix dashboard errors in Demo Mode.

BEGIN;

-- 1. Constants
-- Demo School ID: d0ff3e95-9b4c-4c12-989c-e5640d3cacd1

-- 2. Grant Permissions to anon role for core tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_incident_logs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_drills TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.safeguarding_policies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_alerts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_cards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facility_registers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_inventory TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teachers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academic_terms TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academic_years TO anon;
GRANT SELECT ON public.schools TO anon;

-- 3. Add Demo Bypass Policies
-- We'll use a standard naming convention: "demo_bypass_[table_name]"

-- health_incident_logs
DROP POLICY IF EXISTS "demo_bypass_health_incident_logs" ON public.health_incident_logs;
CREATE POLICY "demo_bypass_health_incident_logs" ON public.health_incident_logs
FOR ALL TO anon USING (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1') WITH CHECK (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1');

-- emergency_drills
DROP POLICY IF EXISTS "demo_bypass_emergency_drills" ON public.emergency_drills;
CREATE POLICY "demo_bypass_emergency_drills" ON public.emergency_drills
FOR ALL TO anon USING (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1') WITH CHECK (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1');

-- safeguarding_policies
DROP POLICY IF EXISTS "demo_bypass_safeguarding_policies" ON public.safeguarding_policies;
CREATE POLICY "demo_bypass_safeguarding_policies" ON public.safeguarding_policies
FOR ALL TO anon USING (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1') WITH CHECK (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1');

-- emergency_alerts
DROP POLICY IF EXISTS "demo_bypass_emergency_alerts" ON public.emergency_alerts;
CREATE POLICY "demo_bypass_emergency_alerts" ON public.emergency_alerts
FOR ALL TO anon USING (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1') WITH CHECK (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1');

-- report_cards
DROP POLICY IF EXISTS "demo_bypass_report_cards" ON public.report_cards;
CREATE POLICY "demo_bypass_report_cards" ON public.report_cards
FOR ALL TO anon USING (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1') WITH CHECK (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1');

-- inspections
DROP POLICY IF EXISTS "demo_bypass_inspections" ON public.inspections;
CREATE POLICY "demo_bypass_inspections" ON public.inspections
FOR ALL TO anon USING (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1') WITH CHECK (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1');

-- facility_registers
DROP POLICY IF EXISTS "demo_bypass_facility_registers" ON public.facility_registers;
CREATE POLICY "demo_bypass_facility_registers" ON public.facility_registers
FOR ALL TO anon USING (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1') WITH CHECK (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1');

-- equipment_inventory
DROP POLICY IF EXISTS "demo_bypass_equipment_inventory" ON public.equipment_inventory;
CREATE POLICY "demo_bypass_equipment_inventory" ON public.equipment_inventory
FOR ALL TO anon USING (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1') WITH CHECK (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1');

-- students
DROP POLICY IF EXISTS "demo_bypass_students" ON public.students;
CREATE POLICY "demo_bypass_students" ON public.students
FOR ALL TO anon USING (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1') WITH CHECK (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1');

-- teachers
DROP POLICY IF EXISTS "demo_bypass_teachers" ON public.teachers;
CREATE POLICY "demo_bypass_teachers" ON public.teachers
FOR ALL TO anon USING (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1') WITH CHECK (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1');

-- profiles
DROP POLICY IF EXISTS "demo_bypass_profiles" ON public.profiles;
CREATE POLICY "demo_bypass_profiles" ON public.profiles
FOR ALL TO anon USING (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1') WITH CHECK (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1');

-- classes
DROP POLICY IF EXISTS "demo_bypass_classes" ON public.classes;
CREATE POLICY "demo_bypass_classes" ON public.classes
FOR ALL TO anon USING (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1') WITH CHECK (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1');

-- subjects
DROP POLICY IF EXISTS "demo_bypass_subjects" ON public.subjects;
CREATE POLICY "demo_bypass_subjects" ON public.subjects
FOR ALL TO anon USING (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1') WITH CHECK (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1');

-- academic_terms
DROP POLICY IF EXISTS "demo_bypass_academic_terms" ON public.academic_terms;
CREATE POLICY "demo_bypass_academic_terms" ON public.academic_terms
FOR ALL TO anon USING (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1') WITH CHECK (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1');

-- academic_years
DROP POLICY IF EXISTS "demo_bypass_academic_years" ON public.academic_years;
CREATE POLICY "demo_bypass_academic_years" ON public.academic_years
FOR ALL TO anon USING (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1') WITH CHECK (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1');

-- schools (read only for anon)
DROP POLICY IF EXISTS "demo_bypass_schools" ON public.schools;
CREATE POLICY "demo_bypass_schools" ON public.schools
FOR SELECT TO anon USING (id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1');

COMMIT;
