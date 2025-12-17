-- Create Learning Resources Table
CREATE TABLE IF NOT EXISTS learning_resources (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'Video', 'PDF', etc.
  subject VARCHAR(100) NOT NULL,
  description TEXT,
  url TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create School Policies Table
CREATE TABLE IF NOT EXISTS school_policies (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  url TEXT, -- Link to PDF/Doc
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create PTA Meetings Table
CREATE TABLE IF NOT EXISTS pta_meetings (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  time VARCHAR(20) NOT NULL,
  agenda JSONB, -- Array of objects {title, presenter}
  is_past BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Volunteering Opportunities Table
CREATE TABLE IF NOT EXISTS volunteering_opportunities (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date DATE,
  spots_available INTEGER DEFAULT 0,
  spots_filled INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Sample Data for Learning Resources
INSERT INTO learning_resources (title, type, subject, description, url, thumbnail_url) VALUES
('Algebra Basics', 'Video', 'Mathematics', 'Introduction to Algebra concepts.', 'https://www.youtube.com/watch?v=NybHckSEQBI', 'https://img.youtube.com/vi/NybHckSEQBI/0.jpg'),
('Physics Mechanics Guide', 'PDF', 'Physics', 'Comprehensive guide to mechanics.', '#', 'https://via.placeholder.com/300x200?text=Physics+Guide'),
('Chemical Reactions', 'Video', 'Chemistry', 'Understanding chemical bonds.', '#', 'https://via.placeholder.com/300x200?text=Chemistry');

-- Insert Sample Data for School Policies
INSERT INTO school_policies (title, description, url) VALUES
('Code of Conduct', 'Rules and regulations for all students.', '#'),
('Anti-Bullying Policy', 'Zero tolerance policy for bullying.', '#'),
('Uniform Policy', 'Guidelines for school uniforms.', '#');

-- Insert Sample Data for PTA Meetings
INSERT INTO pta_meetings (title, date, time, agenda, is_past) VALUES
('Term 1 General Meeting', '2024-09-10', '10:00 AM', '[{"title": "Budget Review", "presenter": "Treasurer"}, {"title": "Principal Address", "presenter": "Principal"}]', false);

-- Insert Sample Data for Volunteering
INSERT INTO volunteering_opportunities (title, description, date, spots_available, spots_filled) VALUES
('Library Assistant', 'Help organize books in the library.', '2024-09-15', 5, 2),
('Sports Day Marshal', 'Assist with crowd control.', '2024-10-20', 10, 0);

-- Enable RLS (and then disable for dev simplicity if consistent with other schema)
ALTER TABLE learning_resources DISABLE ROW LEVEL SECURITY;
ALTER TABLE school_policies DISABLE ROW LEVEL SECURITY;
ALTER TABLE pta_meetings DISABLE ROW LEVEL SECURITY;
ALTER TABLE volunteering_opportunities DISABLE ROW LEVEL SECURITY;
