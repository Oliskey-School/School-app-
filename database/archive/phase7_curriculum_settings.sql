-- Phase 7: Curriculum Configuration & Teacher Eligibility Schema

-- Table: grading_systems
-- Defines the grading logic (e.g., WAEC WASSCE, Cambridge IGCSE, A-Level)
CREATE TABLE IF NOT EXISTS public.grading_systems (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL, -- e.g., 'WAEC WASSCE', 'Cambridge IGCSE'
    type TEXT NOT NULL CHECK (type IN ('NIGERIAN', 'BRITISH', 'HYBRID')),
    description TEXT,
    grade_scale JSONB NOT NULL, -- e.g., [{"grade": "A1", "min": 75, "max": 100, "points": 4.0}, ...]
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: curriculum_templates
-- "Golden Standard" templates that schools copy/reference. READ-ONLY for schools.
CREATE TABLE IF NOT EXISTS public.curriculum_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE, -- 'NIGERIAN_BASIC', 'BRITISH_IGCSE'
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('NIGERIAN', 'BRITISH')),
    default_grading_system_id UUID REFERENCES public.grading_systems(id),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: template_subjects
-- Default subjects associated with a curriculum template.
CREATE TABLE IF NOT EXISTS public.template_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES public.curriculum_templates(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'Science', 'Arts', 'Core'
    is_compulsory BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: teacher_eligibility
-- Tracks which curricula a teacher is qualified to teach.
DROP TABLE IF EXISTS public.teacher_eligibility CASCADE;
CREATE TABLE IF NOT EXISTS public.teacher_eligibility (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id BIGINT REFERENCES public.teachers(id) ON DELETE CASCADE,
    curriculum_category TEXT NOT NULL CHECK (curriculum_category IN ('NIGERIAN', 'BRITISH')),
    is_verified BOOLEAN DEFAULT false,
    verification_doc_url TEXT,
    verified_by BIGINT REFERENCES public.users(id), -- Admin who verified (users.id is Integer)
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(teacher_id, curriculum_category)
);

-- SEED DATA: Grading Systems
INSERT INTO public.grading_systems (name, type, grade_scale)
VALUES
(
    'WAEC WASSCE', 
    'NIGERIAN', 
    '[
        {"grade": "A1", "min": 75, "max": 100, "remark": "Excellent"},
        {"grade": "B2", "min": 70, "max": 74, "remark": "Very Good"},
        {"grade": "B3", "min": 65, "max": 69, "remark": "Good"},
        {"grade": "C4", "min": 60, "max": 64, "remark": "Credit"},
        {"grade": "C5", "min": 55, "max": 59, "remark": "Credit"},
        {"grade": "C6", "min": 50, "max": 54, "remark": "Credit"},
        {"grade": "D7", "min": 45, "max": 49, "remark": "Pass"},
        {"grade": "E8", "min": 40, "max": 44, "remark": "Pass"},
        {"grade": "F9", "min": 0, "max": 39, "remark": "Fail"}
    ]'::jsonb
) ON CONFLICT DO NOTHING;

INSERT INTO public.grading_systems (name, type, grade_scale)
VALUES
(
    'Cambridge IGCSE', 
    'BRITISH', 
    '[
        {"grade": "A*", "min": 90, "max": 100, "remark": "Outstanding"},
        {"grade": "A", "min": 80, "max": 89, "remark": "Excellent"},
        {"grade": "B", "min": 70, "max": 79, "remark": "Very Good"},
        {"grade": "C", "min": 60, "max": 69, "remark": "Good"},
        {"grade": "D", "min": 50, "max": 59, "remark": "Pass"},
        {"grade": "E", "min": 40, "max": 49, "remark": "Pass"},
        {"grade": "F", "min": 30, "max": 39, "remark": "Weak"},
        {"grade": "G", "min": 20, "max": 29, "remark": "Very Weak"},
        {"grade": "U", "min": 0, "max": 19, "remark": "Ungraded"}
    ]'::jsonb
) ON CONFLICT DO NOTHING;

-- SEED DATA: Curriculum Templates
INSERT INTO public.curriculum_templates (code, name, category)
VALUES 
('NIGERIAN_SEC', 'Nigerian Secondary (JSS/SSS)', 'NIGERIAN'),
('BRITISH_IGCSE', 'British Curriculum (IGCSE)', 'BRITISH')
ON CONFLICT (code) DO NOTHING;

-- SEED DATA: Template Subjects (Nigerian)
WITH template AS (SELECT id FROM public.curriculum_templates WHERE code = 'NIGERIAN_SEC')
INSERT INTO public.template_subjects (template_id, name, category, is_compulsory)
SELECT id, unnest(ARRAY['Mathematics', 'English Language', 'Civic Education', 'Biology', 'Economics']), 'Core', true
FROM template
ON CONFLICT DO NOTHING;

WITH template AS (SELECT id FROM public.curriculum_templates WHERE code = 'NIGERIAN_SEC')
INSERT INTO public.template_subjects (template_id, name, category, is_compulsory)
SELECT id, unnest(ARRAY['Chemistry', 'Physics', 'Literature in English', 'Government', 'Create Arts']), 'Elective', false
FROM template
ON CONFLICT DO NOTHING;

-- SEED DATA: Template Subjects (British)
WITH template AS (SELECT id FROM public.curriculum_templates WHERE code = 'BRITISH_IGCSE')
INSERT INTO public.template_subjects (template_id, name, category, is_compulsory)
SELECT id, unnest(ARRAY['Mathematics (0580)', 'English - First Language (0500)', 'Biology (0610)', 'Chemistry (0620)', 'Physics (0625)']), 'Core', true
FROM template
ON CONFLICT DO NOTHING;

-- RLS Policies
ALTER TABLE public.curriculum_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_eligibility ENABLE ROW LEVEL SECURITY;

-- Everyone can read templates/grading systems
CREATE POLICY "Everyone can read curriculum templates" ON public.curriculum_templates FOR SELECT USING (true);
CREATE POLICY "Everyone can read template subjects" ON public.template_subjects FOR SELECT USING (true);
CREATE POLICY "Everyone can read grading systems" ON public.grading_systems FOR SELECT USING (true);

-- Teacher Eligibility:
-- Admins can do everything (Check public.profiles for role, as public.users.id is incompatible with auth.uid())
CREATE POLICY "Admins full access to teacher_eligibility" ON public.teacher_eligibility FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role ILIKE 'admin'
  )
);
-- Teachers can view their own
CREATE POLICY "Teachers view own eligibility" ON public.teacher_eligibility FOR SELECT USING (
    teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
);
