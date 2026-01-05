-- ==========================================
-- FINAL FEE FIX (Fail-Safe)
-- Run this in Supabase SQL Editor
-- ==========================================

-- 1. Reset RLS on Fees Table
ALTER TABLE fees ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to clear conflicts
DROP POLICY IF EXISTS "Admins/Principals can manage fees" ON fees;
DROP POLICY IF EXISTS "Admins/Principals can manage fees (Updated)" ON fees;
DROP POLICY IF EXISTS "Parents can view their children's fees" ON fees;
DROP POLICY IF EXISTS "Students can view their own fees" ON fees;

-- 3. Create a Simple Super-Admin Policy (Email-based)
-- This bypasses any "profiles" table lookup issues
CREATE POLICY "Super Admin Access" ON fees
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'email' = 'admin@school.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'admin@school.com');

-- 4. Create Standard Admin Policy (Role-based)
CREATE POLICY "Admin Role Access" ON fees
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'principal'))
  );

-- 5. Restore View Policies
CREATE POLICY "Parents View Fees" ON fees
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM parent_children pc
      JOIN profiles p ON p.parent_id = pc.parent_id
      WHERE pc.student_id = fees.student_id AND p.id = auth.uid()
    )
  );

CREATE POLICY "Students View Fees" ON fees
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND student_id = fees.student_id
    )
  );

-- 6. Verify one last time
SELECT * FROM profiles WHERE email = 'admin@school.com';
