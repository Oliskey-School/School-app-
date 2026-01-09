-- 1. Ensure Columns Exist (Idempotent)
ALTER TABLE cbt_exams ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Test';
ALTER TABLE cbt_exams ADD COLUMN IF NOT EXISTS total_marks INT DEFAULT 0;
ALTER TABLE cbt_exams ADD COLUMN IF NOT EXISTS class_id BIGINT REFERENCES classes(id) ON DELETE SET NULL;

-- 2. Enable RLS
ALTER TABLE cbt_exams ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Auth read cbt" ON cbt_exams;
DROP POLICY IF EXISTS "Teachers can insert their own exams" ON cbt_exams;
DROP POLICY IF EXISTS "Teachers can update their own exams" ON cbt_exams;
DROP POLICY IF EXISTS "Teachers can delete their own exams" ON cbt_exams;

-- 4. Create Policies

-- SELECT: Allow all authenticated
CREATE POLICY "Auth read cbt" ON cbt_exams 
FOR SELECT TO authenticated 
USING (true);

-- INSERT: Check if the teacher_id corresponds to the current user
-- Safely handling potential type mismatch by casting to text if needed, 
-- or using the verified email link from JWT.
CREATE POLICY "Teachers can insert their own exams" ON cbt_exams
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teachers 
    WHERE teachers.email = (auth.jwt() ->> 'email')
    AND teachers.id::text = cbt_exams.teacher_id::text -- Safe comparison
  )
);

-- UPDATE
CREATE POLICY "Teachers can update their own exams" ON cbt_exams
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teachers 
    WHERE teachers.email = (auth.jwt() ->> 'email')
    AND teachers.id::text = cbt_exams.teacher_id::text
  )
);

-- DELETE
CREATE POLICY "Teachers can delete their own exams" ON cbt_exams
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teachers 
    WHERE teachers.email = (auth.jwt() ->> 'email')
    AND teachers.id::text = cbt_exams.teacher_id::text
  )
);
