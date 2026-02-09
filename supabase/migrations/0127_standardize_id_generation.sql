-- Migration: Standardize ID Generation to OLISKEY
-- Description: Updates the ID generation function to use 'OLISKEY' and 'MAIN' as defaults, ensuring consistency with the frontend.
-- Attempting to update codes if columns exist, otherwise relying on function defaults.

BEGIN;

-- 1. Attempt to update School Code (if column exists, otherwise this might fail in strict mode, but we'll try to be safe)
-- We'll use a DO block to check for column existence to avoid errors if schema differs
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'code') THEN
        UPDATE public.schools 
        SET code = 'OLISKEY' 
        WHERE slug = 'oliskey-demo' OR id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
    END IF;
END $$;

-- 2. Attempt to update Branch Code (Handling duplicates)
DO $$
DECLARE
    v_main_branch_id UUID;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branches' AND column_name = 'code') THEN
        -- Select the most appropriate main branch (preferring 'Main Branch' or the one with is_main=true)
        SELECT id INTO v_main_branch_id 
        FROM public.branches 
        WHERE school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' 
        ORDER BY is_main DESC, name = 'Main Branch' DESC, name = 'Main Campus' DESC 
        LIMIT 1;

        IF v_main_branch_id IS NOT NULL THEN
            -- 2a. Move any existing 'MAIN' code on OTHER branches to avoid conflict
            UPDATE public.branches 
            SET code = 'OLD_' || code 
            WHERE school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' 
              AND code = 'MAIN' 
              AND id != v_main_branch_id;
            
            -- 2b. Set our primary branch to 'MAIN'
            UPDATE public.branches 
            SET code = 'MAIN', is_main = true 
            WHERE id = v_main_branch_id;
            
            -- 2c. Ensure only one branch is marked 'is_main' for this school
            UPDATE public.branches 
            SET is_main = false 
            WHERE school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' 
              AND id != v_main_branch_id;
        END IF;
    END IF;
END $$;

-- 3. Redefine generate_school_role_id (from 0084) to match our new standard
-- This overrides the 'SCH-001' logic
CREATE OR REPLACE FUNCTION generate_school_role_id(role_code TEXT)
RETURNS TEXT AS $$
DECLARE
    next_val BIGINT;
    formatted_id TEXT;
    v_school_code TEXT := 'OLISKEY';
    v_branch_code TEXT := 'MAIN';
    v_role_code TEXT;
BEGIN
    -- Normalize role code to 3-4 letters uppercase
    CASE 
        WHEN role_code ILIKE 'student' OR role_code = 'STU' THEN v_role_code := 'STD';
        WHEN role_code ILIKE 'teacher' OR role_code = 'TEA' THEN v_role_code := 'TCH';
        WHEN role_code ILIKE 'parent' OR role_code = 'PAR' THEN v_role_code := 'PAR';
        WHEN role_code ILIKE 'admin' OR role_code = 'ADM' THEN v_role_code := 'ADM';
        ELSE v_role_code := UPPER(SUBSTRING(role_code, 1, 4));
    END CASE;

    -- Get next value from sequence
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'school_global_id_seq') THEN
        CREATE SEQUENCE school_global_id_seq START 1000;
    END IF;
    
    next_val := nextval('school_global_id_seq');
    
    -- Format: OLISKEY_MAIN_ROLE_0000
    -- Using underscores as separators as requested
    formatted_id := v_school_code || '_' || v_branch_code || '_' || v_role_code || '_' || LPAD(next_val::TEXT, 4, '0');
    
    RETURN formatted_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Redefine generate_school_id (from 0067) to match our new standard (Fallback update)
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
BEGIN
    -- Get School Code (Try to fetch, default to OLISKEY)
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

    -- Determine Role Code (Matches frontend id-generator.ts)
    CASE 
        WHEN p_role ILIKE 'student' THEN v_role_code := 'STD';
        WHEN p_role ILIKE 'teacher' THEN v_role_code := 'TCH';
        WHEN p_role ILIKE 'parent' THEN v_role_code := 'PAR';
        WHEN p_role ILIKE 'admin' THEN v_role_code := 'ADM';
        WHEN p_role ILIKE 'superadmin' THEN v_role_code := 'SADM';
        ELSE v_role_code := UPPER(SUBSTRING(p_role, 1, 4));
    END CASE;

    -- Get Next Sequence
    -- Use the global sequence for simplicity if the per-role table doesn't exist or to unify
    -- But 0067 used school_id_sequences. Let's stick to that if it exists, but default to global if needed.
    -- Actually, let's just use the global sequence for consistency with the new simplified direction.
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'school_global_id_seq') THEN
        CREATE SEQUENCE school_global_id_seq START 1000;
    END IF;
    v_seq_num := nextval('school_global_id_seq');

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

COMMIT;
