-- Insert sample classes into the database
-- Run this in Supabase SQL Editor

INSERT INTO classes (id, subject, grade, section, department, student_count) VALUES
-- Primary School (Grades 1-6)
('pri-1a', 'General', 1, 'A', NULL, 25),
('pri-1b', 'General', 1, 'B', NULL, 24),
('pri-2a', 'General', 2, 'A', NULL, 28),
('pri-2b', 'General', 2, 'B', NULL, 26),
('pri-3a', 'General', 3, 'A', NULL, 30),
('pri-3b', 'General', 3, 'B', NULL, 27),
('pri-4a', 'General', 4, 'A', NULL, 25),
('pri-4b', 'General', 4, 'B', NULL, 28),
('pri-5a', 'General', 5, 'A', NULL, 26),
('pri-5b', 'General', 5, 'B', NULL, 24),
('pri-6a', 'General', 6, 'A', NULL, 30),
('pri-6b', 'General', 6, 'B', NULL, 29),

-- Junior Secondary (JSS 1-3 / Grades 7-9)
('jss-1a', 'General', 7, 'A', NULL, 32),
('jss-1b', 'General', 7, 'B', NULL, 30),
('jss-2a', 'General', 8, 'A', NULL, 28),
('jss-2b', 'General', 8, 'B', NULL, 31),
('jss-3a', 'General', 9, 'A', NULL, 25),
('jss-3b', 'General', 9, 'B', NULL, 27),

-- Senior Secondary (SSS 1-3 / Grades 10-12) with Departments
('sss-1a-sci', 'Science', 10, 'A', 'Science', 22),
('sss-1b-sci', 'Science', 10, 'B', 'Science', 24),
('sss-1a-com', 'Commercial', 10, 'A', 'Commercial', 20),
('sss-1a-art', 'Arts', 10, 'A', 'Arts', 18),
('sss-2a-sci', 'Science', 11, 'A', 'Science', 23),
('sss-2b-sci', 'Science', 11, 'B', 'Science', 21),
('sss-2a-com', 'Commercial', 11, 'A', 'Commercial', 19),
('sss-2a-art', 'Arts', 11, 'A', 'Arts', 17),
('sss-3a-sci', 'Science', 12, 'A', 'Science', 20),
('sss-3b-sci', 'Science', 12, 'B', 'Science', 22),
('sss-3a-com', 'Commercial', 12, 'A', 'Commercial', 18),
('sss-3a-art', 'Arts', 12, 'A', 'Arts', 16)
ON CONFLICT (id) DO NOTHING;

-- Verify the classes were added
SELECT * FROM classes ORDER BY grade, section;
