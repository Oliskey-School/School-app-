-- Migration: Fix Profiles Schema
-- Description: Ensures public.profiles has 'email' and other required columns.

BEGIN;

-- 1. Create profiles table if it somehow doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    full_name TEXT,
    role TEXT DEFAULT 'student',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ensure all required columns exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'username') THEN
        ALTER TABLE public.profiles ADD COLUMN username TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_active') THEN
        ALTER TABLE public.profiles ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'school_generated_id') THEN
        ALTER TABLE public.profiles ADD COLUMN school_generated_id TEXT;
    END IF;
END $$;

-- 3. Sync data from auth.users to ensure email is populated
-- This mirrors part of 0109 but does it safely
INSERT INTO public.profiles (id, school_id, email, full_name, role)
SELECT 
    id,
    COALESCE((raw_app_meta_data->>'school_id')::uuid, '00000000-0000-0000-0000-000000000000'),
    email,
    COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', email),
    COALESCE(lower(raw_app_meta_data->>'role'), lower(raw_user_meta_data->>'role'), 'student')
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
    school_id = COALESCE(profiles.school_id, EXCLUDED.school_id);

-- 4. Drop and recreate auth_accounts as a view (not a table)
-- This fixes the conflict where some migrations created it as a table
DROP VIEW IF EXISTS public.auth_accounts CASCADE;
DROP TABLE IF EXISTS public.auth_accounts CASCADE;

CREATE VIEW public.auth_accounts AS
SELECT 
    p.id,
    p.email,
    p.username,
    p.school_id,
    p.full_name,
    p.role,
    p.is_active,
    p.school_generated_id,
    p.created_at,
    p.updated_at
FROM public.profiles p;

-- 5. Re-grant permissions
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT SELECT ON public.auth_accounts TO anon, authenticated;

COMMIT;
