-- =====================================================
-- FIX EXAM INFRASTRUCTURE
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/ikowlorheeyrsbgvlhvg/sql/new
-- =====================================================

-- 1. Add school_id column to exam_bodies if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'exam_bodies' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE public.exam_bodies ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added school_id column to exam_bodies';
  ELSE
    RAISE NOTICE 'school_id column already exists on exam_bodies';
  END IF;
END $$;

-- 2. Backfill school_id with the first school
UPDATE public.exam_bodies SET school_id = (SELECT id FROM public.schools LIMIT 1) WHERE school_id IS NULL;

-- 3. Make school_id NOT NULL
DO $$
BEGIN
  ALTER TABLE public.exam_bodies ALTER COLUMN school_id SET NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not set NOT NULL (rows may still be NULL)';
END $$;

-- 4. Add unique constraint if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exam_bodies_school_id_code_key') THEN
    ALTER TABLE public.exam_bodies ADD CONSTRAINT exam_bodies_school_id_code_key UNIQUE(school_id, code);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Unique constraint may already exist';
END $$;

-- 5. Create exam_registrations table
CREATE TABLE IF NOT EXISTS public.exam_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  exam_body_id UUID NOT NULL REFERENCES public.exam_bodies(id) ON DELETE CASCADE,
  registration_number TEXT,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, exam_body_id)
);

-- 6. Enable RLS
ALTER TABLE public.exam_bodies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_registrations ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS Policies
DROP POLICY IF EXISTS "exam_bodies_isolation" ON public.exam_bodies;
CREATE POLICY "exam_bodies_isolation" ON public.exam_bodies
  FOR ALL USING (
    school_id = (SELECT (COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'school_id',
      auth.jwt() -> 'app_metadata' ->> 'school_id'
    ))::uuid)
  );

DROP POLICY IF EXISTS "exam_registrations_isolation" ON public.exam_registrations;
CREATE POLICY "exam_registrations_isolation" ON public.exam_registrations
  FOR ALL USING (
    school_id = (SELECT (COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'school_id',
      auth.jwt() -> 'app_metadata' ->> 'school_id'
    ))::uuid)
  );

-- 8. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_bodies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_bodies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_registrations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_registrations TO anon;

-- 9. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
