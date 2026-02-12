-- Migration: 0148_diagnostic_rls_inspection.sql
-- Description: Temporary diagnostic function to inspect RLS context and data distribution.

BEGIN;

CREATE OR REPLACE FUNCTION public.inspect_rls_context()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_result JSONB;
    v_school_id UUID;
    v_active_branch_id UUID;
    v_jwt_school_id TEXT;
    v_jwt_active_branch TEXT;
    v_profiles_count INTEGER;
    v_profiles_school_id UUID;
BEGIN
    -- 1. Check Context Variables
    v_school_id := public.get_school_id();
    v_active_branch_id := public.get_active_branch_id();
    
    -- raw JWT values
    v_jwt_school_id := auth.jwt() -> 'app_metadata' ->> 'school_id';
    v_jwt_active_branch := auth.jwt() -> 'app_metadata' ->> 'active_branch_id';

    -- 2. Check Profiles for current user
    SELECT school_id INTO v_profiles_school_id FROM public.profiles WHERE id = auth.uid();
    SELECT count(*) INTO v_profiles_count FROM public.profiles;

    -- 3. Gather Student Distribution
    v_result := jsonb_build_object(
        'context', jsonb_build_object(
            'auth_uid', auth.uid(),
            'get_school_id', v_school_id,
            'get_active_branch_id', v_active_branch_id,
            'jwt_school_id', v_jwt_school_id,
            'jwt_active_branch', v_jwt_active_branch,
            'profile_school_id', v_profiles_school_id,
            'total_profiles_in_db', v_profiles_count
        ),
        'student_counts', (
            SELECT jsonb_object_agg(COALESCE(branch_id::text, 'NULL'), count)
            FROM (
                SELECT branch_id, count(*) as count
                FROM public.students
                WHERE school_id = v_school_id
                GROUP BY branch_id
            ) s
        )
    );

    RETURN v_result;
END;
$$;

COMMIT;
