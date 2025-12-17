-- Fix PTA Meetings schema
ALTER TABLE pta_meetings ADD COLUMN IF NOT EXISTS time VARCHAR(20);
ALTER TABLE pta_meetings ADD COLUMN IF NOT EXISTS is_past BOOLEAN DEFAULT FALSE;

-- Fix Volunteering Opportunities schema
ALTER TABLE volunteering_opportunities ADD COLUMN IF NOT EXISTS spots_available INTEGER DEFAULT 10;
ALTER TABLE volunteering_opportunities ADD COLUMN IF NOT EXISTS spots_filled INTEGER DEFAULT 0;

-- Create learning_resources if missing
CREATE TABLE IF NOT EXISTS learning_resources (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  description TEXT,
  url TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- INSERT SAMPLE DATA
-- ==========================================

-- Learning Resources
-- Clear old entries to prevent duplicates
DELETE FROM learning_resources WHERE title IN ('Algebra Basics', 'Physics Mechanics Guide', 'Chemical Reactions');

INSERT INTO learning_resources (title, type, subject, description, url, thumbnail_url) VALUES
('Algebra Basics', 'Video', 'Mathematics', 'Introduction to Algebra concepts.', 'https://www.youtube.com/watch?v=NybHckSEQBI', 'https://img.youtube.com/vi/NybHckSEQBI/0.jpg'),
('Physics Mechanics Guide', 'PDF', 'Physics', 'Comprehensive guide to mechanics.', '#', 'https://via.placeholder.com/300x200?text=Physics+Guide'),
('Chemical Reactions', 'Video', 'Chemistry', 'Understanding chemical bonds.', '#', 'https://via.placeholder.com/300x200?text=Chemistry');

-- PTA Meetings
DELETE FROM pta_meetings WHERE title = 'Term 1 General Meeting';

INSERT INTO pta_meetings (title, date, time, agenda, is_past) VALUES
('Term 1 General Meeting', NOW() + INTERVAL '5 days', '10:00 AM', '[{"title": "Budget Review", "presenter": "Treasurer"}, {"title": "Principal Address", "presenter": "Principal"}]', false);

-- Volunteering
DELETE FROM volunteering_opportunities WHERE title IN ('Library Assistant', 'Sports Day Marshal');

INSERT INTO volunteering_opportunities (title, description, date, spots_available, spots_filled) VALUES
('Library Assistant', 'Help organize books in the library.', '2024-09-15', 5, 2),
('Sports Day Marshal', 'Assist with crowd control.', '2024-10-20', 10, 0);

-- School Policies
DELETE FROM school_policies WHERE title IN ('Code of Conduct', 'Anti-Bullying Policy', 'Uniform Policy');

INSERT INTO school_policies (title, description, url) VALUES
('Code of Conduct', 'Rules and regulations for all students.', '#'),
('Anti-Bullying Policy', 'Zero tolerance policy for bullying.', '#'),
('Uniform Policy', 'Guidelines for school uniforms.', '#');

-- Enable RLS (and then disable for dev simplicity)
ALTER TABLE learning_resources DISABLE ROW LEVEL SECURITY;
ALTER TABLE school_policies DISABLE ROW LEVEL SECURITY;
ALTER TABLE pta_meetings DISABLE ROW LEVEL SECURITY;
ALTER TABLE volunteering_opportunities DISABLE ROW LEVEL SECURITY;
