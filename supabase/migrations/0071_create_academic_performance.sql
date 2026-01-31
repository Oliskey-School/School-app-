-- Create academic_performance table
CREATE TABLE IF NOT EXISTS public.academic_performance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    term TEXT NOT NULL,
    session TEXT NOT NULL,
    score DECIMAL(5, 2) DEFAULT 0,
    grade TEXT,
    remark TEXT,
    ca_score DECIMAL(5, 2) DEFAULT 0,
    exam_score DECIMAL(5, 2) DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, subject, term, session)
);

-- Enable RLS
ALTER TABLE public.academic_performance ENABLE ROW LEVEL SECURITY;

-- Policies for academic_performance
DROP POLICY IF EXISTS "Public read academic_performance" ON public.academic_performance;
CREATE POLICY "Public read academic_performance" ON public.academic_performance
FOR SELECT TO public USING (true); -- Simplify for demo

DROP POLICY IF EXISTS "Admin manage academic_performance" ON public.academic_performance;
CREATE POLICY "Admin manage academic_performance" ON public.academic_performance
FOR ALL TO public USING (
    EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
);

-- Fix health_logs if needed (placeholder for now)
