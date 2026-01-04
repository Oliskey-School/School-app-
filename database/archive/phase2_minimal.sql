-- Phase 2 Schema: Ultra-Minimal Version
-- Just table creation, nothing else

-- Drop existing tables if they exist (to start clean)
DROP TABLE IF EXISTS quiz_submissions CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;
DROP TABLE IF EXISTS resources CASCADE;

-- 1. Resources Table
CREATE TABLE resources (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade INTEGER,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  language TEXT DEFAULT 'English',
  curriculum_tags TEXT[],
  teacher_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_public BOOLEAN DEFAULT TRUE
);

-- 2. Quizzes Table
CREATE TABLE quizzes (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  grade INTEGER,
  teacher_id BIGINT,
  duration_minutes INTEGER,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Questions Table
CREATE TABLE questions (
  id BIGSERIAL PRIMARY KEY,
  quiz_id BIGINT,
  text TEXT NOT NULL,
  type TEXT NOT NULL,
  options JSONB,
  points INTEGER DEFAULT 1,
  image_url TEXT
);

-- 4. Quiz Submissions Table
CREATE TABLE quiz_submissions (
  id BIGSERIAL PRIMARY KEY,
  quiz_id BIGINT,
  student_id BIGINT,
  answers JSONB,
  score INTEGER,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'Pending'
);
