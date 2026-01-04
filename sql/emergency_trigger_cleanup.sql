-- ==========================================
-- EMERGENCY TRIGGER CLEANUP
-- Run this if Login keeps failing with "Database error"
-- ==========================================

-- 1. Remove the Sync Trigger (It might be crashing)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;

-- 2. Unlock Public Schema (Again, just to be sure)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 3. Verify Admin Profile Exists (Manually)
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
  id, 
  email, 
  'System Admin', 
  'admin'
FROM auth.users 
WHERE email = 'admin@school.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';

DO $$
BEGIN
  RAISE NOTICE '✅ Triggers removed and permissions reset. Login should work normally.';
END $$;
