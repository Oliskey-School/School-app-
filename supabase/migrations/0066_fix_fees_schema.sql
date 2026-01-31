-- Migration: Fix Student Fees Schema (Force Table)
-- Description: Ensures student_fees is a TABLE, not a VIEW, and has the title column.

-- 1. Drop it if it's a view (or a table, to be safe and clean)
-- DROP VIEW IF EXISTS student_fees CASCADE; -- Causing error because it is a table
DROP TABLE IF EXISTS student_fees CASCADE;

-- 2. Recreate as a proper Table
CREATE TABLE public.student_fees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    title TEXT, -- Ensure this exists
    amount DECIMAL(12, 2) NOT NULL,
    paid_amount DECIMAL(12, 2) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Pending', -- Pending, Partial, Paid, Overdue
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS (Standard Practice)
ALTER TABLE public.student_fees ENABLE ROW LEVEL SECURITY;

-- 4. Add Policy (Open for Demo, or specific schools)
CREATE POLICY "Enable all access for all users" ON "public"."student_fees"
AS PERMISSIVE FOR ALL
TO public
USING (true)
WITH CHECK (true);
