-- FIX: Create missing attendance table (Dependency for Phase 7)
-- This table was likely missed in an earlier phase.

CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id BIGINT REFERENCES public.students(id),
    class_id TEXT, -- Changed from BIGINT to TEXT to match live DB schema drift
    date DATE DEFAULT CURRENT_DATE,
    status TEXT CHECK (status IN ('Present', 'Absent', 'Late', 'Excused')),
    recorded_by UUID REFERENCES auth.users(id),
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    remarks TEXT,
    UNIQUE(student_id, date, class_id)
);

-- Turn on RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Basic Policies
CREATE POLICY "Staff can view all attendance" ON public.attendance FOR SELECT USING (true);
CREATE POLICY "Staff can record attendance" ON public.attendance FOR INSERT WITH CHECK (true);
