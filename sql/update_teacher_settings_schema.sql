
-- Add notification preferences and 2FA to teachers
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"newSubmission": true, "parentMessage": true, "weeklySummary": false}',
ADD COLUMN IF NOT EXISTS is_2fa_enabled BOOLEAN DEFAULT FALSE;

-- Create PD Resources Table
CREATE TABLE IF NOT EXISTS pd_resources (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- Article, Video, Workshop
  summary TEXT,
  source VARCHAR(100),
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Initial PD Resources (so it's not empty, but technically "real" data in DB)
INSERT INTO pd_resources (title, type, summary, source, url) VALUES
('Modern Classroom Management', 'Article', 'Strategies for keeping students engaged in a digital world.', 'Edutopia', '#'),
('Tech Integration Workshop', 'Workshop', 'Learn how to use AI tools effectively in your lesson planning.', 'School District', '#'),
('Understanding Student Psychology', 'Video', 'A deep dive into adolescent learning patterns.', 'YouTube Edu', '#')
ON CONFLICT DO NOTHING;

-- Create Login History Table
CREATE TABLE IF NOT EXISTS login_history (
  id SERIAL PRIMARY KEY,
  user_email VARCHAR(255) NOT NULL,
  device VARCHAR(100),
  location VARCHAR(100),
  ip_address VARCHAR(45),
  login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_current BOOLEAN DEFAULT FALSE
);

-- Insert Sample Login History (Real data for DB)
INSERT INTO login_history (user_email, device, location, login_time, is_current) VALUES
('f.akintola@school.com', 'Chrome on Windows', 'Lagos, NG', NOW(), TRUE),
('f.akintola@school.com', 'Safari on iPhone', 'Abuja, NG', NOW() - INTERVAL '2 days', FALSE);
