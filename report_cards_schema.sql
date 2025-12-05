-- ============================================
-- REPORT CARDS TABLE
-- Run this to add report cards functionality
-- ============================================

CREATE TABLE report_cards (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  session VARCHAR(20) NOT NULL,
  term VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'Draft',
  class_teacher_comment TEXT,
  principal_comment TEXT,
  grade_average DECIMAL(5, 2),
  position INTEGER,
  total_students INTEGER,
  attendance_percentage DECIMAL(5, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- Disable RLS for development
ALTER TABLE report_cards DISABLE ROW LEVEL SECURITY;

-- Create an index for better performance
CREATE INDEX idx_report_cards_student_id ON report_cards(student_id);
CREATE INDEX idx_report_cards_status ON report_cards(status);
CREATE INDEX idx_report_cards_session_term ON report_cards(session, term);

-- Sample data (optional - for testing)
-- INSERT INTO report_cards (student_id, session, term, status, class_teacher_comment, principal_comment, grade_average, position, total_students, attendance_percentage) 
-- VALUES 
-- (1, '2024/2025', 'First Term', 'Submitted', 'Good performance', 'Keep it up', 85.5, 5, 30, 95.0),
-- (2, '2024/2025', 'First Term', 'Draft', 'Needs improvement', 'Work harder', 72.0, 15, 30, 88.0);
