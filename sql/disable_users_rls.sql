-- ============================================
-- DISABLE RLS ON TABLES FOR DEVELOPMENT
-- ============================================
-- This allows the admin panel to create and update records without RLS permission issues
-- For production, you should implement proper authentication and RLS policies

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE teachers DISABLE ROW LEVEL SECURITY;
ALTER TABLE parents DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth_accounts DISABLE ROW LEVEL SECURITY;

-- ============================================
-- ADD INSERT POLICY TO AUTH_ACCOUNTS
-- ============================================

DROP POLICY IF EXISTS "Allow insert auth_accounts" ON auth_accounts;

CREATE POLICY "Allow insert auth_accounts" ON auth_accounts
  FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

-- ============================================
-- Optional: Add UPDATE policy for future use
-- ============================================

DROP POLICY IF EXISTS "Allow update auth_accounts" ON auth_accounts;

CREATE POLICY "Allow update auth_accounts" ON auth_accounts
  FOR UPDATE
  TO PUBLIC
  USING (true)
  WITH CHECK (true);
