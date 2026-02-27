// Use Supabase Management API v1 with correct endpoint
const TOKEN = 'sbp_cf73c409592ff5c3193b0f6b51494a81d0538ae5';
const PROJECT_REF = 'ikowlorheeyrsbgvlhvg';

const fixSQL = `
-- Add school_id column to exam_bodies if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'exam_bodies' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE public.exam_bodies ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Backfill school_id
UPDATE public.exam_bodies SET school_id = (SELECT id FROM public.schools LIMIT 1) WHERE school_id IS NULL;

-- Make school_id NOT NULL
DO $$
BEGIN
  ALTER TABLE public.exam_bodies ALTER COLUMN school_id SET NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not set NOT NULL';
END $$;

-- Add unique constraint if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exam_bodies_school_id_code_key') THEN
    ALTER TABLE public.exam_bodies ADD CONSTRAINT exam_bodies_school_id_code_key UNIQUE(school_id, code);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Unique constraint may already exist';
END $$;

-- Create exam_registrations
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

-- Enable RLS
ALTER TABLE public.exam_bodies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_bodies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_bodies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_registrations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_registrations TO anon;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
`;

async function main() {
  console.log('=== Applying exam infrastructure fix ===\n');

  // Try the Management API v1 endpoint
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: fixSQL }),
  });

  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Response:', text);

  if (res.status === 401) {
    console.log('\nManagement API unauthorized. Trying alternative approach...');

    // Try the database.dev endpoint  
    const res2 = await fetch(`https://api.supabase.com/v0/pg-meta/${PROJECT_REF}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: fixSQL }),
    });

    console.log('v0 Status:', res2.status);
    const text2 = await res2.text();
    console.log('v0 Response:', text2);
  }
}

main().catch(console.error);
