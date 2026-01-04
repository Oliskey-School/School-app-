-- ==========================================
-- FIX AUTH SCHEMA PERMISSIONS
-- Run this if you see "Database error querying schema" (500)
-- ==========================================

-- 1. Grant Service Role access to Auth Schema
-- This is critical for Supabase Auth ("GoTrue") to work
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA auth TO service_role;

-- 2. Grant Postgres (Superuser) access just in case
GRANT USAGE ON SCHEMA auth TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres;

-- 3. Ensure extensions are accessible
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- 4. Re-run Public Grants (Standard)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;

DO $$
BEGIN
  RAISE NOTICE '✅ Auth Schema Permissions Restored.';
END $$;
