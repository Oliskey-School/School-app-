-- Migration: 0101 Ironclad Schema and Auth
-- Description: Phase 1 & 2 of Multi-Tenant Refactoring. 
-- Adds short_codes, branch_id consistency, and automated Auth Metadata Injection.

BEGIN;

-- ==============================================================================
-- PHASE 1: SCHEMA EXPANSION (SHORT CODES & HIERARCHY)
-- ==============================================================================

-- 1. Update Schools with Short Codes
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS short_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_schools_short_code ON public.schools(lower(short_code));

-- 2. Update Branches with Short Codes
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS short_code TEXT;

-- 3. Ensure branch_id exists across key actor tables
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);

-- ==============================================================================
-- PHASE 2: AUTH METADATA INJECTION (ZERO-QUERY AUTH)
-- ==============================================================================

-- Sequence for global numbering (fallback if per-school sequence is too complex for phase 1)
CREATE SEQUENCE IF NOT EXISTS public.tenant_id_sequence START 100;

-- Ensure custom_id exists on users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS custom_id TEXT;

-- Function to sync public.users data to auth.users metadata
-- This ensures the JWT is always packed with the latest status
CREATE OR REPLACE FUNCTION public.sync_user_to_auth_metadata()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    UPDATE auth.users
    SET raw_app_meta_data = jsonb_set(
        jsonb_set(
            jsonb_set(
                jsonb_set(
                    COALESCE(raw_app_meta_data, '{}'::jsonb),
                    '{school_id}',
                    to_jsonb(NEW.school_id::TEXT)
                ),
                '{branch_id}',
                to_jsonb(COALESCE(NEW.branch_id::TEXT, ''))
            ),
            '{role}',
            to_jsonb(NEW.role)
        ),
        '{custom_id}',
        to_jsonb(COALESCE(NEW.custom_id, ''))
    )
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$;

-- Trigger to keep Auth and Public Profiles in perfect sync
DROP TRIGGER IF EXISTS tr_sync_user_to_auth ON public.users;
CREATE TRIGGER tr_sync_user_to_auth
    AFTER INSERT OR UPDATE OF school_id, branch_id, role, custom_id ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_user_to_auth_metadata();

-- ==============================================================================
-- PHASE 3: SMART ID LOGIC (SCH_BRN_ROLE_000)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.generate_smart_id(p_user_id UUID)
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_sch_code TEXT;
    v_brn_code TEXT;
    v_role_code TEXT;
    v_seq_val BIGINT;
    v_final_id TEXT;
BEGIN
    -- 1. Get Codes
    SELECT 
        upper(COALESCE(s.short_code, 'SCH')), 
        upper(COALESCE(b.short_code, 'BRN')),
        upper(substring(u.role from 1 for 3))
    INTO v_sch_code, v_brn_code, v_role_code
    FROM public.users u
    LEFT JOIN public.schools s ON u.school_id = s.id
    LEFT JOIN public.branches b ON u.branch_id = b.id
    WHERE u.id = p_user_id;

    -- 2. Increment Sequence
    v_seq_val := nextval('public.tenant_id_sequence');

    -- 3. Format
    v_final_id := format('%s_%s_%s_%s', v_sch_code, v_brn_code, v_role_code, LPAD(v_seq_val::TEXT, 3, '0'));
    
    RETURN v_final_id;
END;
$$;

-- Trigger to automatically set custom_id on users
CREATE OR REPLACE FUNCTION public.tr_set_user_smart_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.custom_id IS NULL OR NEW.custom_id = '' THEN
        NEW.custom_id := public.generate_smart_id(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_user_smart_id ON public.users;
CREATE TRIGGER tr_user_smart_id
    BEFORE INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.tr_set_user_smart_id();

-- ==============================================================================
-- PHASE 4: RECOVERY & HEALING (APPLY TO EXISTING DATA)
-- ==============================================================================

-- 1. Initialize Demo School Codes
UPDATE public.schools SET short_code = 'APP' WHERE id = '00000000-0000-0000-0000-000000000000';
UPDATE public.branches SET short_code = 'MAIN', is_main = true WHERE school_id = '00000000-0000-0000-0000-000000000000';

-- 2. Link orphans in public.users to the main branch
UPDATE public.users u
SET branch_id = b.id
FROM public.branches b
WHERE u.school_id = b.school_id 
  AND b.is_main = true 
  AND u.branch_id IS NULL;

-- 3. Update existing users with Smart IDs if missing
UPDATE public.users SET custom_id = public.generate_smart_id(id) WHERE custom_id IS NULL OR custom_id = '';

-- 4. MASS SYNC: Force update auth.users for all active users
-- This populates the JWT claims for everyone immediately
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT * FROM public.users LOOP
        UPDATE auth.users
        SET raw_app_meta_data = jsonb_set(
            jsonb_set(
                jsonb_set(
                    jsonb_set(
                        COALESCE(raw_app_meta_data, '{}'::jsonb),
                        '{school_id}',
                        to_jsonb(r.school_id::TEXT)
                    ),
                    '{branch_id}',
                    to_jsonb(COALESCE(r.branch_id::TEXT, ''))
                ),
                '{role}',
                to_jsonb(r.role)
            ),
            '{custom_id}',
            to_jsonb(COALESCE(r.custom_id, ''))
        )
        WHERE id = r.id;
    END LOOP;
END $$;

COMMIT;
