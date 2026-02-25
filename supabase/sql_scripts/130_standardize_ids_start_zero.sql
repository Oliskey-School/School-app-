-- Migration: Standardize IDs and Start from Zero
-- Description: Updates sequences to start from 0 and formats ID as School_Branch_Role_Numbers (e.g., OLISKEY_MAIN_STD_0000)

BEGIN;

-- 1. Alter sequences to start from 0
DO $$
BEGIN
    -- Student Sequence
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'school_student_id_seq') THEN
        ALTER SEQUENCE school_student_id_seq MINVALUE 0 START 0 RESTART WITH 0;
    ELSE
        CREATE SEQUENCE school_student_id_seq MINVALUE 0 START 0;
    END IF;

    -- Teacher Sequence
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'school_teacher_id_seq') THEN
        ALTER SEQUENCE school_teacher_id_seq MINVALUE 0 START 0 RESTART WITH 0;
    ELSE
        CREATE SEQUENCE school_teacher_id_seq MINVALUE 0 START 0;
    END IF;

    -- Parent Sequence
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'school_parent_id_seq') THEN
        ALTER SEQUENCE school_parent_id_seq MINVALUE 0 START 0 RESTART WITH 0;
    ELSE
        CREATE SEQUENCE school_parent_id_seq MINVALUE 0 START 0;
    END IF;
    
    -- Admin/Staff Sequence
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'school_staff_id_seq') THEN
        ALTER SEQUENCE school_staff_id_seq MINVALUE 0 START 0 RESTART WITH 0;
    ELSE
        CREATE SEQUENCE school_staff_id_seq MINVALUE 0 START 0;
    END IF;
    
    -- Global Sequence
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'school_global_id_seq') THEN
        ALTER SEQUENCE school_global_id_seq MINVALUE 0 START 0 RESTART WITH 0;
    ELSE
        CREATE SEQUENCE school_global_id_seq MINVALUE 0 START 0;
    END IF;
END $$;

-- 2. Update generate_school_role_id
CREATE OR REPLACE FUNCTION public.generate_school_role_id(role_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    next_val BIGINT;
    formatted_id TEXT;
    v_school_code TEXT := 'OLISKEY';
    v_branch_code TEXT := 'MAIN';
    v_role_code TEXT;
    v_seq_name TEXT;
BEGIN
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
            v_seq_name := 'school_global_id_seq';
    END CASE;

    BEGIN
        next_val := nextval(v_seq_name);
    EXCEPTION WHEN undefined_table THEN
        next_val := nextval('school_global_id_seq');
    END;
    
    -- Ensure School_branch_role_numbers
    formatted_id := UPPER(v_school_code || '_' || v_branch_code || '_' || v_role_code || '_' || LPAD(next_val::TEXT, 5, '0'));
    
    RETURN formatted_id;
END;
$$;

-- 3. Update generate_school_id (if school and branch ids are available)
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

    BEGIN
        v_seq_num := nextval(v_seq_name);
    EXCEPTION WHEN undefined_table THEN
        v_seq_num := nextval('school_global_id_seq');
    END;

    -- Ensure School_branch_role_numbers
    v_new_id := UPPER(FORMAT('%s_%s_%s_%s', 
        v_school_code, 
        v_branch_code, 
        v_role_code, 
        LPAD(v_seq_num::text, 5, '0')
    ));

    RETURN v_new_id;
END;
$function$;

COMMIT;
