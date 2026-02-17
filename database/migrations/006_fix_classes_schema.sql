-- Fix for missing 'grade' column in classes table
-- This script safely updates the table schema

BEGIN;

-- 1. Ensure table exists (it should, but good practice)
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add 'grade' column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'grade') THEN
        ALTER TABLE public.classes ADD COLUMN grade INTEGER;
    END IF;
END $$;

-- 3. Ensure other columns exist (idempotent checks just in case)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'school_id') THEN
        ALTER TABLE public.classes ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Enable RLS (idempotent)
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

COMMIT;
