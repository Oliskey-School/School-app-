-- Fix School ID Sequences Schema Mismatch
-- The existing table had 'role' and 'current_val' but the code expects 'role_code' and 'last_val'.

BEGIN;

-- 1. Align Table Schema with expected code
-- We rename existing columns if they exist.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_id_sequences' AND column_name = 'role') THEN
        ALTER TABLE public.school_id_sequences RENAME COLUMN role TO role_code;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_id_sequences' AND column_name = 'current_val') THEN
        ALTER TABLE public.school_id_sequences RENAME COLUMN current_val TO last_val;
    END IF;
END $$;

-- 2. Drop and Recreate the generate_custom_id function to ensure it uses the correct columns
-- (Just in case the previous migration failed to replace it or verify it)
CREATE OR REPLACE FUNCTION public.generate_custom_id(p_school_id UUID, p_role_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_school_code TEXT;
    v_branch_code TEXT;
    v_sequence INT;
    v_final_id TEXT;
BEGIN
    -- 1. Get School Code
    SELECT COALESCE(code, short_code, 'SCH') INTO v_school_code FROM public.schools WHERE id = p_school_id;
    
    -- 2. Get Main Branch Code
    SELECT COALESCE(code, short_code, 'MAIN') INTO v_branch_code FROM public.branches 
    WHERE school_id = p_school_id AND (is_main = true OR name ILIKE '%Main%') 
    LIMIT 1;

    -- 3. Increment Sequence
    INSERT INTO public.school_id_sequences (school_id, role_code, last_val)
    VALUES (p_school_id, p_role_code, 0)
    ON CONFLICT (school_id, role_code) DO NOTHING;

    UPDATE public.school_id_sequences
    SET last_val = last_val + 1
    WHERE school_id = p_school_id AND role_code = p_role_code
    RETURNING last_val INTO v_sequence;

    -- 4. Format: SCH_MAIN_ADM_001
    v_final_id := COALESCE(v_school_code, 'SCH') || '_' || 
                  COALESCE(v_branch_code, 'MAIN') || '_' || 
                  p_role_code || '_' || 
                  lpad(v_sequence::text, 4, '0');

    RETURN v_final_id;
END;
$$;

COMMIT;
