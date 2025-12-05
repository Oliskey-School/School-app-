-- ============================================
-- MASTER SCHEMA FOR SCHOOL MANAGEMENT SYSTEM
-- Covers ALL functionality: Academics, Transport, Store, Chat, etc.
-- ============================================

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. CLEANUP (Drop existing tables to prevent conflicts)
-- ============================================
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS forum_posts CASCADE;
DROP TABLE IF EXISTS forum_topics CASCADE;
DROP TABLE IF EXISTS store_items CASCADE; -- renamed to store_orders items join?
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
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- Link to users table
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
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- Link to users table
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE parents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- Link to users table
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
  subject VARCHAR(100) NOT NULL, -- e.g., 'Science', 'General'
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
  day VARCHAR(20) NOT NULL, -- Monday, Tuesday...
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  class_name VARCHAR(50) NOT NULL,
  teacher_id INTEGER REFERENCES teachers(id)
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
  status VARCHAR(20) DEFAULT 'Submitted', -- Graded, Ungraded
  grade INTEGER,
  feedback TEXT,
  text_submission TEXT,
  file_url TEXT
);

CREATE TABLE exams (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL, -- Mid-term, Final
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
  category VARCHAR(50) NOT NULL, -- Holiday, Event, Urgent
  is_pinned BOOLEAN DEFAULT FALSE,
  audience JSONB DEFAULT '["all"]', -- ['parent', 'student']
  created_by VARCHAR(100)
);

CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  participant_id INTEGER NOT NULL, -- Logic handled in app (can be teacher/parent ID)
  participant_role VARCHAR(20) NOT NULL, -- 'Teacher', 'Parent'
  last_message TEXT,
  last_message_time TIMESTAMP WITH TIME ZONE,
  unread_count INTEGER DEFAULT 0
);

CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL,
  text TEXT,
  type VARCHAR(20) DEFAULT 'text', -- text, audio, video
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
  id VARCHAR(50) PRIMARY KEY, -- 'route-a'
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
  lat FLOAT,   -- For map positioning (simplified as top/left in your app)
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
  category VARCHAR(50) NOT NULL, -- Uniform, Book
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  stock INTEGER DEFAULT 0
);

CREATE TABLE store_orders (
  id VARCHAR(50) PRIMARY KEY, -- 'ORD-123'
  customer_name VARCHAR(100) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'Pending',
  order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  items JSONB -- Store array of {productName, quantity}
);

-- ============================================
-- 9. LOGS & UTILS
-- ============================================

CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_name VARCHAR(100),
  user_role VARCHAR(50),
  action TEXT NOT NULL,
  type VARCHAR(20) NOT NULL, -- create, update, delete
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
  recorded_by VARCHAR(100)
);

-- ============================================
-- DISABLE ROW LEVEL SECURITY (RLS) FOR DEV
-- This ensures you don't get "Permission Denied" errors while testing
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

