-- CRITICAL FIX: Add missing school_id to academic_performance
-- Required before applying RLS

-- 1. Add column (nullable first to allow backfill)
ALTER TABLE public.academic_performance 
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

-- 2. Backfill school_id from Students table
-- This links every grade record to the school of the student who owns it.
UPDATE public.academic_performance ap
SET school_id = s.school_id
FROM public.students s
WHERE ap.student_id = s.id
AND ap.school_id IS NULL;

-- 3. Enforce NOT NULL (after backfill)
-- DO NOT run this if backfill might fail for some rows, but for clean schemas it should be fine.
-- keeping it nullable for safety in this run, but in prod we'd want NOT NULL.
-- ALTER TABLE public.academic_performance ALTER COLUMN school_id SET NOT NULL;

-- 4. Create Index for Performance
CREATE INDEX IF NOT EXISTS idx_academic_performance_school_id 
ON public.academic_performance(school_id);
