-- Migration: Strict Multi-Tenancy & Demo School Setup
-- Description: Enforces school_id on all tables and sets up the Demo environment.

BEGIN;

--------------------------------------------------------------------------------
-- 1. Ensure Demo School Exists
--------------------------------------------------------------------------------
INSERT INTO public.schools (id, name, slug, subscription_status, motto)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'Demo School',
    'demo-school',
    'active',
    'Learning is Fun'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug;

-- Ensure Main Branch for Demo School
INSERT INTO public.branches (school_id, name, is_main)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'Main Demo Campus',
    true
)
ON CONFLICT DO NOTHING; -- Assuming conflict on (school_id, name) or similar if exists

--------------------------------------------------------------------------------
-- 2. Add school_id to Tables & Backfill
--------------------------------------------------------------------------------

DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'profiles',
        'students',
        'parents',
        'subjects',
        'class_sections',
        'academic_years',
        'student_achievements',
        'attendances',
        'grades',
        'timetable'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        -- check if table exists first to avoid errors
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            
            -- Add column if not exists
            IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = 'school_id') THEN
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE', t);
                RAISE NOTICE 'Added school_id to %', t;
            END IF;

            -- Backfill NULLs to Demo School
            EXECUTE format('UPDATE public.%I SET school_id = ''00000000-0000-0000-0000-000000000000'' WHERE school_id IS NULL', t);
            
            -- Set NOT NULL
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN school_id SET NOT NULL', t);
            
            -- Enable RLS
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

            -- Drop existing tenant policy if exists to avoid duplication
            EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Policy" ON public.%I', t);
            
            -- Create Generic Tenant Policy
            -- Logic: User can see rows if their JWT school_id matches row's school_id
            -- OR if they are a super-admin (service_role)
            EXECUTE format('CREATE POLICY "Tenant Isolation Policy" ON public.%I 
                            FOR ALL 
                            USING (
                                school_id = (auth.jwt() ->> ''school_id'')::uuid
                                OR 
                                auth.role() = ''service_role''
                            )', t);
                            
        END IF;
    END LOOP;
END $$;

--------------------------------------------------------------------------------
-- 3. Special Case: Profiles RLS (Users need to see themselves to login sometimes)
--------------------------------------------------------------------------------
-- We might need a slightly more permissive policy for profiles so users can read their own profile 
-- even if the specialized school logic fails, but generally the above covers it IF the JWT has school_id.
-- However, for the initial login (before JWT has school_id), they might rely on `auth.uid() = id`.

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
FOR SELECT
USING (
    auth.uid() = id
    OR
    school_id = (auth.jwt() ->> 'school_id')::uuid
);

--------------------------------------------------------------------------------
-- 4. Cleanup & Indexes
--------------------------------------------------------------------------------
-- Add indexes on school_id for performance
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON public.profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_students_school_id ON public.students(school_id);
CREATE INDEX IF NOT EXISTS idx_subjects_school_id ON public.subjects(school_id);
CREATE INDEX IF NOT EXISTS idx_class_sections_school_id ON public.class_sections(school_id);

COMMIT;
