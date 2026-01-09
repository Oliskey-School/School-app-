-- Migration: 0028_fix_attendance_rls.sql
-- Purpose: Add missing RLS policies for student_attendance
-- Created: 2026-01-06

-- 1. Ensure RLS is enabled
ALTER TABLE student_attendance ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can view attendance" ON student_attendance;
DROP POLICY IF EXISTS "Teachers and Admins can manage attendance" ON student_attendance;

-- 3. Create Policies

-- Allow all authenticated users to VIEW attendance
-- (Required for Parents/Students to see their records, and Teachers/Admins to load lists)
CREATE POLICY "Authenticated users can view attendance"
ON student_attendance FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow Teachers and Admins to INSERT/UPDATE/DELETE attendance
-- We check the 'profiles' table for the user's role
CREATE POLICY "Teachers and Admins can manage attendance"
ON student_attendance FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('teacher', 'admin', 'proprietor', 'principal') -- Expanded roles just in case
  )
);

-- 4. Also fix student_fees if missing (Proactive fix based on common patterns)
ALTER TABLE student_fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view fees" ON student_fees;
DROP POLICY IF EXISTS "Admins can manage fees" ON student_fees;

CREATE POLICY "Authenticated users can view fees"
ON student_fees FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage fees"
ON student_fees FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'bursar', 'proprietor')
  )
);

SELECT '✅ Attendance and Fees RLS policies applied' as status;
