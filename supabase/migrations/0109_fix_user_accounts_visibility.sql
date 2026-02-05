-- Migration: Fix User Accounts View
-- Description: Points auth_accounts view to profiles and syncs existing users.

BEGIN;

-- 1. Ensure profiles table has necessary columns for the view
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;

-- 2. Backfill profiles from auth.users (Recovery for existing users)
-- This ensures the 44 users in the Demo School (and others) have profile records.
INSERT INTO public.profiles (id, school_id, email, full_name, role, is_active)
SELECT 
    id,
    COALESCE((raw_app_meta_data->>'school_id')::uuid, '00000000-0000-0000-0000-000000000000'),
    email,
    COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', email),
    COALESCE(lower(raw_app_meta_data->>'role'), lower(raw_user_meta_data->>'role'), 'student'),
    true
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
    school_id = EXCLUDED.school_id,
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

-- 3. Redefine the auth_accounts view to use profiles
-- This is what the frontend "User Accounts" screen (UserAccountsScreen.tsx) queries.
DROP VIEW IF EXISTS public.auth_accounts CASCADE;
DROP TABLE IF EXISTS public.auth_accounts CASCADE;

CREATE OR REPLACE VIEW public.auth_accounts AS
SELECT
    id,
    COALESCE(username, email) as username, -- Frontend expects 'username'
    role as user_type,                    -- Frontend expects 'user_type'
    email,
    id as user_id,                        -- Mapping for legacy compatibility
    created_at,
    is_active, 
    full_name as name,                    -- Frontend expects 'name'
    school_id
FROM
    public.profiles;

-- 4. Ensure RLS is enabled on profiles (should be already, but just in case)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Revoke access to legacy users table to avoid confusion (Optional/Internal)
-- COMMENT ON TABLE public.users IS 'LEGACY: Use public.profiles instead.';

COMMIT;
