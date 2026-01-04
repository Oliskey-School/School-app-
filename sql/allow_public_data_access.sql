-- ==========================================
-- ALLOW PUBLIC DATA ACCESS (Mock Login Support)
-- Run this if you use Mock Login but want real data from Database
-- ==========================================

-- 1. Disable RLS on key tables (or allow public access)
-- Since "Mock Login" does not provide a simplified token, 
-- proper RLS policies involving auth.uid() will fail.
-- We will temporarily disable RLS for viewing data.

ALTER TABLE fees DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE parent_children DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE installments DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 2. Grant Select Permissions to Anonymous Users
GRANT SELECT ON fees TO anon;
GRANT SELECT ON students TO anon;
GRANT SELECT ON parent_children TO anon;
GRANT SELECT ON payment_plans TO anon;
GRANT SELECT ON installments TO anon;
GRANT SELECT ON profiles TO anon;

-- 3. Also allow Insert/Update for "Mock" Admin actions (if needed)
GRANT ALL ON fees TO anon;
GRANT ALL ON payment_plans TO anon;
GRANT ALL ON installments TO anon;

DO $$
BEGIN
  RAISE NOTICE '🔓 Public Access Enabled. Mock Login can now read Real Data.';
END $$;
