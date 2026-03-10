-- =====================================================
-- ENFORCE STRICT BRANCH ISOLATION FOR ASSIGNMENTS
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Ensure branch_id exists on assignments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE public.assignments ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added branch_id column to assignments';
  END IF;
END $$;

-- 1b. Backfill assignments branch_id from their classes
UPDATE public.assignments a
SET branch_id = c.branch_id
FROM public.classes c
WHERE a.class_id = c.id AND a.branch_id IS NULL;


-- 2. Ensure branch_id exists on assignment_submissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'assignment_submissions' AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE public.assignment_submissions ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added branch_id column to assignment_submissions';
  END IF;
END $$;

-- 2b. Backfill submissions branch_id from their students
UPDATE public.assignment_submissions s
SET branch_id = st.branch_id
FROM public.students st
WHERE s.student_id = st.id AND s.branch_id IS NULL;


-- 3. Update RLS on assignments
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "strict_assignments_isolation" ON public.assignments;
CREATE POLICY "strict_assignments_isolation" ON public.assignments
  FOR ALL USING (
    school_id = (SELECT (COALESCE(
      auth.jwt() -> 'app_metadata' ->> 'school_id',
      auth.jwt() -> 'app_metadata' ->> 'school_id'
    ))::uuid)
    AND
    (
        branch_id IS NULL 
        OR 
        branch_id = (SELECT (COALESCE(
            auth.jwt() -> 'user_metadata' ->> 'branch_id',
            auth.jwt() -> 'app_metadata' ->> 'branch_id'
        ))::uuid)
    )
  );


-- 4. Update RLS on assignment_submissions
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "strict_submissions_isolation" ON public.assignment_submissions;
CREATE POLICY "strict_submissions_isolation" ON public.assignment_submissions
  FOR ALL USING (
    school_id = (SELECT (COALESCE(
      auth.jwt() -> 'app_metadata' ->> 'school_id',
      auth.jwt() -> 'app_metadata' ->> 'school_id'
    ))::uuid)
    AND
    (
        branch_id IS NULL 
        OR 
        branch_id = (SELECT (COALESCE(
            auth.jwt() -> 'user_metadata' ->> 'branch_id',
            auth.jwt() -> 'app_metadata' ->> 'branch_id'
        ))::uuid)
    )
  );

-- 5. Force reloading schema API cache 
NOTIFY pgrst, 'reload schema';
