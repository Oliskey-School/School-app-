
-- Enable RLS on auth_accounts
ALTER TABLE auth_accounts ENABLE ROW LEVEL SECURITY;

-- 1. Allow Public Read (Temporary for debugging/visibility)
-- Ideally this should be "authenticated" only, but user reports empty list.
DROP POLICY IF EXISTS "Allow public read auth_accounts" ON auth_accounts;
CREATE POLICY "Allow public read auth_accounts" ON auth_accounts FOR SELECT USING (true);

-- 2. Allow Public Insert (To ensure creating users works from client)
-- Again, typically restricted to service_role or admin, but if client does it directly:
DROP POLICY IF EXISTS "Allow public insert auth_accounts" ON auth_accounts;
CREATE POLICY "Allow public insert auth_accounts" ON auth_accounts FOR INSERT WITH CHECK (true);

-- 3. Allow Public Update
DROP POLICY IF EXISTS "Allow public update auth_accounts" ON auth_accounts;
CREATE POLICY "Allow public update auth_accounts" ON auth_accounts FOR UPDATE USING (true);

-- 4. Allow Public Delete
DROP POLICY IF EXISTS "Allow public delete auth_accounts" ON auth_accounts;
CREATE POLICY "Allow public delete auth_accounts" ON auth_accounts FOR DELETE USING (true);

-- Also ensure 'users' table is readable
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read users" ON users;
CREATE POLICY "Allow public read users" ON users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert users" ON users;
CREATE POLICY "Allow public insert users" ON users FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update users" ON users;
CREATE POLICY "Allow public update users" ON users FOR UPDATE USING (true);

-- Verify content count (will appear in output if run in SQL editor, or just ensures policies exist)
DO $$
DECLARE
    count_accounts integer;
BEGIN
    SELECT count(*) INTO count_accounts FROM auth_accounts;
    RAISE NOTICE 'Current auth_accounts count: %', count_accounts;
END $$;
