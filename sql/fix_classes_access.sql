-- ============================================
-- CHECK AND FIX: Why App Can't See Classes
-- ============================================

-- Step 1: Verify classes exist
SELECT COUNT(*) as total_classes FROM classes;

-- Step 2: Show first 10 classes
SELECT * FROM classes LIMIT 10;

-- Step 3: Check if RLS is enabled (this might be blocking access)
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'classes';

-- Step 4: DISABLE RLS on classes table (if enabled)
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;

-- Step 5: Grant public access to classes table
GRANT SELECT ON classes TO anon;
GRANT SELECT ON classes TO authenticated;

-- Step 6: Verify again
SELECT COUNT(*) as total_classes_after_fix FROM classes;

-- Step 7: Test the exact query your app uses
SELECT id, subject, grade, section, department 
FROM classes 
ORDER BY grade ASC, section ASC 
LIMIT 10;

SELECT 'If you see classes above, the fix worked!' as message;
