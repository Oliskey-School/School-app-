-- COMPREHENSIVE BACKEND SETUP AND RLS FIX SCRIPT
-- Run this in your Supabase SQL Editor to make all requested features fully functional and save to backend.

-- 1. Ensure `virtual_classes` table is correctly formatted and has RLS
CREATE TABLE IF NOT EXISTS public.virtual_classes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
    teacher_id uuid REFERENCES public.users(id),
    class_id uuid REFERENCES public.classes(id),
    subject_id uuid REFERENCES public.subjects(id),
    title text NOT NULL,
    topic text,
    scheduled_at timestamptz NOT NULL DEFAULT now(),
    duration_minutes integer,
    meeting_link text,
    meeting_platform text,
    status text DEFAULT 'Scheduled',
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.virtual_classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Demo Access virtual_classes" ON public.virtual_classes;
CREATE POLICY "Demo Access virtual_classes" ON public.virtual_classes FOR ALL TO anon, authenticated USING (is_demo_school(school_id)) WITH CHECK (is_demo_school(school_id));

-- 2. Ensure `assessments` and `questions` tables exist (Create Assessment)
CREATE TABLE IF NOT EXISTS public.assessments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
    teacher_id uuid REFERENCES public.users(id),
    class_id uuid REFERENCES public.classes(id),
    subject_id uuid REFERENCES public.subjects(id),
    title text NOT NULL,
    type text NOT NULL,
    total_marks integer DEFAULT 0,
    due_date timestamptz,
    status text DEFAULT 'Draft',
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Demo Access assessments" ON public.assessments;
CREATE POLICY "Demo Access assessments" ON public.assessments FOR ALL TO anon, authenticated USING (is_demo_school(school_id)) WITH CHECK (is_demo_school(school_id));

-- 3. Ensure `forum_topics` and `forum_posts` exist (Teacher Forum)
CREATE TABLE IF NOT EXISTS public.forum_topics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
    author_id uuid REFERENCES public.users(id),
    title text NOT NULL,
    content text,
    category text,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.forum_topics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Demo Access forum_topics" ON public.forum_topics;
CREATE POLICY "Demo Access forum_topics" ON public.forum_topics FOR ALL TO anon, authenticated USING (is_demo_school(school_id)) WITH CHECK (is_demo_school(school_id));

CREATE TABLE IF NOT EXISTS public.forum_posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id uuid REFERENCES public.forum_topics(id) ON DELETE CASCADE,
    author_id uuid REFERENCES public.users(id),
    content text NOT NULL,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Demo Access forum_posts" ON public.forum_posts;
CREATE POLICY "Demo Access forum_posts" ON public.forum_posts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. Ensure `appointments` exists (Appointments)
CREATE TABLE IF NOT EXISTS public.appointments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
    teacher_id uuid REFERENCES public.users(id),
    parent_id uuid REFERENCES public.users(id),
    student_id uuid REFERENCES public.students(id),
    date date NOT NULL,
    time text NOT NULL,
    reason text,
    status text DEFAULT 'Pending',
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Demo Access appointments" ON public.appointments;
CREATE POLICY "Demo Access appointments" ON public.appointments FOR ALL TO anon, authenticated USING (is_demo_school(school_id)) WITH CHECK (is_demo_school(school_id));

-- 5. Fix `lesson_notes` table to ensure the Frontend payload matches
ALTER TABLE public.lesson_notes ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
DROP POLICY IF EXISTS "Demo Access lesson_notes" ON public.lesson_notes;
CREATE POLICY "Demo Access lesson_notes" ON public.lesson_notes FOR ALL TO anon, authenticated USING (is_demo_school(school_id)) WITH CHECK (is_demo_school(school_id));

-- 6. Add title to assessments if it's missing (Based on PGRST204 error)
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS title text;

-- 7. Fix `report_cards` to allow seamless creation for Student Reports
ALTER TABLE public.report_cards ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
DROP POLICY IF EXISTS "Demo Access report_cards" ON public.report_cards;
CREATE POLICY "Demo Access report_cards" ON public.report_cards FOR ALL TO anon, authenticated USING (is_demo_school(school_id)) WITH CHECK (is_demo_school(school_id));

-- 8. Fix `exams`
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
DROP POLICY IF EXISTS "Demo Access exams" ON public.exams;
CREATE POLICY "Demo Access exams" ON public.exams FOR ALL TO anon, authenticated USING (is_demo_school(school_id)) WITH CHECK (is_demo_school(school_id));

-- 9. Fix `assignments` and `assignment_submissions`
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
DROP POLICY IF EXISTS "Demo Access assignments" ON public.assignments;
CREATE POLICY "Demo Access assignments" ON public.assignments FOR ALL TO anon, authenticated USING (is_demo_school(school_id)) WITH CHECK (is_demo_school(school_id));

ALTER TABLE public.assignment_submissions ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
DROP POLICY IF EXISTS "Demo Access assignment_submissions" ON public.assignment_submissions;
CREATE POLICY "Demo Access assignment_submissions" ON public.assignment_submissions FOR ALL TO anon, authenticated USING (is_demo_school(school_id)) WITH CHECK (is_demo_school(school_id));

-- Force refresh schema cache
NOTIFY pgrst, 'reload schema';
