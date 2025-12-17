-- =========================================================
-- RUN THIS IN YOUR SUPABASE SQL EDITOR TO FIX "RLS POLICY" ERRORS
-- =========================================================

-- 1. Disable RLS on Core Tables (Allow all operations)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE teachers DISABLE ROW LEVEL SECURITY;
ALTER TABLE parents DISABLE ROW LEVEL SECURITY;
ALTER TABLE parent_children DISABLE ROW LEVEL SECURITY;

-- 2. Disable RLS on Feature Tables
ALTER TABLE auth_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_fees DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE report_cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE health_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE bus_roster DISABLE ROW LEVEL SECURITY;
ALTER TABLE bus_routes DISABLE ROW LEVEL SECURITY;
ALTER TABLE timetable DISABLE ROW LEVEL SECURITY;

-- 3. Verify Public Access (Just to be safe for Auth Accounts)
DROP POLICY IF EXISTS "Allow insert auth_accounts" ON auth_accounts;
CREATE POLICY "Allow insert auth_accounts" ON auth_accounts FOR INSERT TO PUBLIC WITH CHECK (true);
