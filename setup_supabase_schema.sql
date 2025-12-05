-- ============================================
-- School Management System - Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE TABLES
-- ============================================

-- Students Table
CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  grade INTEGER NOT NULL,
  section VARCHAR(10) NOT NULL,
  department VARCHAR(50),
  attendance_status VARCHAR(20) DEFAULT 'Absent',
  birthday DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teachers Table
CREATE TABLE IF NOT EXISTS teachers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teacher Subjects (Many-to-Many)
CREATE TABLE IF NOT EXISTS teacher_subjects (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
  subject VARCHAR(100) NOT NULL,
  UNIQUE(teacher_id, subject)
);

-- Teacher Classes (Many-to-Many)
CREATE TABLE IF NOT EXISTS teacher_classes (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
  class_name VARCHAR(50) NOT NULL,
  UNIQUE(teacher_id, class_name)
);

-- Parents Table
CREATE TABLE IF NOT EXISTS parents (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Parent-Student Relationship
CREATE TABLE IF NOT EXISTS parent_children (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER REFERENCES parents(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  UNIQUE(parent_id, student_id)
);

-- Classes Table
CREATE TABLE IF NOT EXISTS classes (
  id VARCHAR(50) PRIMARY KEY,
  subject VARCHAR(100) NOT NULL,
  grade INTEGER NOT NULL,
  section VARCHAR(10) NOT NULL,
  department VARCHAR(50),
  student_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notices/Announcements
CREATE TABLE IF NOT EXISTS notices (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  category VARCHAR(50) NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  audience JSONB DEFAULT '[]',
  created_by VARCHAR(100)
);

-- Academic Performance
CREATE TABLE IF NOT EXISTS academic_performance (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  subject VARCHAR(100) NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  term VARCHAR(50) NOT NULL,
  session VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student Attendance
CREATE TABLE IF NOT EXISTS student_attendance (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, date)
);

-- Exams
CREATE TABLE IF NOT EXISTS exams (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  time VARCHAR(20) NOT NULL,
  class_name VARCHAR(50) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  is_published BOOLEAN DEFAULT FALSE,
  teacher_id INTEGER REFERENCES teachers(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student Fees
CREATE TABLE IF NOT EXISTS student_fees (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  total_fee DECIMAL(10, 2) NOT NULL,
  paid_amount DECIMAL(10, 2) DEFAULT 0,
  due_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'Unpaid',
  session VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_students_grade_section ON students(grade, section);
CREATE INDEX IF NOT EXISTS idx_student_attendance_date ON student_attendance(date);
CREATE INDEX IF NOT EXISTS idx_notices_timestamp ON notices(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_academic_performance_student ON academic_performance(student_id);

-- ============================================
-- ROW LEVEL SECURITY (Disabled for now)
-- ============================================

-- Disable RLS for easier development
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE teachers DISABLE ROW LEVEL SECURITY;
ALTER TABLE parents DISABLE ROW LEVEL SECURITY;
ALTER TABLE notices DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;

-- ============================================
-- SAMPLE DATA
-- ============================================

-- Insert sample students
INSERT INTO students (name, avatar_url, grade, section, department, birthday) VALUES
('Adebayo Oluwaseun', 'https://i.pravatar.cc/150?u=adebayo', 10, 'A', 'Science', '2008-05-15'),
('Chidinma Okafor', 'https://i.pravatar.cc/150?u=chidinma', 10, 'A', 'Science', '2008-08-20'),
('Musa Ibrahim', 'https://i.pravatar.cc/150?u=musa', 9, 'A', NULL, '2009-02-10'),
('Fatima Bello', 'https://i.pravatar.cc/150?u=fatima', 10, 'A', 'Science', '2008-11-05')
ON CONFLICT DO NOTHING;

-- Insert sample teachers
INSERT INTO teachers (name, avatar_url, email, phone) VALUES
('Mr. John Adeoye', 'https://i.pravatar.cc/150?u=teacher1', 'j.adeoye@school.com', '+2348012345678'),
('Mrs. Funke Akintola', 'https://i.pravatar.cc/150?u=teacher2', 'f.akintola@school.com', '+2348023456789')
ON CONFLICT (email) DO NOTHING;

-- Insert sample parents
INSERT INTO parents (name, email, phone, avatar_url) VALUES
('Mr. Adewale', 'adewale@example.com', '+2348034567890', 'https://i.pravatar.cc/150?u=parent1'),
('Mrs. Bello', 'bello@example.com', '+2348045678901', 'https://i.pravatar.cc/150?u=parent2')
ON CONFLICT (email) DO NOTHING;

-- Insert sample notices
INSERT INTO notices (title, content, category, is_pinned, audience) VALUES
('Mid-Term Break', 'The school will be on mid-term break from Thursday 25th to Friday 26th.', 'Holiday', true, '["all"]'),
('Inter-House Sports', 'Inter-house sports competition coming up next week!', 'Event', false, '["all"]')
ON CONFLICT DO NOTHING;

-- Insert sample classes
INSERT INTO classes (id, subject, grade, section, department, student_count) VALUES
('1', 'General', 9, 'A', NULL, 25),
('2', 'General', 9, 'B', NULL, 24),
('3', 'Science', 10, 'A', 'Science', 20),
('4', 'Arts', 10, 'B', 'Arts', 22)
ON CONFLICT DO NOTHING;
