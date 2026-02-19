-- Migration: 0150_unified_auth_handler.sql
-- Description: Consolidates all auth.users triggers into one robust function.
-- Resolves "Database error creating new user" by removing recursive updates and fixing ID generation.

BEGIN;

--------------------------------------------------------------------------------
-- 1. CLEANUP: Remove all conflicting triggers and functions
--------------------------------------------------------------------------------
-- auth.users triggers
DROP TRIGGER IF EXISTS on_invited_user_signup ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_school ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_v4 ON auth.users;

-- public.users triggers (Circular Dependency Fix)
DROP TRIGGER IF EXISTS tr_sync_user_to_auth ON public.users;
DROP TRIGGER IF EXISTS tr_sync_school_id ON public.users;
DROP TRIGGER IF EXISTS tr_user_smart_id ON public.users;

-- Cleanup functions
DROP FUNCTION IF EXISTS public.handle_invited_user();
DROP FUNCTION IF EXISTS public.handle_new_school_signup();
DROP FUNCTION IF EXISTS public.handle_new_user_v2();
DROP FUNCTION IF EXISTS public.handle_new_user_v3();
DROP FUNCTION IF EXISTS public.sync_user_to_auth_metadata();
DROP FUNCTION IF EXISTS public.on_school_id_change_sync();
DROP FUNCTION IF EXISTS public.tr_set_user_smart_id();

--------------------------------------------------------------------------------
-- 2. INFRASTRUCTURE: Sequential ID Generation Support
--------------------------------------------------------------------------------
-- Ensure the sequence table exists
CREATE TABLE IF NOT EXISTS public.school_id_sequences (
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    role_code TEXT,
    last_val INTEGER DEFAULT 0,
    PRIMARY KEY (school_id, role_code)
);

-- Fixed ID Generator
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

--------------------------------------------------------------------------------
-- 3. UNIFIED HANDLER: One Function to Rule Them All
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user_v5()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_school_id UUID;
    v_branch_id UUID;
    v_role TEXT;
    v_role_code TEXT;
    v_full_name TEXT;
    v_school_name TEXT;
    v_custom_id TEXT;
    v_slug TEXT;
BEGIN
    -- A. Extract Metadata
    v_school_id := (NULLIF(NEW.raw_user_meta_data->>'school_id', ''))::UUID;
    v_branch_id := (NULLIF(NEW.raw_user_meta_data->>'branch_id', ''))::UUID;
    v_role := lower(COALESCE(NEW.raw_user_meta_data->>'role', 'student'));
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email);
    v_school_name := NEW.raw_user_meta_data->>'school_name';

    -- B. Handle Onboarding (New School Registration)
    IF v_school_name IS NOT NULL AND v_school_id IS NULL THEN
        -- Generate Slug
        v_slug := lower(regexp_replace(v_school_name, '[^a-zA-Z0-9]', '-', 'g'));
        v_slug := v_slug || '-' || substring(md5(random()::text), 1, 4);

        INSERT INTO public.schools (name, slug, subscription_status, contact_email)
        VALUES (v_school_name, v_slug, 'trial', NEW.email)
        RETURNING id INTO v_school_id;

        INSERT INTO public.branches (school_id, name, is_main, code)
        VALUES (v_school_id, 'Main Campus', true, 'MAIN')
        RETURNING id INTO v_branch_id;
        
        v_role := 'admin';
    END IF;

    -- C. Fallback for School ID (Domain Lookup or Demo)
    IF v_school_id IS NULL THEN
        SELECT school_id INTO v_school_id FROM public.school_email_domains 
        WHERE domain = split_part(NEW.email, '@', 2);
    END IF;

    IF v_school_id IS NULL THEN
        v_school_id := '00000000-0000-0000-0000-000000000000'; -- Demo
    END IF;

    -- D. Role Code Mapping
    v_role_code := CASE 
        WHEN v_role = 'teacher' THEN 'TCH'
        WHEN v_role = 'student' THEN 'STU'
        WHEN v_role = 'parent' THEN 'PAR'
        WHEN v_role = 'admin' THEN 'ADM'
        WHEN v_role = 'proprietor' THEN 'PRP'
        ELSE 'USR'
    END;

    -- E. Generate Custom ID
    v_custom_id := public.generate_custom_id(v_school_id, v_role_code);

    -- F. Sync Profiles and Users
    -- We use separate INSERTs to ensure legacy support
    INSERT INTO public.profiles (id, school_id, email, full_name, role, school_generated_id)
    VALUES (NEW.id, v_school_id, NEW.email, v_full_name, v_role, v_custom_id)
    ON CONFLICT (id) DO UPDATE SET
        school_id = EXCLUDED.school_id,
        role = EXCLUDED.role,
        full_name = EXCLUDED.full_name,
        school_generated_id = COALESCE(profiles.school_generated_id, EXCLUDED.school_generated_id);

    INSERT INTO public.users (id, school_id, branch_id, email, full_name, name, role, school_generated_id)
    VALUES (NEW.id, v_school_id, v_branch_id, NEW.email, v_full_name, v_full_name, v_role, v_custom_id)
    ON CONFLICT (id) DO UPDATE SET
        school_id = EXCLUDED.school_id,
        branch_id = EXCLUDED.branch_id,
        role = EXCLUDED.role,
        full_name = EXCLUDED.full_name,
        school_generated_id = COALESCE(users.school_generated_id, EXCLUDED.school_generated_id);

    -- G. Update Auth Metadata (Final Pass - modifies record directly before insert)
    NEW.raw_app_meta_data := jsonb_build_object(
        'school_id', v_school_id,
        'role', v_role,
        'school_generated_id', v_custom_id,
        'active_branch_id', COALESCE(v_branch_id::text, null)
    );

    RETURN NEW;
END;
$$;


--------------------------------------------------------------------------------
-- 4. TRIGGER SETUP
--------------------------------------------------------------------------------
-- We use BEFORE INSERT here so we can modify 'raw_app_meta_data' without a recursive UPDATE
DROP TRIGGER IF EXISTS on_auth_user_created_v5 ON auth.users;
CREATE TRIGGER on_auth_user_created_v5
    BEFORE INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_v5();

COMMIT;
