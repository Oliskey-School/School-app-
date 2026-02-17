-- Migration: Fix ID Sequences and Correct SSS Student Grades
-- Description: 
-- 1. Creates separate sequences for students, teachers, parents, and staff to ensure independent sequential IDs (0001, 0002...).
-- 2. Updates 'generate_school_role_id' and 'generate_school_id' to use these specific sequences.
-- 3. Corrects the 'grade' column for 'Student SSS1', 'Student SSS2', and 'Student SSS3' (moving them from Grade 1 to 10, 11, 12).

BEGIN;

-- 1. Create separate sequences for each role if they don't exist
DO $$
BEGIN
    -- Student Sequence
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'school_student_id_seq') THEN
        CREATE SEQUENCE school_student_id_seq START 1;
    END IF;

    -- Teacher Sequence
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'school_teacher_id_seq') THEN
        CREATE SEQUENCE school_teacher_id_seq START 1;
    END IF;

    -- Parent Sequence
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'school_parent_id_seq') THEN
        CREATE SEQUENCE school_parent_id_seq START 1;
    END IF;
    
    -- Admin/Staff Sequence
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'school_staff_id_seq') THEN
        CREATE SEQUENCE school_staff_id_seq START 1;
    END IF;
END $$;

-- 2. Update the ID generation function to use these sequences
CREATE OR REPLACE FUNCTION generate_school_role_id(role_code TEXT)
RETURNS TEXT AS $$
DECLARE
    next_val BIGINT;
    formatted_id TEXT;
    v_school_code TEXT := 'OLISKEY';
    v_branch_code TEXT := 'MAIN';
    v_role_code TEXT;
    v_seq_name TEXT;
BEGIN
    -- Normalize role code to 3-4 letters uppercase and determine sequence
    CASE 
        WHEN role_code ILIKE 'student' OR role_code = 'STU' THEN 
            v_role_code := 'STD';
            v_seq_name := 'school_student_id_seq';
        WHEN role_code ILIKE 'teacher' OR role_code = 'TEA' THEN 
            v_role_code := 'TCH';
            v_seq_name := 'school_teacher_id_seq';
        WHEN role_code ILIKE 'parent' OR role_code = 'PAR' THEN 
            v_role_code := 'PAR';
            v_seq_name := 'school_parent_id_seq';
        WHEN role_code ILIKE 'admin' OR role_code = 'ADM' THEN 
            v_role_code := 'ADM';
            v_seq_name := 'school_staff_id_seq';
        ELSE 
            v_role_code := UPPER(SUBSTRING(role_code, 1, 4));
            v_seq_name := 'school_global_id_seq'; -- Fallback to global
    END CASE;

    -- Get next value from the specific sequence
    -- If the specific sequence doesn't exist (fallback case), use global
    BEGIN
        next_val := nextval(v_seq_name);
    EXCEPTION WHEN undefined_table THEN
        IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'school_global_id_seq') THEN
             CREATE SEQUENCE school_global_id_seq START 1000;
        END IF;
        next_val := nextval('school_global_id_seq');
    END;
    
    -- Format: OLISKEY_MAIN_ROLE_0000
    formatted_id := v_school_code || '_' || v_branch_code || '_' || v_role_code || '_' || LPAD(next_val::TEXT, 4, '0');
    
    RETURN formatted_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Update the secondary generation function (generate_school_id) as well
CREATE OR REPLACE FUNCTION public.generate_school_id(p_school_id uuid, p_branch_id uuid, p_role text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
    v_school_code text;
    v_branch_code text;
    v_role_code text;
    v_seq_num integer;
    v_new_id text;
    v_seq_name text;
BEGIN
    -- Get School Code
    BEGIN
        SELECT code INTO v_school_code FROM public.schools WHERE id = p_school_id;
    EXCEPTION WHEN OTHERS THEN
        v_school_code := NULL;
    END;
    
    IF v_school_code IS NULL THEN v_school_code := 'OLISKEY'; END IF;

    -- Get Branch Code
    IF p_branch_id IS NOT NULL THEN
        BEGIN
            SELECT code INTO v_branch_code FROM public.branches WHERE id = p_branch_id;
        EXCEPTION WHEN OTHERS THEN
            v_branch_code := NULL;
        END;
    END IF;
    IF v_branch_code IS NULL THEN v_branch_code := 'MAIN'; END IF;

    -- Determine Role Code & Sequence
    CASE 
        WHEN p_role ILIKE 'student' THEN 
            v_role_code := 'STD';
            v_seq_name := 'school_student_id_seq';
        WHEN p_role ILIKE 'teacher' THEN 
            v_role_code := 'TCH';
            v_seq_name := 'school_teacher_id_seq';
        WHEN p_role ILIKE 'parent' THEN 
            v_role_code := 'PAR';
            v_seq_name := 'school_parent_id_seq';
        WHEN p_role ILIKE 'admin' THEN 
            v_role_code := 'ADM';
            v_seq_name := 'school_staff_id_seq';
        WHEN p_role ILIKE 'superadmin' THEN 
            v_role_code := 'SADM';
            v_seq_name := 'school_staff_id_seq';
        ELSE 
            v_role_code := UPPER(SUBSTRING(p_role, 1, 4));
            v_seq_name := 'school_global_id_seq';
    END CASE;

    -- Get Next Sequence
    BEGIN
        v_seq_num := nextval(v_seq_name);
    EXCEPTION WHEN undefined_table THEN
         IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'school_global_id_seq') THEN
             CREATE SEQUENCE school_global_id_seq START 1000;
        END IF;
        v_seq_num := nextval('school_global_id_seq');
    END;

    -- Format: OLISKEY_MAIN_ROLE_0000
    v_new_id := UPPER(FORMAT('%s_%s_%s_%s', 
        v_school_code, 
        v_branch_code, 
        v_role_code, 
        LPAD(v_seq_num::text, 4, '0')
    ));

    RETURN v_new_id;
END;
$function$;


-- 4. Correct Data: Fix SSS Students misclassified as Grade 1
-- Student SSS1 -> Grade 10 (SSS 1)
-- Student SSS2 -> Grade 11 (SSS 2)
-- Student SSS3 -> Grade 12 (SSS 3)

UPDATE public.students
SET grade = 10, department = 'Science' -- Defaulting to Science, can be changed
WHERE name ILIKE '%Student SSS1%' AND grade = 1;

UPDATE public.students
SET grade = 11, department = 'Science'
WHERE name ILIKE '%Student SSS2%' AND grade = 1;

UPDATE public.students
SET grade = 12, department = 'Science'
WHERE name ILIKE '%Student SSS3%' AND grade = 1;

COMMIT;
