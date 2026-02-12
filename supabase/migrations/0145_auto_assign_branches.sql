-- Migration: 0145_auto_assign_branches.sql
-- Description: Automatically assigns all existing orphaned data to the Main Branch of each school.
-- This fixes the issue where lists are empty because branch_id is NULL.

BEGIN;

-- 1. Ensure every school has at least one "Main Branch"
-- If a school has no branches, create one.
INSERT INTO public.branches (school_id, name, is_main)
SELECT id, 'Main Branch', true
FROM public.schools s
WHERE NOT EXISTS (SELECT 1 FROM public.branches b WHERE b.school_id = s.id);

-- 2. Create a helper to get the main branch ID for a school
CREATE OR REPLACE FUNCTION public.get_main_branch_id(p_school_id UUID)
RETURNS UUID AS $$
    SELECT id FROM public.branches 
    WHERE school_id = p_school_id 
    ORDER BY is_main DESC, created_at ASC 
    LIMIT 1;
$$ LANGUAGE sql STABLE;

-- 3. Update all core tables: Assign records with NULL branch_id to the Main Branch
DO $$
DECLARE
    t text;
    tables_to_fix text[] := ARRAY[
        'students', 'teachers', 'parents', 'classes', 'timetable', 
        'assignments', 'grades', 'attendance_records', 'student_fees', 
        'report_cards', 'health_logs', 'student_attendance', 'transport_buses',
        'messages', 'notices', 'quizzes', 'quiz_questions', 'quiz_submissions',
        'users', 'profiles'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_fix LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
            -- Update only if branch_id is NULL and school_id is NOT NULL
            EXECUTE format(
                'UPDATE public.%I SET branch_id = public.get_main_branch_id(school_id) 
                 WHERE branch_id IS NULL AND school_id IS NOT NULL', t
            );
        END IF;
    END LOOP;
END $$;

-- 4. Assign current users to their school's main branch in user_branch_access
-- This ensures they have "Permission" to see the data they just got assigned to.
INSERT INTO public.user_branch_access (user_id, branch_id, school_id, role)
SELECT id, branch_id, school_id, role
FROM public.users
WHERE branch_id IS NOT NULL
ON CONFLICT (user_id, branch_id) DO NOTHING;

COMMIT;
