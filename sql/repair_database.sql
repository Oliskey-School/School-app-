-- ==========================================
-- EMERGENCY REPAIR SCRIPT
-- Run this in Supabase SQL Editor to fix "Database error querying schema" and Login issues
-- ==========================================

-- 1. Reset Public Permissions (Crucial for Login)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

-- 2. Ensure Profiles Table is Accessible
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;

-- 3. Reset RLS on Profiles (To prevent recursion/locking issues)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 4. Fix Admin Profile (Safe Upsert)
-- This ensures the admin permissions exist for RLS checks
INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
SELECT 
    id, 
    email, 
    'System Admin', 
    'admin', 
    NOW(), 
    NOW()
FROM auth.users 
WHERE email = 'admin@school.com'
ON CONFLICT (id) DO UPDATE 
SET 
  role = 'admin',
  full_name = 'System Admin';

-- 5. Verify and Print Status
DO $$
DECLARE
  admin_check RECORD;
BEGIN
  SELECT * INTO admin_check FROM public.profiles WHERE email = 'admin@school.com';
  
  IF admin_check.id IS NOT NULL THEN
    RAISE NOTICE '✅ REPAIR COMPLETE: Admin profile secured. Login should work now.';
  ELSE
    RAISE NOTICE '⚠️ NOTICE: Admin user not found in Auth system yet. You may need to Sign Up first.';
  END IF;
END $$;
