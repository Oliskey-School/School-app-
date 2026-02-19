-- ============================================================
-- SECURITY DIAGNOSTIC SCRIPT
-- Run this in Supabase SQL Editor to see why lists are empty.
-- ============================================================

SELECT 
    public.get_school_id() as "Current School ID (from JWT)",
    public.get_branch_id() as "Current Branch ID (from JWT)",
    public.get_role() as "Current Role (from JWT)",
    (SELECT count(*) FROM public.students) as "Total Students Visible via RLS",
    (SELECT school_id FROM public.students LIMIT 1) as "Sample Student School ID",
    (SELECT branch_id FROM public.students LIMIT 1) as "Sample Student Branch ID";
