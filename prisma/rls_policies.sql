-- 1. Enable RLS on core tenant tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Student" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Teacher" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Class" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SchoolMembership" ENABLE ROW LEVEL SECURITY;

-- 2. Create the tenant retrieval function
CREATE OR REPLACE FUNCTION get_auth_school_id() 
RETURNS TEXT AS $$
    SELECT current_setting('app.current_school_id', true)::TEXT;
$$ LANGUAGE sql STABLE;

-- 3. Create a strict isolation policy
-- Policy for "User" table
DROP POLICY IF EXISTS school_isolation_policy ON "User";
CREATE POLICY school_isolation_policy ON "User"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- Policy for "Student" table
DROP POLICY IF EXISTS school_isolation_policy ON "Student";
CREATE POLICY school_isolation_policy ON "Student"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- Policy for "Teacher" table
DROP POLICY IF EXISTS school_isolation_policy ON "Teacher";
CREATE POLICY school_isolation_policy ON "Teacher"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());

-- Policy for "Class" table
DROP POLICY IF EXISTS school_isolation_policy ON "Class";
CREATE POLICY school_isolation_policy ON "Class"
    FOR ALL
    USING (school_id = get_auth_school_id())
    WITH CHECK (school_id = get_auth_school_id());
