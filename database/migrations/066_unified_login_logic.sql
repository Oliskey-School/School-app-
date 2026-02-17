-- Migration: 0103 Unified Login Logic
-- Description: Intercepts new signups (Google/OAuth) and automatically assigns them 
-- to the correct school/role based on their email or a lookup table.

BEGIN;

-- 1. Create a Lookup Table for Email-to-School mapping (Optional but recommended)
-- This is used if the user hasn't been "invited" but we know they belong to a school (e.g. domain matching)
CREATE TABLE IF NOT EXISTS public.school_email_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    domain TEXT UNIQUE NOT NULL, -- e.g. 'greenwood-high.edu'
    default_role TEXT DEFAULT 'student',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enhanced handle_new_user for Google Auth / Unified Login
-- This version attempts to find the user's school if it's not in the metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user_v2()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_role TEXT;
    v_school_id UUID;
    v_full_name TEXT;
    v_email_domain TEXT;
BEGIN
    -- A. Determine Email and Domain
    v_email_domain := split_part(NEW.email, '@', 2);
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', NEW.email);

    -- B. Lookup School Strategy:
    -- 1. Check metadata (Invites/Specific signups)
    -- 2. Check auth_accounts table (Pre-registered legacy users)
    -- 3. Check school_email_domains (Domain matching)
    -- 4. Default: Demo School (for easy testing)

    v_school_id := (NEW.raw_user_meta_data->>'school_id')::UUID;

    IF v_school_id IS NULL THEN
        -- Strategy 2: Lookup in auth_accounts
        SELECT school_id, lower(role) 
        INTO v_school_id, v_role
        FROM public.auth_accounts 
        WHERE lower(email) = lower(NEW.email)
        LIMIT 1;
    END IF;

    IF v_school_id IS NULL THEN
        -- Strategy 3: Domain Matching
        SELECT school_id, default_role 
        INTO v_school_id, v_role
        FROM public.school_email_domains 
        WHERE lower(domain) = lower(v_email_domain)
        LIMIT 1;
    END IF;

    -- Final fallback if everything fails
    IF v_school_id IS NULL THEN
        v_school_id := '00000000-0000-0000-0000-000000000000'; -- Demo School
        v_role := 'student';
    END IF;
    
    v_role := lower(COALESCE(v_role, NEW.raw_user_meta_data->>'role', 'student'));

    -- C. Upsert Public Profile
    INSERT INTO public.users (id, school_id, email, full_name, role)
    VALUES (NEW.id, v_school_id, NEW.email, v_full_name, v_role)
    ON CONFLICT (id) DO UPDATE SET
        school_id = EXCLUDED.school_id,
        role = EXCLUDED.role,
        full_name = EXCLUDED.full_name;

    -- D. (Trigger for sync_user_to_auth_metadata will now fire automatically and pack the JWT)

    RETURN NEW;
END;
$$;

-- Replace existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_v2();

COMMIT;
