-- ============================================
-- MASTER SCHEMA FOR SCHOOL MANAGEMENT SYSTEM
-- Covers ALL functionality: Academics, Transport, Store, Chat, CBT, Library, Auth, Gamification, etc.
-- ============================================

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. CLEANUP (Drop existing tables to prevent conflicts)
-- ============================================
DROP TABLE IF EXISTS report_cards CASCADE;
DROP TABLE IF EXISTS fee_payments CASCADE;
DROP TABLE IF EXISTS generated_resources CASCADE;
DROP TABLE IF EXISTS pd_resources CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS complaints CASCADE;
DROP TABLE IF EXISTS behavior_records CASCADE;
DROP TABLE IF EXISTS awards CASCADE;
DROP TABLE IF EXISTS certificates CASCADE;
DROP TABLE IF EXISTS badges CASCADE;
DROP TABLE IF EXISTS lesson_plans CASCADE;
DROP TABLE IF EXISTS ai_games CASCADE;
DROP TABLE IF EXISTS permission_slips CASCADE;
DROP TABLE IF EXISTS volunteering_opportunities CASCADE;
DROP TABLE IF EXISTS school_policies CASCADE;
DROP TABLE IF EXISTS pta_meetings CASCADE;
DROP TABLE IF EXISTS extracurricular_activities CASCADE;
DROP TABLE IF EXISTS calendar_events CASCADE;
DROP TABLE IF EXISTS cbt_results CASCADE;
DROP TABLE IF EXISTS cbt_questions CASCADE;
DROP TABLE IF EXISTS cbt_tests CASCADE;
DROP TABLE IF EXISTS digital_resources CASCADE;
DROP TABLE IF EXISTS books CASCADE;
DROP TABLE IF EXISTS email_logs CASCADE;
DROP TABLE IF EXISTS auth_accounts CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS forum_posts CASCADE;
DROP TABLE IF EXISTS forum_topics CASCADE;
DROP TABLE IF EXISTS store_orders CASCADE;
DROP TABLE IF EXISTS store_products CASCADE;
DROP TABLE IF EXISTS bus_roster CASCADE;
DROP TABLE IF EXISTS pickup_points CASCADE;
DROP TABLE IF EXISTS bus_routes CASCADE;
DROP TABLE IF EXISTS drivers CASCADE;
DROP TABLE IF EXISTS health_logs CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS timetable CASCADE;
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS student_fees CASCADE;
DROP TABLE IF EXISTS exams CASCADE;
DROP TABLE IF EXISTS academic_performance CASCADE;
DROP TABLE IF EXISTS student_attendance CASCADE;
DROP TABLE IF EXISTS notices CASCADE;
DROP TABLE IF EXISTS teacher_classes CASCADE;
DROP TABLE IF EXISTS teacher_subjects CASCADE;
DROP TABLE IF EXISTS parent_children CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS parents CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- 2. CORE USER TABLES
-- ============================================

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL, -- 'Student', 'Teacher', 'Parent', 'Admin'
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
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

CREATE TABLE teachers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE parents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE parent_children (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER REFERENCES parents(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  UNIQUE(parent_id, student_id)
);

-- ============================================
-- 3. ACADEMIC STRUCTURE
-- ============================================

CREATE TABLE classes (
  id VARCHAR(50) PRIMARY KEY, -- e.g., '10A'
  subject VARCHAR(100) NOT NULL,
  grade INTEGER NOT NULL,
  section VARCHAR(10) NOT NULL,
  department VARCHAR(50),
  student_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE teacher_subjects (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
  subject VARCHAR(100) NOT NULL
);

CREATE TABLE teacher_classes (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
  class_name VARCHAR(50) NOT NULL
);

CREATE TABLE timetable (
  id SERIAL PRIMARY KEY,
  day VARCHAR(20) NOT NULL,
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  class_name VARCHAR(50) NOT NULL,
  teacher_id INTEGER REFERENCES teachers(id),
  status VARCHAR(20) DEFAULT 'Draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. ACADEMIC PERFORMANCE & ATTENDANCE
-- ============================================

CREATE TABLE student_attendance (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL, -- Present, Absent, Late
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, date)
);

CREATE TABLE academic_performance (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  subject VARCHAR(100) NOT NULL,
  score INTEGER CHECK (score BETWEEN 0 AND 100),
  term VARCHAR(50) NOT NULL,
  session VARCHAR(20)
);

CREATE TABLE behavior_records (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- 'Positive', 'Incident'
  title VARCHAR(255) NOT NULL,
  summary TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE badges (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon_name VARCHAR(50),
  color VARCHAR(50),
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE certificates (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  issuer VARCHAR(255),
  file_url TEXT,
  issued_date DATE
);

CREATE TABLE awards (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  date DATE
);

-- ============================================
-- 5. ASSIGNMENTS & EXAMS
-- ============================================

CREATE TABLE assignments (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  class_name VARCHAR(50) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  total_students INTEGER DEFAULT 0,
  submissions_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE submissions (
  id SERIAL PRIMARY KEY,
  assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_late BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'Submitted',
  grade INTEGER,
  feedback TEXT,
  text_submission TEXT,
  file_url TEXT
);

CREATE TABLE exams (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  time VARCHAR(20) NOT NULL,
  class_name VARCHAR(50) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  is_published BOOLEAN DEFAULT FALSE,
  teacher_id INTEGER REFERENCES teachers(id)
);

-- ============================================
-- 6. COMMUNICATION (Notices, Chat, Forum)
-- ============================================

CREATE TABLE notices (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  category VARCHAR(50) NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  audience JSONB DEFAULT '["all"]',
  created_by VARCHAR(100)
);


CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  summary TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  student_id INTEGER REFERENCES students(id),
  related_id INTEGER 
);

CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  participant_id INTEGER NOT NULL,
  participant_role VARCHAR(20) NOT NULL,
  last_message TEXT,
  last_message_time TIMESTAMP WITH TIME ZONE,
  unread_count INTEGER DEFAULT 0
);

CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL,
  text TEXT,
  type VARCHAR(20) DEFAULT 'text',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE forum_topics (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  author_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  post_count INTEGER DEFAULT 0,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE forum_posts (
  id SERIAL PRIMARY KEY,
  topic_id INTEGER REFERENCES forum_topics(id) ON DELETE CASCADE,
  author_name VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE complaints (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  category VARCHAR(50) NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  status VARCHAR(20) DEFAULT 'Submitted',
  timeline JSONB,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 7. TRANSPORT SYSTEM
-- ============================================

CREATE TABLE drivers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT
);

CREATE TABLE bus_routes (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT
);

CREATE TABLE bus_roster (
  id SERIAL PRIMARY KEY,
  route_id VARCHAR(50) REFERENCES bus_routes(id),
  driver_id INTEGER REFERENCES drivers(id),
  date DATE NOT NULL
);

CREATE TABLE pickup_points (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  route_id VARCHAR(50) REFERENCES bus_routes(id),
  lat FLOAT,
  lng FLOAT,
  ui_position_top VARCHAR(10), 
  ui_position_left VARCHAR(10),
  is_user_stop BOOLEAN DEFAULT FALSE
);

-- ============================================
-- 8. COMMERCE & FEES
-- ============================================

CREATE TABLE student_fees (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  total_fee DECIMAL(10, 2) NOT NULL,
  paid_amount DECIMAL(10, 2) DEFAULT 0,
  due_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'Unpaid'
);

CREATE TABLE store_products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  stock INTEGER DEFAULT 0
);

CREATE TABLE store_orders (
  id VARCHAR(50) PRIMARY KEY,
  customer_name VARCHAR(100) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'Pending',
  order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  items JSONB
);

-- ============================================
-- 9. LOGS & UTILS
-- ============================================

CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_name VARCHAR(100),
  user_role VARCHAR(50),
  action TEXT NOT NULL,
  type VARCHAR(20) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE health_logs (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id),
  date DATE NOT NULL,
  time VARCHAR(10),
  reason TEXT NOT NULL,
  notes TEXT,
  parent_notified BOOLEAN DEFAULT FALSE,
  medication_administered JSONB,
  recorded_by VARCHAR(100)
);

-- ============================================
-- 10. AUTHENTICATION & SECURITY
-- ============================================

CREATE TABLE auth_accounts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('Student', 'Teacher', 'Parent', 'Admin')),
  email VARCHAR(255),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  verification_sent_at TIMESTAMP,
  verification_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE email_logs (
  id SERIAL PRIMARY KEY,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  email_type VARCHAR(50) NOT NULL,
  subject VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'sent',
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 11. LIBRARY & RESOURCES
-- ============================================

CREATE TABLE books (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  cover_url TEXT,
  category VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'Available'
);

CREATE TABLE digital_resources (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  subject VARCHAR(100),
  description TEXT,
  url TEXT NOT NULL,
  thumbnail_url TEXT
);

-- ============================================
-- 12. CBT (COMPUTER BASED TESTING)
-- ============================================

CREATE TABLE cbt_tests (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL,
  class_name VARCHAR(50) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE cbt_questions (
  id SERIAL PRIMARY KEY,
  test_id INTEGER REFERENCES cbt_tests(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer VARCHAR(255) NOT NULL
);

CREATE TABLE cbt_results (
  id SERIAL PRIMARY KEY,
  test_id INTEGER REFERENCES cbt_tests(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 13. EVENTS & EXTRACURRICULAR
-- ============================================

CREATE TABLE calendar_events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  type VARCHAR(50),
  description TEXT
);

CREATE TABLE extracurricular_activities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  schedule TEXT
);

-- ============================================
-- 14. ADMIN & SCHOOL ORG
-- ============================================

CREATE TABLE pta_meetings (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  agenda JSONB
);

CREATE TABLE school_policies (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  url TEXT
);

CREATE TABLE volunteering_opportunities (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date DATE,
  spots_total INTEGER,
  spots_filled INTEGER DEFAULT 0
);

CREATE TABLE permission_slips (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  date DATE,
  status VARCHAR(20) DEFAULT 'Pending'
);

CREATE TABLE appointments (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER REFERENCES teachers(id),
  parent_id INTEGER REFERENCES parents(id),
  date DATE NOT NULL,
  time VARCHAR(20) NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'Pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE pd_resources (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- Article, Video
  source VARCHAR(100),
  summary TEXT,
  url TEXT
);

-- ============================================
-- 15. AI MODULES
-- ============================================

CREATE TABLE ai_games (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  creator_id INTEGER REFERENCES teachers(id),
  title VARCHAR(255) NOT NULL,
  subject VARCHAR(100),
  difficulty_level VARCHAR(50),
  status VARCHAR(20) DEFAULT 'Draft',
  questions JSONB
);


CREATE TABLE lesson_plans (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER REFERENCES teachers(id),
  subject VARCHAR(100),
  grade VARCHAR(50),
  topic VARCHAR(255),
  content JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE generated_resources (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER REFERENCES teachers(id),
  subject VARCHAR(100),
  class_name VARCHAR(50),  
  term VARCHAR(20),
  scheme_content JSONB,
  lesson_plans_content JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ============================================
-- 16. REPORTING & PAYMENTS (Final Gaps)
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

CREATE TABLE fee_payments (
  id SERIAL PRIMARY KEY,
  fee_id INTEGER REFERENCES student_fees(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  method VARCHAR(50), -- Bank Transfer, Cash, Card
  reference VARCHAR(100),
  recorded_by VARCHAR(100)
);

-- ============================================
-- DISABLE ROW LEVEL SECURITY (RLS) FOR DEV
-- ============================================
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE teachers DISABLE ROW LEVEL SECURITY;
ALTER TABLE parents DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE notices DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_fees DISABLE ROW LEVEL SECURITY;
ALTER TABLE store_products DISABLE ROW LEVEL SECURITY;
ALTER TABLE store_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE books DISABLE ROW LEVEL SECURITY;
ALTER TABLE digital_resources DISABLE ROW LEVEL SECURITY;
ALTER TABLE cbt_tests DISABLE ROW LEVEL SECURITY;
ALTER TABLE cbt_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE cbt_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE extracurricular_activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE pta_meetings DISABLE ROW LEVEL SECURITY;
ALTER TABLE school_policies DISABLE ROW LEVEL SECURITY;
ALTER TABLE volunteering_opportunities DISABLE ROW LEVEL SECURITY;
ALTER TABLE permission_slips DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_games DISABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_plans DISABLE ROW LEVEL SECURITY;
-- New tables disable RLS
ALTER TABLE behavior_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE badges DISABLE ROW LEVEL SECURITY;
ALTER TABLE certificates DISABLE ROW LEVEL SECURITY;
ALTER TABLE awards DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE complaints DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE pd_resources DISABLE ROW LEVEL SECURITY;
ALTER TABLE report_cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE generated_resources DISABLE ROW LEVEL SECURITY;

-- ============================================
-- SAMPLE DATA INSERTION (So app isn't empty)
-- ============================================

-- Create Users first
INSERT INTO users (email, name, role) VALUES
('adebayo@student.school.com', 'Adebayo Oluwaseun', 'Student'),
('chidinma@student.school.com', 'Chidinma Okafor', 'Student'),
('musa@student.school.com', 'Musa Ibrahim', 'Student'),
('j.adeoye@school.com', 'Mr. John Adeoye', 'Teacher'),
('f.akintola@school.com', 'Mrs. Funke Akintola', 'Teacher');

-- Insert Students (linking to users)
INSERT INTO students (user_id, name, grade, section, department, attendance_status) VALUES
((SELECT id FROM users WHERE email='adebayo@student.school.com'), 'Adebayo Oluwaseun', 10, 'A', 'Science', 'Present'),
((SELECT id FROM users WHERE email='chidinma@student.school.com'), 'Chidinma Okafor', 10, 'A', 'Science', 'Present'),
((SELECT id FROM users WHERE email='musa@student.school.com'), 'Musa Ibrahim', 9, 'A', NULL, 'Absent');

-- Insert Teachers (linking to users)
INSERT INTO teachers (user_id, name, email) VALUES
((SELECT id FROM users WHERE email='j.adeoye@school.com'), 'Mr. John Adeoye', 'j.adeoye@school.com'),
((SELECT id FROM users WHERE email='f.akintola@school.com'), 'Mrs. Funke Akintola', 'f.akintola@school.com');

INSERT INTO classes (id, subject, grade, section, department, student_count) VALUES
('1', 'General', 9, 'A', NULL, 25),
('3', 'Science', 10, 'A', 'Science', 22);

INSERT INTO notices (title, content, category, is_pinned) VALUES
('Mid-Term Break', 'School on break Thu-Fri.', 'Holiday', true),
('Inter-House Sports', 'Sports detailed schedule out soon.', 'Event', false);

INSERT INTO assignments (title, class_name, subject, due_date) VALUES
('Algebra Homework', 'Grade 10A', 'Mathematics', NOW() + INTERVAL '2 days');

INSERT INTO store_products (name, category, price, stock) VALUES
('School Uniform', 'Uniform', 15000, 50),
('Math Textbook', 'Book', 5000, 100);
