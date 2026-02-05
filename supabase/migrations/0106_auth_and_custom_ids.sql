-- Migration: Auth & Custom IDs
-- Description: Sets up the auth hooks and custom ID generation for multi-tenancy.

BEGIN;

--------------------------------------------------------------------------------
-- 1. Helper Columns for ID Generation
--------------------------------------------------------------------------------
-- Defensive: Drop existing conflicting unique indexes/constraints first
DROP INDEX IF EXISTS public.uq_schools_code;
DROP INDEX IF EXISTS public.idx_schools_code;
ALTER TABLE public.schools DROP CONSTRAINT IF EXISTS schools_code_format;

-- Add columns (Defensive: Handle existing duplicates)
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS code TEXT;

-- 1a. Fill defaults if null
UPDATE public.schools SET code = 'SCH' WHERE code IS NULL;
UPDATE public.branches SET code = 'BRN' WHERE code IS NULL;

-- 1b. De-duplicate School Codes (ensure global uniqueness for schools)
WITH school_dups AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY code ORDER BY created_at) as rn
    FROM public.schools
)
UPDATE public.schools s
SET code = s.code || (sd.rn - 1)
FROM school_dups sd
WHERE s.id = sd.id AND sd.rn > 1;

-- 1c. De-duplicate Branch Codes (ensure uniqueness within each school)
WITH branch_dups AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY school_id, code ORDER BY created_at) as rn
    FROM public.branches
)
UPDATE public.branches b
SET code = b.code || (bd.rn - 1)
FROM branch_dups bd
WHERE b.id = bd.id AND bd.rn > 1;

-- 1d. Now apply unique constraints and defaults
ALTER TABLE public.schools ALTER COLUMN code SET DEFAULT 'SCH';
ALTER TABLE public.branches ALTER COLUMN code SET DEFAULT 'BRN';

CREATE UNIQUE INDEX IF NOT EXISTS idx_schools_code ON public.schools(code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_branches_code_school ON public.branches(school_id, code);

--------------------------------------------------------------------------------
-- 2. Custom ID Generation Function
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_custom_id(p_school_id UUID, p_role_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
    v_school_code TEXT;
    v_branch_code TEXT;
    v_sequence INT;
    v_final_id TEXT;
BEGIN
    -- 1. Get School Code
    SELECT code INTO v_school_code FROM public.schools WHERE id = p_school_id;
    IF v_school_code IS NULL THEN
        v_school_code := 'SCH'; -- Fallback
    END IF;

    -- 2. Get Branch Code (Assuming Main Branch for now as user just logs in, or default branch)
    -- In a strict setup, we might need branch_id passed in. 
    -- For now, we fetch the 'is_main' branch for this school.
    SELECT code INTO v_branch_code FROM public.branches WHERE school_id = p_school_id AND is_main = true LIMIT 1;
    IF v_branch_code IS NULL THEN
        v_branch_code := 'GEN';
    END IF;

    -- 3. Calculate Next Sequence
    -- We'll use a count on profiles for simplicity and strict isolation, 
    -- OR a separate sequence table if concurrency is high.
    -- Using count(*) + 1 is risky for concurrency but okay for low-volume school apps.
    -- Better: Locking or Sequence Table. Let's use a simpler per-school sequence approach using a table.
    
    -- (Optional) Create a sequence table if not exists, but for this plan we'll use a safe lookup
    -- Lock the profiles table for this school to prevent race conditions (Performance warning but safe)
    -- LOCK TABLE public.profiles IN SHARE ROW EXCLUSIVE MODE; 
    -- ^ Too heavy. Let's use a separate sequence table.

    CREATE TABLE IF NOT EXISTS public.school_id_sequences (
        school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
        role_code TEXT,
        last_val INTEGER DEFAULT 0,
        PRIMARY KEY (school_id, role_code)
    );

    INSERT INTO public.school_id_sequences (school_id, role_code, last_val)
    VALUES (p_school_id, p_role_code, 0)
    ON CONFLICT (school_id, role_code) DO NOTHING;

    UPDATE public.school_id_sequences
    SET last_val = last_val + 1
    WHERE school_id = p_school_id AND role_code = p_role_code
    RETURNING last_val INTO v_sequence;

    -- 4. Format: LAG_IJE_TCH_005
    v_final_id := v_school_code || '_' || v_branch_code || '_' || p_role_code || '_' || lpad(v_sequence::text, 3, '0');

    RETURN v_final_id;
END;
$$;

--------------------------------------------------------------------------------
-- 3. Auth Trigger (Handle New User)
--------------------------------------------------------------------------------
-- Updates existing logic to use the new ID generator
CREATE OR REPLACE FUNCTION public.handle_new_user_v3()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_role TEXT;
    v_role_code TEXT;
    v_school_id UUID;
    v_full_name TEXT;
    v_custom_id TEXT;
BEGIN
    -- Reuse logic from v2 to find school and role
    v_school_id := (NEW.raw_user_meta_data->>'school_id')::UUID;
    v_role := lower(COALESCE(NEW.raw_user_meta_data->>'role', 'student'));
    
    -- Fallback to Demo School if not found
    IF v_school_id IS NULL THEN
        -- Attempt domain lookup (simplified from v2)
        SELECT school_id INTO v_school_id FROM public.school_email_domains 
        WHERE domain = split_part(NEW.email, '@', 2);
    END IF;

    IF v_school_id IS NULL THEN
        v_school_id := '00000000-0000-0000-0000-000000000000'; -- Demo
    END IF;

    -- Map Role to Code
    v_role_code := CASE 
        WHEN v_role = 'teacher' THEN 'TCH'
        WHEN v_role = 'student' THEN 'STU'
        WHEN v_role = 'parent' THEN 'PAR'
        WHEN v_role = 'admin' THEN 'ADM'
        ELSE 'USR'
    END;

    -- Generate ID
    v_custom_id := public.generate_custom_id(v_school_id, v_role_code);
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);

    -- Ensure email column exists (Defensive Fix)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
    END IF;

    -- Upsert Profile
    INSERT INTO public.profiles (id, school_id, email, full_name, role, school_generated_id)
    VALUES (NEW.id, v_school_id, NEW.email, v_full_name, v_role, v_custom_id)
    ON CONFLICT (id) DO UPDATE SET
        school_id = EXCLUDED.school_id,
        role = EXCLUDED.role,
        school_generated_id = COALESCE(profiles.school_generated_id, EXCLUDED.school_generated_id);

    -- Update Auth Metadata immediately (redundancy for speed)
    UPDATE auth.users
    SET raw_app_meta_data = jsonb_build_object(
        'school_id', v_school_id,
        'role', v_role,
        'school_generated_id', v_custom_id
    )
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_v3();

--------------------------------------------------------------------------------
-- 4. Custom Access Token Hook
--------------------------------------------------------------------------------
-- This function runs on every JWT minting.
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    claims jsonb;
    v_school_id UUID;
    v_role TEXT;
    v_school_generated_id TEXT;
BEGIN
    -- Input Check
    IF event->>'user_id' IS NULL THEN
        RETURN event;
    END IF;

    -- Fetch from Profiles
    SELECT school_id, role, school_generated_id 
    INTO v_school_id, v_role, v_school_generated_id
    FROM public.profiles 
    WHERE id = (event->>'user_id')::uuid;

    claims := event->'claims';

    -- Inject Claims
    IF v_school_id IS NOT NULL THEN
        claims := jsonb_set(claims, '{app_metadata, school_id}', to_jsonb(v_school_id));
        claims := jsonb_set(claims, '{app_metadata, role}', to_jsonb(v_role));
        claims := jsonb_set(claims, '{app_metadata, school_generated_id}', to_jsonb(v_school_generated_id));
        
        -- Also set 'x-has-custom-claims' to true for debugging
        claims := jsonb_set(claims, '{app_metadata, x_has_custom_claims}', 'true');
    END IF;

    -- Return modified event
    event := jsonb_set(event, '{claims}', claims);
    RETURN event;
END;
$$;

-- Grant permissions needed for the hook to run (usually run by supabase_auth_admin)
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

COMMIT;
