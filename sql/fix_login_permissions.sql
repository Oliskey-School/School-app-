-- ==========================================
-- FIX LOGIN PERMISSIONS
-- Run in Supabase SQL Editor
-- ==========================================

-- 1. Grant public usage to everyone
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- 2. Grant table access
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- 3. Grant sequence access (for ID generation)
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role, anon, authenticated;

-- 4. Grant routine access (for functions)
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role, anon, authenticated;

-- 5. Explicit Profiles Grant
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- 6. Verify with a notice
DO $$
BEGIN
  RAISE NOTICE '✅ Permissions restored. Please try logging in now.';
END $$;
