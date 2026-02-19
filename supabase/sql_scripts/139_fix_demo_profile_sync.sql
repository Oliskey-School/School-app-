-- Migration: 139_fix_demo_profile_sync.sql
-- Description: Fixes the demo user profile to match the correct School ID and ensures Admin role for testing.

BEGIN;

-- 1. Identify the correct School ID (Oliskey Demo School)
DO $$
DECLARE
    v_school_id UUID;
    v_demo_email TEXT := 'user@school.com';
BEGIN
    -- Get the ID of the demo school
    SELECT id INTO v_school_id FROM public.schools WHERE name = 'Oliskey Demo School' LIMIT 1;

    -- Update the public.profiles table for the demo user
    UPDATE public.profiles
    SET 
        school_id = v_school_id,
        role = 'admin', -- Temporarily set to admin to verify dashboard access
        school_generated_id = 'OLISKEY_ADMIN_001'
    WHERE email = v_demo_email;

    -- Also update auth.users metadata to match (if possible via SQL, otherwise depends on trigger)
    -- Note: We can't directly update auth.users.raw_app_meta_data easily without specific permissions/functions,
    -- but usually the sync_user_metadata function handles this if called.
    -- Here we just ensure the public profile is correct so get_school_id() fallback works.

    RAISE NOTICE 'Updated profile for % to School ID %', v_demo_email, v_school_id;
END $$;

COMMIT;
