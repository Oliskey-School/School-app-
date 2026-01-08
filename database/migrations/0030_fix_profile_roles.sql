-- Migration: 0030_fix_profile_roles.sql
-- Purpose: Fix role mismatch (user_type vs role) and ensure profiles have correct roles
-- Created: 2026-01-06

-- 1. Update the Trigger Function to be smarter and handle 'user_type'
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
    extracted_role text;
BEGIN
    -- Extract role from metadata, checking 'role' first, then 'user_type'
    extracted_role := COALESCE(
        new.raw_user_meta_data->>'role', 
        new.raw_user_meta_data->>'user_type', 
        'student'
    );
    
    -- Normalize to lowercase
    extracted_role := LOWER(extracted_role);

    INSERT INTO public.profiles (id, email, role, full_name, avatar_url)
    VALUES (
        new.id, 
        new.email, 
        extracted_role,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'avatar_url'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix existing profiles that might have been misclassified
-- We check auth.users for the correct role data
UPDATE public.profiles
SET role = LOWER(COALESCE(
    auth.users.raw_user_meta_data->>'role', 
    auth.users.raw_user_meta_data->>'user_type',
    profiles.role
))
FROM auth.users
WHERE profiles.id = auth.users.id;

-- 3. Ensure `get_user_role` is definitely case-insensitive (already done in logic, but good practice)
-- (We redefined the logic in previous migration, but if the data is fixed, the function remains simple)

-- 4. Just in case, grant permissive access to 'Teacher' (capitalized) if it somehow persists
-- Update policies to look for lowercase, which we just enforced.

SELECT '✅ Fixed profile roles (metadata sync) and normalized to lowercase' as status;
