-- Fix Virtual Class Demo Data, School Existence & Permissions (Robust Version)

BEGIN;

-- 0. Ensure Demo School Exists (Robust Logic)
DO $$
DECLARE
    v_demo_id UUID := '00000000-0000-0000-0000-000000000000';
    v_test_id UUID;
BEGIN
    -- Check if ID exists
    SELECT id INTO v_test_id FROM public.schools WHERE id = v_demo_id;
    
    IF v_test_id IS NULL THEN
        -- ID doesn't exist. Check slug conflict.
        SELECT id INTO v_test_id FROM public.schools WHERE slug = 'school-app-legacy';
        
        IF v_test_id IS NOT NULL THEN
            -- Slug exists on another record. Rename it to free up the slug.
            RAISE NOTICE 'Renaming conflicting slug for school %', v_test_id;
            UPDATE public.schools 
            SET slug = 'school-app-legacy-renamed-' || substring(md5(random()::text), 1, 4) 
            WHERE id = v_test_id;
        END IF;

        -- Now safe to insert
        INSERT INTO public.schools (id, name, slug, subscription_status, created_at)
        VALUES (
            v_demo_id,
            'School App (Legacy)', 
            'school-app-legacy', 
            'active', 
            NOW()
        );
        RAISE NOTICE 'Created demo school %', v_demo_id;
    ELSE
        RAISE NOTICE 'Demo school % already exists', v_demo_id;
    END IF;
END $$;

-- 1. Fix Demo Classes to Include Grade 10A
INSERT INTO public.classes (school_id, name, grade, section, level)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'Grade 10 - Section A',
    10,
    'A',
    'Secondary'
)
ON CONFLICT DO NOTHING;

-- 1b. Fix "Grade 0" Classes (Data Cleanup)
-- Infer grades from names if they are 0
UPDATE public.classes SET grade = 10 WHERE grade = 0 AND name ILIKE '%SS1%';
UPDATE public.classes SET grade = 11 WHERE grade = 0 AND name ILIKE '%SS2%';
UPDATE public.classes SET grade = 12 WHERE grade = 0 AND name ILIKE '%SS3%';
UPDATE public.classes SET grade = 7 WHERE grade = 0 AND name ILIKE '%JSS1%';
UPDATE public.classes SET grade = 8 WHERE grade = 0 AND name ILIKE '%JSS2%';
UPDATE public.classes SET grade = 9 WHERE grade = 0 AND name ILIKE '%JSS3%';

-- 2. Link Demo Student to Grade 10A
DO $$
DECLARE
    v_class_id UUID;
    v_demo_student_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
    SELECT id INTO v_class_id FROM public.classes 
    WHERE school_id = '00000000-0000-0000-0000-000000000000' AND grade = 10 AND section = 'A' LIMIT 1;

    IF v_class_id IS NOT NULL THEN
        UPDATE public.students 
        SET current_class_id = v_class_id,
            grade = 10,
            section = 'A'
        WHERE id = v_demo_student_id;
    END IF;
END $$;

-- 3. Fix Permissions for Virtual Class Sessions
DROP POLICY IF EXISTS "Has full access to virtual_class_sessions" ON public.virtual_class_sessions;
DROP POLICY IF EXISTS "Teachers can manage their own sessions" ON public.virtual_class_sessions;
DROP POLICY IF EXISTS "Students can view active sessions" ON public.virtual_class_sessions;

ALTER TABLE public.virtual_class_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage their own sessions" ON public.virtual_class_sessions
    FOR ALL TO authenticated
    USING (
        teacher_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role IN ('admin', 'teacher') 
            AND school_id = (SELECT school_id FROM public.users WHERE id = virtual_class_sessions.teacher_id::uuid LIMIT 1)
        )
    )
    WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Students can view active sessions" ON public.virtual_class_sessions
    FOR SELECT TO authenticated
    USING (status = 'active');

COMMIT;
