-- ==========================================
-- FIX ADMIN PERMISSIONS
-- Run this in the Supabase SQL Editor
-- ==========================================

-- 1. Ensure the admin user exists in public.profiles
-- We select the user from auth.users (the login system) and ensure they have a profile
INSERT INTO public.profiles (id, email, role, full_name, created_at, updated_at)
SELECT 
  id, 
  email, 
  'admin', -- Force role to admin
  'System Admin',
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'admin@school.com'
ON CONFLICT (id) DO UPDATE
SET role = 'admin'; -- If profile exists, just ensure role is admin

-- 2. Verify the fix
DO $$
DECLARE
  found_role TEXT;
BEGIN
  SELECT role INTO found_role 
  FROM public.profiles 
  WHERE email = 'admin@school.com';
  
  IF found_role = 'admin' THEN
    RAISE NOTICE '✅ SUCCESS: Admin profile is set correctly!';
  ELSE
    RAISE WARNING '❌ ERROR: Profile still missing or role is wrong. Found: %', found_role;
  END IF;
END $$;

-- 3. Show the actual row
SELECT * FROM public.profiles WHERE email = 'admin@school.com';
