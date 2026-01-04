-- Final Backend Updates for 100% Completion

-- 1. Add Teacher Curriculum Eligibility Column
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS curriculum_eligibility TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS trcn_certificate TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS british_qualification TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS degree_certificate TEXT;

-- 2. Add School Curriculum Type
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS curriculum_type TEXT;

-- 3. Ensure Attendance Table Has Curriculum Type (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance') THEN
        ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS curriculum_type TEXT;
        CREATE INDEX IF NOT EXISTS idx_attendance_curriculum ON public.attendance(curriculum_type);
    END IF;
END $$;

-- 4. Create Exam Results table if it doesn't exist, then add curriculum type
CREATE TABLE IF NOT EXISTS public.exam_results (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES public.students(id) ON DELETE CASCADE,
    exam_id INTEGER,
    class_id INTEGER,
    teacher_id INTEGER,
    ca_score DECIMAL(5,2),
    exam_score DECIMAL(5,2),
    total_score DECIMAL(5,2),
    grade TEXT,
    curriculum_type TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add curriculum_type column if table already existed
ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS curriculum_type TEXT;
CREATE INDEX IF NOT EXISTS idx_exam_results_curriculum ON public.exam_results(curriculum_type);

-- 5. Add Principal Signature to Schools
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS principal_signature TEXT;

SELECT '✅ Final Backend Updates Applied Successfully' as status;
