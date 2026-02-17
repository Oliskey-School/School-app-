-- Migration: 0147_fix_rls_helpers_and_sync.sql
-- Description: Fixes get_school_id() helper and adds branch synchronization logic.

BEGIN;

-- 1. Robust get_school_id() helper
CREATE OR REPLACE FUNCTION public.get_school_id()
RETURNS UUID AS $$
DECLARE
    _school_id UUID;
BEGIN
    -- 1. Try App Metadata (Source of truth for session tenancy)
    _school_id := (NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''))::UUID;
    IF _school_id IS NOT NULL THEN RETURN _school_id; END IF;

    -- 2. Try User Metadata (Fallback)
    _school_id := (NULLIF(auth.jwt() -> 'user_metadata' ->> 'school_id', ''))::UUID;
    IF _school_id IS NOT NULL THEN RETURN _school_id; END IF;

    -- 3. Fallback to public.profiles (Final physical check)
    -- This bypasses RLS issues because it's SECURITY DEFINER
    SELECT school_id INTO _school_id FROM public.profiles WHERE id = auth.uid();
    
    RETURN COALESCE(_school_id, '00000000-0000-0000-0000-000000000000'::UUID);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- 2. Branch Synchronization RPC
-- Updates the user's active branch in auth meta so it reflects in subsequent JWTs
CREATE OR REPLACE FUNCTION public.sync_active_branch(p_branch_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    v_meta JSONB;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    -- Fetch current metadata
    SELECT COALESCE(raw_app_meta_data, '{}'::jsonb) INTO v_meta FROM auth.users WHERE id = auth.uid();

    -- Set active_branch_id
    IF p_branch_id IS NULL THEN
        v_meta := v_meta - 'active_branch_id';
    ELSE
        v_meta := jsonb_set(v_meta, '{active_branch_id}', concat('"', p_branch_id::text, '"')::jsonb);
    END IF;

    -- Update Auth Table
    UPDATE auth.users SET raw_app_meta_data = v_meta WHERE id = auth.uid();

    RETURN jsonb_build_object('success', true, 'active_branch_id', p_branch_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- 3. Update Custom Token Hook to inject active_branch_id
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    claims jsonb;
    v_school_id UUID;
    v_role TEXT;
    v_school_generated_id TEXT;
    v_active_branch_id UUID;
BEGIN
    IF event->>'user_id' IS NULL THEN RETURN event; END IF;

    -- Fetch data from Profiles
    SELECT school_id, role, school_generated_id 
    INTO v_school_id, v_role, v_school_generated_id
    FROM public.profiles 
    WHERE id = (event->>'user_id')::uuid;

    -- Fetch active branch from auth.users meta
    SELECT (raw_app_meta_data->>'active_branch_id')::UUID 
    INTO v_active_branch_id 
    FROM auth.users 
    WHERE id = (event->>'user_id')::uuid;

    claims := event->'claims';

    -- Inject Claims
    IF v_school_id IS NOT NULL THEN
        claims := jsonb_set(claims, '{app_metadata, school_id}', to_jsonb(v_school_id));
        claims := jsonb_set(claims, '{app_metadata, role}', to_jsonb(v_role));
        claims := jsonb_set(claims, '{app_metadata, school_generated_id}', to_jsonb(v_school_generated_id));
        
        -- Inject Active Branch ID
        IF v_active_branch_id IS NOT NULL THEN
            claims := jsonb_set(claims, '{app_metadata, active_branch_id}', to_jsonb(v_active_branch_id));
        ELSE
            -- Ensure it exists in claims as null if not set, or removing it if 'all'
            claims := claims #- '{app_metadata, active_branch_id}';
        END IF;

        claims := jsonb_set(claims, '{app_metadata, x_has_custom_claims}', 'true');
    END IF;

    event := jsonb_set(event, '{claims}', claims);
    RETURN event;
END;
$$;

-- Ensure permissions
GRANT EXECUTE ON FUNCTION public.sync_active_branch TO authenticated;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

COMMIT;
