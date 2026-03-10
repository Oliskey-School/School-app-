-- Migration: Add User Deletion RPCs
-- Description: Adds functions to safely delete users from both public and auth schemas.
-- This is a 'SECURITY DEFINER' function to allow deleting from auth.users which is usually restricted.

BEGIN;

-- 1. Function to delete a user from public.users and auth.users by email
CREATE OR REPLACE FUNCTION public.delete_user_by_email(target_email TEXT)
RETURNS VOID AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Get the user ID from the email
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found', target_email;
    END IF;

    -- Delete from public tables first (cascades should handle most, but we'll be explicit for safety)
    DELETE FROM public.students WHERE user_id = target_user_id;
    DELETE FROM public.teachers WHERE user_id = target_user_id;
    DELETE FROM public.parents WHERE user_id = target_user_id;
    DELETE FROM public.profiles WHERE id = target_user_id;
    DELETE FROM public.users WHERE id = target_user_id;
    DELETE FROM public.auth_accounts WHERE user_id = target_user_id;

    -- Finally delete from auth.users (This requires superuser/service_role or SECURITY DEFINER)
    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Alias for compatibility with UserSeeder.tsx
CREATE OR REPLACE FUNCTION public.delete_auth_user_by_email(email_input TEXT)
RETURNS VOID AS $$
BEGIN
    PERFORM public.delete_user_by_email(email_input);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users (Admins)
GRANT EXECUTE ON FUNCTION public.delete_user_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_auth_user_by_email(TEXT) TO authenticated;

COMMIT;
