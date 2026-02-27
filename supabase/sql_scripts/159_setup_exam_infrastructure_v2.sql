-- Description: Creates exam_bodies and exam_registrations tables with RLS and tenancy isolation.
-- REVISED: Added defensive healing for profiles/users tables to fix "column school_id does not exist" errors.

-- 1. Create exam_bodies table
CREATE TABLE IF NOT EXISTS public.exam_bodies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(school_id, code)
);

-- 2. Create exam_registrations table
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

-- 3. Enable RLS
ALTER TABLE public.exam_bodies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_registrations ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies using a robust JWT check
DROP POLICY IF EXISTS "exam_bodies_isolation" ON public.exam_bodies;
CREATE POLICY "exam_bodies_isolation" ON public.exam_bodies
    FOR ALL TO authenticated
    USING (school_id = (SELECT (COALESCE(auth.jwt() -> 'user_metadata' ->> 'school_id', auth.jwt() -> 'app_metadata' ->> 'school_id'))::uuid));

DROP POLICY IF EXISTS "exam_registrations_isolation" ON public.exam_registrations;
CREATE POLICY "exam_registrations_isolation" ON public.exam_registrations
    FOR ALL TO authenticated
    USING (school_id = (SELECT (COALESCE(auth.jwt() -> 'user_metadata' ->> 'school_id', auth.jwt() -> 'app_metadata' ->> 'school_id'))::uuid));

-- 5. Defensive Healing for school_id (Fixes "column school_id does not exist" on profiles)
DO $$
DECLARE
    v_school_id UUID;
BEGIN
    -- Get the main school ID
    SELECT id INTO v_school_id FROM public.schools LIMIT 1;
    
    IF v_school_id IS NULL THEN
        RAISE NOTICE 'No schools found. Skipping profile healing.';
    ELSE
        -- Heal profiles table
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
            -- Add column if it really is missing
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'school_id') THEN
                ALTER TABLE public.profiles ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
            END IF;
            -- Backfill
            UPDATE public.profiles SET school_id = v_school_id WHERE school_id IS NULL;
        END IF;

        -- Heal users table (The app often uses this as the source of truth)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'school_id') THEN
                ALTER TABLE public.users ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
            END IF;
            -- Backfill
            UPDATE public.users SET school_id = v_school_id WHERE school_id IS NULL;
        END IF;

        RAISE NOTICE 'Successfully verified and healed school_id columns.';
    END IF;
END $$;
