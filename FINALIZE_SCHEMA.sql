-- =====================================================
-- FINAL SCHEMA HEALING MIGRATION
-- Run this in the Supabase SQL Editor to resolve all remaining gaps.
-- =====================================================

BEGIN;

-- 1. Fix Lesson Notes (Add sorting columns)
ALTER TABLE public.lesson_notes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.lesson_notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Ensure PTA Meetings table exists
CREATE TABLE IF NOT EXISTS public.pta_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    date DATE NOT NULL,
    time TEXT,
    location TEXT,
    agenda JSONB DEFAULT '[]'::jsonb,
    is_past BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Fix Report Cards (Add session column)
ALTER TABLE public.report_cards ADD COLUMN IF NOT EXISTS session TEXT DEFAULT '2025/2026';

-- 4. Enable RLS and Tenancy for PTA Meetings
ALTER TABLE public.pta_meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation Policy" ON public.pta_meetings;
CREATE POLICY "Tenant Isolation Policy" ON public.pta_meetings 
    FOR ALL USING (school_id = (auth.jwt() -> 'user_metadata' ->> 'school_id')::UUID);

-- 5. Add some sample data for the PTA table so it's not immediately empty
-- (Optional: remove this if you want it completely blank)
-- INSERT INTO public.pta_meetings (school_id, title, date, time, location)
-- VALUES ('00000000-0000-0000-0000-000000000000', 'Welcome Session 2026', CURRENT_DATE + 7, '10:00 AM', 'Main Hall');

COMMIT;
