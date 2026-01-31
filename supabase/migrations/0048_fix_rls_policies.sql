-- Migration: Fix RLS Policies for Demo
-- Description: Enables RLS and adds policies for domain tables to ensure dashboard visibility.

BEGIN;

-- 1. Ensure RLS is enabled
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts (Safe to Auto-Run)
DROP POLICY IF EXISTS "Users can view data from their school" ON students;
DROP POLICY IF EXISTS "Users can view data from their school" ON teachers;
DROP POLICY IF EXISTS "Users can view data from their school" ON parents;
DROP POLICY IF EXISTS "Users can view data from their school" ON classes;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can view profiles from their school" ON users;

-- 3. Create Policies for USERS (Public Profile)
-- Allow users to read their own profile
CREATE POLICY "Users can view their own profile" ON users
FOR SELECT USING ( auth.uid() = id );

-- Allow users to read profiles of others in the same school
CREATE POLICY "Users can view profiles from their school" ON users
FOR SELECT USING (
    school_id IN (
        SELECT school_id FROM users WHERE id = auth.uid()
    )
);

-- 4. Create Policies for Domain Tables
-- We use a helper function to avoid repeating the subquery, or just inline it.
-- For simplicity/compatibility, we inline it. 
-- Note: This assumes public.users is readable (handled above).

CREATE POLICY "Users can view students in their school" ON students
FOR SELECT USING (
    school_id IN (
        SELECT school_id FROM users WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can view teachers in their school" ON teachers
FOR SELECT USING (
    school_id IN (
        SELECT school_id FROM users WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can view parents in their school" ON parents
FOR SELECT USING (
    school_id IN (
        SELECT school_id FROM users WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can view classes in their school" ON classes
FOR SELECT USING (
    school_id IN (
        SELECT school_id FROM users WHERE id = auth.uid()
    )
);

COMMIT;
