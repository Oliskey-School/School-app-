-- Migration: Sync Auth Metadata for Demo Accounts
-- Description: Updates raw_app_meta_data for all demo accounts to point to the correct school_id

BEGIN;

DO $$
DECLARE
    v_school_id UUID := 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
    v_user_record RECORD;
BEGIN
    -- Update all demo accounts based on their email suffix
    -- We assume the role is already correct in public.users or we can infer it
    FOR v_user_record IN 
        SELECT id, email, role FROM public.users WHERE email LIKE '%@demo.com'
    LOOP
        -- Update auth.users metadata
        -- We merge into existing raw_app_meta_data to avoid losing other info (like providers)
        UPDATE auth.users
        SET raw_app_meta_data = 
            COALESCE(raw_app_meta_data, '{}'::jsonb) || 
            jsonb_build_object('school_id', v_school_id::text, 'role', v_user_record.role)
        WHERE id = v_user_record.id;
        
        -- Also update raw_user_meta_data for consistency as some frontend code might use it
        UPDATE auth.users
        SET raw_user_meta_data = 
            COALESCE(raw_user_meta_data, '{}'::jsonb) || 
            jsonb_build_object('school_id', v_school_id::text, 'role', v_user_record.role)
        WHERE id = v_user_record.id;
    END LOOP;
END $$;

COMMIT;
