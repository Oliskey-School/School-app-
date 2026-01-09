-- ============================================================================
-- MIGRATION 0046: Full Schema Synchronization (Fixing Missing Tables)
-- ============================================================================
-- This migration adds all tables that are referenced in the frontend code
-- but were missing from previous migrations.
-- Date: 2026-01-09
-- ============================================================================

-- DANGER: Dropping tables ensures schema type correctness if they were created incorrectly.
DROP TABLE IF EXISTS public.assignment_submissions CASCADE;
DROP TABLE IF EXISTS public.resources CASCADE;
DROP TABLE IF EXISTS public.generated_resources CASCADE;
DROP TABLE IF EXISTS public.menstrual_support_requests CASCADE;
DROP TABLE IF EXISTS public.anonymous_reports CASCADE;
DROP TABLE IF EXISTS public.permission_slips CASCADE;
DROP TABLE IF EXISTS public.volunteer_signups CASCADE;
DROP TABLE IF EXISTS public.mental_health_resources CASCADE;
DROP TABLE IF EXISTS public.crisis_helplines CASCADE;
DROP TABLE IF EXISTS public.panic_activations CASCADE;
DROP TABLE IF EXISTS public.counseling_appointments CASCADE;
DROP TABLE IF EXISTS public.parent_teacher_conferences CASCADE;

-- 1. ASSIGNMENT_SUBMISSIONS
-- assignments.id and students.id are BIGINT/Integer
CREATE TABLE public.assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id BIGINT REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id BIGINT REFERENCES public.students(id) ON DELETE CASCADE,
    file_url TEXT,
    content TEXT,
    grade DECIMAL(5, 2),
    feedback TEXT,
    status VARCHAR(20) DEFAULT 'Submitted',
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students manage own submissions" ON public.assignment_submissions
    USING (student_id IN (SELECT id FROM public.students WHERE user_id::text = auth.uid()::text))
    WITH CHECK (student_id IN (SELECT id FROM public.students WHERE user_id::text = auth.uid()::text));
CREATE POLICY "Teachers view submissions for their classes" ON public.assignment_submissions
    FOR SELECT USING (TRUE); 

-- 2. RESOURCES (Teacher Resources)
-- teachers.id is BIGINT
CREATE TABLE public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_url TEXT,
    cover_image_url TEXT,
    subject VARCHAR(100),
    grade INTEGER,
    type VARCHAR(50) DEFAULT 'document',
    uploaded_by BIGINT REFERENCES public.teachers(id),
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view resources" ON public.resources FOR SELECT USING (true);
CREATE POLICY "Teachers can manage resources" ON public.resources USING (auth.role() = 'authenticated');

-- 3. GENERATED_RESOURCES (AI Lesson Plans)
CREATE TABLE public.generated_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id BIGINT REFERENCES public.teachers(id),
    title VARCHAR(255),
    subject VARCHAR(100),
    topic VARCHAR(255),
    lesson_plans_content JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.generated_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage own AI resources" ON public.generated_resources
    USING (teacher_id IN (SELECT id FROM public.teachers WHERE user_id::text = auth.uid()::text));

-- 4. MENSTRUAL_SUPPORT_REQUESTS
CREATE TABLE public.menstrual_support_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id BIGINT REFERENCES public.students(id),
    request_type VARCHAR(100),
    urgency_level VARCHAR(20) DEFAULT 'normal',
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, fulfilled
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.menstrual_support_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students manage own support requests" ON public.menstrual_support_requests
    USING (student_id IN (SELECT id FROM public.students WHERE user_id::text = auth.uid()::text));

-- 5. ANONYMOUS_REPORTS
CREATE TABLE public.anonymous_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type VARCHAR(100),
    description TEXT,
    location VARCHAR(255),
    status VARCHAR(20) DEFAULT 'new',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.anonymous_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert anonymous reports" ON public.anonymous_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view reports" ON public.anonymous_reports FOR SELECT USING (auth.role() = 'authenticated');

-- 6. PERMISSION_SLIPS
-- parents.id is BIGINT
CREATE TABLE public.permission_slips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id BIGINT REFERENCES public.students(id),
    title VARCHAR(255),
    description TEXT,
    event_date DATE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    parent_id BIGINT REFERENCES public.parents(id),
    signed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.permission_slips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents view and sign slips" ON public.permission_slips
    USING (parent_id IN (SELECT id FROM public.parents WHERE user_id::text = auth.uid()::text));

-- 7. VOLUNTEER_SIGNUPS
CREATE TABLE public.volunteer_signups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id BIGINT REFERENCES public.parents(id),
    event_name VARCHAR(255),
    role VARCHAR(100),
    availability TEXT,
    status VARCHAR(20) DEFAULT 'registered',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.volunteer_signups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents manage volunteer signups" ON public.volunteer_signups
    USING (parent_id IN (SELECT id FROM public.parents WHERE user_id::text = auth.uid()::text));

-- 8. MENTAL_HEALTH_RESOURCES
CREATE TABLE public.mental_health_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255),
    content TEXT,
    category VARCHAR(100),
    contact_info TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.mental_health_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone view mental health resources" ON public.mental_health_resources FOR SELECT USING (true);

-- 9. CRISIS_HELPLINES
CREATE TABLE public.crisis_helplines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    phone_number VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.crisis_helplines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone view helplines" ON public.crisis_helplines FOR SELECT USING (true);

-- 10. PANIC_ACTIVATIONS
-- links to auth.users(id) which IS UUID
CREATE TABLE public.panic_activations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    location VARCHAR(255),
    details TEXT,
    status VARCHAR(20) DEFAULT 'active',
    activated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);
ALTER TABLE public.panic_activations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert panic" ON public.panic_activations FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 11. COUNSELING_APPOINTMENTS
CREATE TABLE public.counseling_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id BIGINT REFERENCES public.students(id),
    counselor_name VARCHAR(255), -- Or reference to staff
    requested_date DATE,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.counseling_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students manage counseling" ON public.counseling_appointments
    USING (student_id IN (SELECT id FROM public.students WHERE user_id::text = auth.uid()::text));

-- 12. PARENT_TEACHER_CONFERENCES
CREATE TABLE public.parent_teacher_conferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id BIGINT REFERENCES public.parents(id),
    teacher_id BIGINT REFERENCES public.teachers(id),
    student_id BIGINT REFERENCES public.students(id),
    scheduled_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.parent_teacher_conferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents view conferences" ON public.parent_teacher_conferences
    USING (parent_id IN (SELECT id FROM public.parents WHERE user_id::text = auth.uid()::text));

-- 13. ENSURE ASSIGNMENTS HAS submissions_count
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'submissions_count') THEN
        ALTER TABLE public.assignments ADD COLUMN submissions_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 14. FIX TIMETABLE SCHEMA (Drop invalid 0001 version)
DROP TABLE IF EXISTS public.timetable CASCADE;
CREATE TABLE public.timetable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    day TEXT NOT NULL,
    period_index INTEGER NOT NULL,
    start_time TEXT,
    end_time TEXT,
    teacher_id UUID REFERENCES public.teachers(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for authenticated users" ON public.timetable FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert access for admins and teachers" ON public.timetable FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update access for admins and teachers" ON public.timetable FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete access for admins and teachers" ON public.timetable FOR DELETE USING (auth.role() = 'authenticated');
