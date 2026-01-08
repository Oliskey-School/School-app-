-- Migration: 0029_fix_infinite_recursion.sql
-- Purpose: Fix infinite recursion in RLS policies by using a security definer function
-- Created: 2026-01-06

-- 1. Create a helper function to read role without triggering RLS
-- This function runs with the privileges of the creator (postgres/admin), skipping RLS checks.
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- Secure search path
AS $$
DECLARE
  extracted_role text;
BEGIN
  SELECT role INTO extracted_role FROM profiles WHERE id = user_id;
  RETURN extracted_role;
END;
$$;

-- 2. Fix 'profiles' table policies (The source of recursion)

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Re-create it using the secure function (no self-querying RLS loop)
CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (
        get_user_role(auth.uid()) = 'admin'
    );

-- 3. Optimize 'student_attendance' policy to use the function as well (Optional but good for perf)
-- We need to drop the one from 0028 first
DROP POLICY IF EXISTS "Teachers and Admins can manage attendance" ON student_attendance;

CREATE POLICY "Teachers and Admins can manage attendance"
ON student_attendance FOR ALL
USING (
  get_user_role(auth.uid()) IN ('teacher', 'admin', 'proprietor', 'principal')
);

-- 4. Apply same optimization to 'student_fees' if needed
DROP POLICY IF EXISTS "Admins can manage fees" ON student_fees;

CREATE POLICY "Admins can manage fees"
ON student_fees FOR ALL
USING (
   get_user_role(auth.uid()) IN ('admin', 'bursar', 'proprietor')
);

SELECT '✅ Infinite recursion fixed via Security Definer function' as status;
