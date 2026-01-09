-- ============================================================================
-- Phase 7: Multi-Curriculum & Compliance Architecture
-- ============================================================================

-- 1. SCHOOL PROFILE & COMPLIANCE
CREATE TABLE IF NOT EXISTS schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    state TEXT,
    lga TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    logo_url TEXT,
    established_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS school_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id),
    document_type TEXT CHECK (document_type IN ('CAC', 'FireSafety', 'MinistryApproval', 'BuildingPlan')),
    file_url TEXT, -- Nullable until uploaded
    expiry_date DATE,
    verification_status TEXT DEFAULT 'Pending' CHECK (verification_status IN ('Pending', 'Verified', 'Rejected')),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CURRICULUM CONFIGURATION
CREATE TABLE IF NOT EXISTS curricula (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL, -- 'NIGERIAN', 'BRITISH'
    name TEXT NOT NULL, -- 'Nigerian Basic Education', 'British Cambridge'
    description TEXT,
    grading_system_config JSONB, -- Stores the A*-G or CA+Exam logic
    is_active BOOLEAN DEFAULT TRUE
);

-- 3. ACADEMIC TRACKS ( The Core Pivot )
CREATE TABLE IF NOT EXISTS academic_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id BIGINT REFERENCES students(id) ON DELETE CASCADE, -- Link to existing students
    curriculum_id UUID REFERENCES curricula(id),
    level TEXT NOT NULL, -- 'JSS1', 'Year 7', 'IGCSE', etc.
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Paused', 'Completed')),
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, curriculum_id) -- Prevent duplicate active tracks for same curriculum
);

-- 4. CURRICULUM-SPECIFIC SUBJECTS
-- We need to decouple 'subject' from just a text field in existing tables
CREATE TABLE IF NOT EXISTS curriculum_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curriculum_id UUID REFERENCES curricula(id),
    name TEXT NOT NULL, -- 'Mathematics', 'Numeracy'
    code TEXT, -- 'MTH101', '0580' (IGCSE Math)
    is_compulsory BOOLEAN DEFAULT TRUE,
    category TEXT -- 'Science', 'Arts', 'Core'
);

-- 5. INSPECTIONS
CREATE TABLE IF NOT EXISTS inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id),
    inspector_name TEXT,
    scheduled_date DATE,
    status TEXT DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Ongoing', 'Completed', 'Flagged')),
    report_url TEXT,
    findings JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TEACHER QUALIFICATIONS (Strict)
CREATE TABLE IF NOT EXISTS teacher_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id BIGINT REFERENCES teachers(id), -- Link to existing teachers
    certification_type TEXT CHECK (certification_type IN ('TRCN', 'NCE', 'B.Ed', 'PGDE', 'QTS', 'IGCSE_Cert')),
    document_url TEXT,
    verification_status TEXT DEFAULT 'Pending',
    verified_by UUID REFERENCES auth.users(id),
    expiry_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Eligibility Mapping
CREATE TABLE IF NOT EXISTS teacher_eligibility (
    teacher_id BIGINT REFERENCES teachers(id),
    curriculum_id UUID REFERENCES curricula(id),
    status TEXT DEFAULT 'Probation',
    PRIMARY KEY (teacher_id, curriculum_id)
);

-- SEED DATA: Initialize Curricula (skip if already exists)
INSERT INTO curricula (code, name, description) VALUES
('NIGERIAN', 'Nigerian National Curriculum', 'Standard NERDC curriculum for Basic and Secondary education.'),
('BRITISH', 'British National Curriculum', 'Cambridge/Pearson Edexcel curriculum including IGCSE and A-Levels.')
ON CONFLICT (code) DO NOTHING;
