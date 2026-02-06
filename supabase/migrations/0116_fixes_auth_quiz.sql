-- Migration: Fixes for Auth, Quiz Visibility, and Teacher Profiles

BEGIN;

--------------------------------------------------------------------------------
-- 1. Create Missing Tables (CBT)
--------------------------------------------------------------------------------
-- Schools, Classes, Subjects, Teachers, Students are assumed to exist.

CREATE TABLE IF NOT EXISTS public.cbt_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL, -- Weak link or FK depending on order
    title TEXT NOT NULL,
    subject_id UUID REFERENCES public.subjects(id),
    class_id UUID REFERENCES public.classes(id),
    class_grade TEXT,
    duration_minutes INTEGER DEFAULT 60,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    teacher_id UUID -- REFERENCES public.teachers(id) - avoiding cycle if teachers table checked later
);

CREATE TABLE IF NOT EXISTS public.cbt_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES public.cbt_exams(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'multiple_choice',
    options JSONB,
    correct_answer TEXT,
    points INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.cbt_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES public.cbt_exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL, -- REFERENCES public.students(id)
    score NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pending',
    submitted_at TIMESTAMPTZ DEFAULT now()
);

--------------------------------------------------------------------------------
-- 2. Teacher Profile Sync (Fix "Teacher profile not found")
--------------------------------------------------------------------------------
-- Ensure all users with role 'teacher' in profiles have a corresponding record in teachers table
-- Fixed: Removed employee_id and used ARRAY['General'] for subject_specialization
INSERT INTO public.teachers (id, user_id, school_id, email, name, subject_specialization)
SELECT 
    p.id, 
    p.id, 
    p.school_id, 
    p.email, 
    p.full_name, 
    ARRAY['General'] -- Default
FROM public.profiles p
WHERE p.role = 'teacher'
AND NOT EXISTS (
    SELECT 1 FROM public.teachers t WHERE t.id = p.id OR t.user_id = p.id
);

--------------------------------------------------------------------------------
-- 3. CBT Exams RLS (Fix "Quiz Builder not showing")
--------------------------------------------------------------------------------
-- Enable RLS
ALTER TABLE public.cbt_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbt_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbt_submissions ENABLE ROW LEVEL SECURITY;

-- Policy: Students can view exams in their school (and published)
DROP POLICY IF EXISTS "Enable read access for school members" ON public.cbt_exams;
CREATE POLICY "Enable read access for school members" ON public.cbt_exams
    FOR SELECT
    TO authenticated
    USING (
        -- Exam must belong to the user's school
        school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()) OR
        -- OR User is in Demo Mode and Exam is the Demo Exam
        (
            auth.jwt() ->> 'email' LIKE '%demo%' AND 
            school_id = '00000000-0000-0000-0000-000000000000'
        )
    );

-- Policy: Questions
DROP POLICY IF EXISTS "Enable read access for school members" ON public.cbt_questions;
CREATE POLICY "Enable read access for school members" ON public.cbt_questions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cbt_exams e
            WHERE e.id = cbt_questions.exam_id
            AND (e.school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()) OR e.school_id = '00000000-0000-0000-0000-000000000000')
        )
    );

-- Policy: Submissions (Manage own)
DROP POLICY IF EXISTS "Enable access for own submissions" ON public.cbt_submissions;
CREATE POLICY "Enable access for own submissions" ON public.cbt_submissions
    FOR ALL
    TO authenticated
    USING (
        student_id::text = (SELECT id::text FROM public.students WHERE user_id = auth.uid()) OR
        student_id::text = auth.uid()::text -- Fallback if student_id is user_id
    );

--------------------------------------------------------------------------------
-- 4. Auth Accounts Sync (Backfill for Login)
--------------------------------------------------------------------------------
-- Ensure auth_accounts has entries for existing users (if missing)
INSERT INTO public.auth_accounts (username, email, school_id)
SELECT 
    split_part(email, '@', 1) || '.' || split_part(split_part(email, '@', 2), '.', 1),
    email,
    school_id
FROM public.profiles
WHERE NOT EXISTS (SELECT 1 FROM public.auth_accounts WHERE email = profiles.email)
AND email IS NOT NULL;

COMMIT;
