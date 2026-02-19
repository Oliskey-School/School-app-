
-- ============================================================
-- 149_allow_demo_full_access.sql
-- Purpose: "No Police for Demo" - Bypass strict RLS for Demo School
-- ============================================================

DO $$ 
DECLARE 
    t text;
    tables_to_open text[] := ARRAY[
        'students', 'teachers', 'parents', 'classes', 
        'profiles', 'branches',
        'payments', 'student_fees', 'student_attendance', 
        'notices', 'transport_buses', 'quizzes', 'quiz_questions'
    ];
    demo_school_id uuid := 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
BEGIN
    -- 1. Handle Generic Tables (school_id)
    FOREACH t IN ARRAY tables_to_open LOOP
        EXECUTE format('DROP POLICY IF EXISTS "demo_bypass_%I" ON public.%I', t, t);
        EXECUTE format('
            CREATE POLICY "demo_bypass_%I" ON public.%I
            FOR ALL TO authenticated
            USING (school_id = %L)', t, t, demo_school_id);
    END LOOP;

    -- 2. Handle Schools Table (id)
    DROP POLICY IF EXISTS "demo_bypass_schools" ON public.schools;
    EXECUTE format('
        CREATE POLICY "demo_bypass_schools" ON public.schools
        FOR ALL TO authenticated
        USING (id = %L)', demo_school_id);
END $$;
