-- DROP TABLES TO FIX MIGRATION CONFLICTS (UUID vs BIGINT)
DROP TABLE IF EXISTS cbt_results CASCADE;
DROP TABLE IF EXISTS cbt_questions CASCADE;
DROP TABLE IF EXISTS cbt_exams CASCADE;
DROP TABLE IF EXISTS lesson_notes CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS curricula CASCADE;
DROP TABLE IF EXISTS schools CASCADE;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. SCHOOLS (Multi-Tenancy)
CREATE TABLE IF NOT EXISTS schools (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add school_id to existing tables (Optional migration step, enabling multi-school support)
-- For now, we will just ensure the column exists, likely nullable for backward compatibility
ALTER TABLE students ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
ALTER TABLE classes ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);

-- 2. CURRICULA
CREATE TABLE IF NOT EXISTS curricula (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE, -- Added UNIQUE to help with conflict handling
    code TEXT UNIQUE, -- Added UNIQUE for code as well
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link Classes to Curriculum
ALTER TABLE classes ADD COLUMN IF NOT EXISTS curriculum_id UUID REFERENCES curricula(id);

-- 3. SUBJECTS (Curriculum Specific)
CREATE TABLE IF NOT EXISTS subjects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT, -- e.g., 'MTH101'
    category TEXT, -- e.g., 'Core', 'Science', 'Arts', 'Play-Based'
    curriculum_id UUID REFERENCES curricula(id) ON DELETE CASCADE,
    grade_level TEXT, -- e.g., 'JSS1', 'Year 7', 'Nusaery 1'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    school_id UUID REFERENCES schools(id) -- Optional override/custom subject
);

-- 4. LESSON NOTES
CREATE TABLE IF NOT EXISTS lesson_notes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    teacher_id BIGINT REFERENCES teachers(id) ON DELETE CASCADE, -- Assuming teachers.id is BIGINT
    subject_id UUID REFERENCES subjects(id),
    class_id BIGINT REFERENCES classes(id), -- Assuming classes.id is BIGINT
    week INT NOT NULL,
    term TEXT NOT NULL, -- e.g., 'First Term'
    title TEXT NOT NULL,
    content TEXT, -- Rich text or markdown
    file_url TEXT, -- Uploaded PDF/Doc
    status TEXT DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    admin_feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CBT EXAMS (Mapped to Subjects)
CREATE TABLE IF NOT EXISTS cbt_exams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    subject_id UUID REFERENCES subjects(id),
    class_grade TEXT, -- e.g., 'JSS1' (Target audience)
    curriculum_id UUID REFERENCES curricula(id),
    duration_minutes INT DEFAULT 60,
    total_questions INT DEFAULT 0,
    is_published BOOLEAN DEFAULT FALSE,
    teacher_id BIGINT REFERENCES teachers(id), -- Creator
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CBT QUESTIONS
CREATE TABLE IF NOT EXISTS cbt_questions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    exam_id UUID REFERENCES cbt_exams(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'multiple_choice', -- 'multiple_choice', 'true_false', 'theory'
    options JSONB, -- Array of strings e.g. ["Option A", "Option B"]
    correct_option TEXT, -- The correct answer string or index
    points INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. CBT RESULTS
CREATE TABLE IF NOT EXISTS cbt_results (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    exam_id UUID REFERENCES cbt_exams(id) ON DELETE CASCADE,
    student_id BIGINT REFERENCES students(id) ON DELETE CASCADE, -- Assuming students.id is BIGINT
    score DECIMAL(5,2),
    total_score DECIMAL(5,2),
    percentage DECIMAL(5,2),
    answers JSONB, -- Store student answers { questionId: answer }
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS POLICIES (Basic placeholders - Assuming public for now or authenticated)
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE curricula ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbt_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbt_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbt_results ENABLE ROW LEVEL SECURITY;

-- Creating simple policies for access (adjust based on real auth needs)
CREATE POLICY "Public read access for curricula" ON curricula FOR SELECT USING (true);
CREATE POLICY "Public read access for subjects" ON subjects FOR SELECT USING (true);

-- Allow authenticated to read all for now (development mode style)
CREATE POLICY "Auth read all" ON schools FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth read lesson notes" ON lesson_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers insert lesson notes" ON lesson_notes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth read cbt" ON cbt_exams FOR SELECT TO authenticated USING (true);
