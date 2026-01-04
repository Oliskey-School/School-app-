-- Fix: Add user_id to teachers table to link with Supabase Auth
-- This is critical to avoid "Multiple user tables" anti-pattern.

ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Add index for performance on lookups
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id);

-- Update RLS Policy for Teachers (Self-View) using the new column
-- (Assuming policies are defined elsewhere, but this enables the check)
DROP POLICY IF EXISTS "Teachers can view own profile" ON teachers;
CREATE POLICY "Teachers can view own profile" 
ON teachers FOR SELECT 
USING (auth.uid() = user_id);
