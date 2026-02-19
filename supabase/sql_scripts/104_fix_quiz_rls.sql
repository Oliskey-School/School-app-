
-- Migration: Fix CBT and Quiz RLS Policies
BEGIN;

--------------------------------------------------------------------------------
-- 1. Quizzes Table
--------------------------------------------------------------------------------
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view published quizzes" ON public.quizzes;
CREATE POLICY "Students can view published quizzes" ON public.quizzes
    FOR SELECT
    TO authenticated
    USING (
        is_published = true AND (
            school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()) OR
            school_id = '00000000-0000-0000-0000-000000000000'
        )
    );

DROP POLICY IF EXISTS "Teachers can manage own quizzes" ON public.quizzes;
CREATE POLICY "Teachers can manage own quizzes" ON public.quizzes
    FOR ALL
    TO authenticated
    USING (
        teacher_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

--------------------------------------------------------------------------------
-- 2. Quiz Questions Table
--------------------------------------------------------------------------------
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view questions for visible quizzes" ON public.quiz_questions;
CREATE POLICY "Students can view questions for visible quizzes" ON public.quiz_questions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.quizzes q
            WHERE q.id = quiz_questions.quiz_id
            AND (
                q.is_published = true AND (
                    q.school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()) OR
                    q.school_id = '00000000-0000-0000-0000-000000000000'
                )
            )
        ) OR
        EXISTS (
            SELECT 1 FROM public.quizzes q
            WHERE q.id = quiz_questions.quiz_id
            AND q.teacher_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Teachers can manage questions for own quizzes" ON public.quiz_questions;
CREATE POLICY "Teachers can manage questions for own quizzes" ON public.quiz_questions
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.quizzes q
            WHERE q.id = quiz_questions.quiz_id
            AND (q.teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
        )
    );

--------------------------------------------------------------------------------
-- 3. Quiz Submissions Table
--------------------------------------------------------------------------------
ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;

-- Add missing columns to match frontend
DO $$ 
BEGIN
  ALTER TABLE public.quiz_submissions ADD COLUMN IF NOT EXISTS total_questions INTEGER;
  ALTER TABLE public.quiz_submissions ADD COLUMN IF NOT EXISTS focus_violations INTEGER DEFAULT 0;
EXCEPTION
  WHEN others THEN NULL;
END $$;

DROP POLICY IF EXISTS "Students can submit own attempts" ON public.quiz_submissions;
CREATE POLICY "Students can submit own attempts" ON public.quiz_submissions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        student_id::text = (SELECT id::text FROM public.students WHERE user_id = auth.uid()) OR
        student_id::text = auth.uid()::text
    );

DROP POLICY IF EXISTS "Students can view own submissions" ON public.quiz_submissions;
CREATE POLICY "Students can view own submissions" ON public.quiz_submissions
    FOR SELECT
    TO authenticated
    USING (
        student_id::text = (SELECT id::text FROM public.students WHERE user_id = auth.uid()) OR
        student_id::text = auth.uid()::text
    );

DROP POLICY IF EXISTS "Teachers can view school submissions" ON public.quiz_submissions;
CREATE POLICY "Teachers can view school submissions" ON public.quiz_submissions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('teacher', 'admin')
            AND school_id = quiz_submissions.school_id
        )
    );

COMMIT;
