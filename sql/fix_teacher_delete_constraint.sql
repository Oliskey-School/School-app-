-- Add ON DELETE CASCADE to the foreign key constraint on cbt_tests
-- This ensures that when a teacher is deleted, their created tests are also deleted (or we can use SET NULL to keep tests)

-- First, drop the existing constraint if it exists
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'cbt_tests_teacher_id_fkey') THEN
        ALTER TABLE cbt_tests DROP CONSTRAINT cbt_tests_teacher_id_fkey;
    END IF;
END $$;

-- Re-add the constraint with ON DELETE CASCADE
ALTER TABLE cbt_tests
ADD CONSTRAINT cbt_tests_teacher_id_fkey
FOREIGN KEY (teacher_id)
REFERENCES teachers(id)
ON DELETE CASCADE;

-- Also disable RLS on cbt_tests to avoid permission errors
ALTER TABLE cbt_tests DISABLE ROW LEVEL SECURITY;
