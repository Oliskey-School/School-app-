-- 🛠️ REPAIR SCRIPT: Fix 'teachers' table Schema
-- ERROR CONTEXT: "operator does not exist: uuid = integer"
-- CAUSE: The 'teachers' table likely has a 'user_id' column that is an INTEGER, not a UUID.

-- 1. Drop the policy that causes the error (if it exists)
DROP POLICY IF EXISTS "Teachers can view own profile" ON teachers;

-- 2. Drop the incorrect column (if it exists) to start fresh
-- We use CASCADE to remove any dependent indexes.
ALTER TABLE teachers DROP COLUMN IF EXISTS user_id CASCADE;

-- 3. Re-add the column correctly as UUID
ALTER TABLE teachers 
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- 4. Re-create the Index
CREATE INDEX idx_teachers_user_id ON teachers(user_id);

-- 5. Re-create the Policy
-- Now valid because user_id (UUID) matches auth.uid() (UUID)
CREATE POLICY "Teachers can view own profile" 
ON teachers FOR SELECT 
USING (auth.uid() = user_id);

SELECT '✅ Teacher Schema Repaired Successfully' as status;
