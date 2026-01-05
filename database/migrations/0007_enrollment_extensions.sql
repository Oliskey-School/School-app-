-- Phase 7: Steps 6-10 Schema Updates
-- Covers: Enrollment, Classes, Attendance, Reports, Exams

-- ============================================================================
-- STEP 7: CLASS & SUBJECT MANAGEMENT UPDATES
-- ============================================================================

-- 1. Link Classes to Curricula
-- A class must belong to a specific curriculum (e.g., "JSS1 A" is Nigerian, "Year 7 Alpha" is British)
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS curriculum_id UUID REFERENCES public.curricula(id),
ADD COLUMN IF NOT EXISTS academic_level TEXT; -- e.g., 'JSS1', 'Year 7'

-- 2. Link Subjects to Curriculum-Specific Templates
-- Migrating from loose text 'subject' to strict foreign key
ALTER TABLE public.subjects
ADD COLUMN IF NOT EXISTS curriculum_subject_id UUID REFERENCES public.template_subjects(id);

-- ============================================================================
-- STEP 8: ATTENDANCE & TRACKING
-- ============================================================================

-- 1. Track-Based Attendance
-- We need to know WHICH track the student attended. 
-- e.g., A dual student might attend 'Nigerian Math' but skip 'British English' on the same day.
ALTER TABLE public.attendance
ADD COLUMN IF NOT EXISTS academic_track_id UUID REFERENCES public.academic_tracks(id);

-- ============================================================================
-- STEP 9: ASSESSMENTS & REPORT CARDS
-- ============================================================================

-- 1. Report Card Templates
CREATE TABLE IF NOT EXISTS public.report_card_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    curriculum_id UUID REFERENCES public.curricula(id),
    name TEXT NOT NULL, -- "Nigerian JSS Termly", "Cambridge Semester"
    structure JSONB, -- Defines sections: "Continuous Assessment (40%)", "Exam (60%)"
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Student Report Cards (Updated)
ALTER TABLE public.report_cards
ADD COLUMN IF NOT EXISTS academic_track_id UUID REFERENCES public.academic_tracks(id),
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.report_card_templates(id);

-- ============================================================================
-- STEP 10: EXAM MANAGEMENT
-- ============================================================================

-- 1. External Exam Bodies
CREATE TABLE IF NOT EXISTS public.exam_bodies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL, -- 'WAEC', 'NECO', 'CAMBRIDGE', 'EDEXCEL'
    code TEXT,
    country TEXT,
    website TEXT
);

-- 2. Exam Candidates (Registration)
CREATE TABLE IF NOT EXISTS public.exam_candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id BIGINT REFERENCES public.students(id),
    exam_body_id UUID REFERENCES public.exam_bodies(id),
    candidate_number TEXT,
    center_number TEXT,
    registration_year INTEGER,
    status TEXT DEFAULT 'Registered' CHECK (status IN ('Registered', 'Withdrawn', 'ResultPending', 'ResultReleased')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, exam_body_id, registration_year)
);

-- SEED DATA: Exam Bodies
-- MOVED TO 0013_exams_logic_refinement.sql to avoid conflicts and ensure correct codes
/*
INSERT INTO public.exam_bodies (name, code, country) VALUES
('WAEC', 'WASSCE', 'Nigeria'),
('NECO', 'NECO', 'Nigeria'),
('Cambridge Assessment', 'CIE', 'UK'),
('Pearson Edexcel', 'EDEXCEL', 'UK')
ON CONFLICT (name) DO NOTHING;
*/

-- SEED DATA: Report Card Templates (Basic)
-- Note: Requires IDs from production, so we fetch dynamically or rely on logic.
-- Placeholder insert:
INSERT INTO public.report_card_templates (name, structure) VALUES
('Standard Nigerian Termly', '{"sections": ["CA", "Exam"], "weights": {"CA": 40, "Exam": 60}}'),
('British Cambridge Standard', '{"sections": ["Coursework", "Final"], "weights": {"Coursework": 20, "Final": 80}}');

-- ============================================================================
-- MIGRATION HELPERS
-- ============================================================================

-- Helper to auto-assign academic tracks for existing students (Fallback)
-- If a student has no track, create a default 'Nigerian' track.
DO $$
DECLARE
    r_student RECORD;
    v_nig_curriculum_id UUID;
BEGIN
    -- Get Nigerian Curriculum ID
    SELECT id INTO v_nig_curriculum_id FROM public.curricula WHERE code = 'NIGERIAN' LIMIT 1;

    IF v_nig_curriculum_id IS NOT NULL THEN
        -- Fix: Students table does not have class_id, uses grade/section
        FOR r_student IN SELECT id FROM public.students LOOP
            -- Check if track exists
            IF NOT EXISTS (SELECT 1 FROM public.academic_tracks WHERE student_id = r_student.id) THEN
                INSERT INTO public.academic_tracks (student_id, curriculum_id, level, status)
                VALUES (r_student.id, v_nig_curriculum_id, 'Basic', 'Active');
            END IF;
        END LOOP;
    END IF;
END $$;
