-- ============================================
-- MASTER SCHEMA FOR SCHOOL MANAGEMENT SYSTEM (FINAL)
-- ============================================

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. CLEANUP
-- ============================================
-- Drop dependent tables first
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
DROP TABLE IF EXISTS conversation_participants CASCADE;
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
DROP TYPE IF EXISTS user_role CASCADE;

-- ============================================
-- 2. CORE USER TABLES
-- ============================================

CREATE TYPE user_role AS ENUM ('Student', 'Teacher', 'Parent', 'Admin');

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  supabase_uid UUID REFERENCES auth.users(id), -- Link to Supabase Auth
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
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
  start_time VARCHAR(10) NOT NULL, -- Keep simplified string format for now or convert to TIME
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
  icon_name VARCHAR(50), -- Store the string name of the icon
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
  audience JSONB DEFAULT '["all"]', -- Storing audience logic as JSON ['parents', 'teachers'] or ['all']
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
  student_id INTEGER REFERENCES students(id), -- Optional context
  related_id INTEGER  -- Optional context ID
);

-- Chat System
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL DEFAULT 'direct', -- 'direct', 'group'
  name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_message_text TEXT
);

-- Needed for many-to-many participants
CREATE TABLE conversation_participants (
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id INTEGER REFERENCES users(id),
  content TEXT,
  type VARCHAR(20) DEFAULT 'text',
  media_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE
);

CREATE TABLE forum_topics (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  author_name VARCHAR(100) NOT NULL, -- Snapshot of name, or link to Teacher
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
  timeline JSONB, -- Store updates as JSON array
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

CREATE TABLE fee_payments (
  id SERIAL PRIMARY KEY,
  fee_id INTEGER REFERENCES student_fees(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  method VARCHAR(50), -- Bank Transfer, Cash, Card
  reference VARCHAR(100),
  recorded_by VARCHAR(100)
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
  items JSONB -- [{productName, quantity}]
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
  medication_administered JSONB, -- {name, dosage}
  recorded_by VARCHAR(100)
);

-- ============================================
-- 10. LIBRARY & RESOURCES
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
-- 11. CBT (COMPUTER BASED TESTING)
-- ============================================

CREATE TABLE cbt_tests (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL, -- Quiz, Exam
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
  options JSONB NOT NULL, -- Array of strings
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
-- 12. EVENTS & EXTRACURRICULAR
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
-- 13. ADMIN & SCHOOL ORG
-- ============================================

CREATE TABLE pta_meetings (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  agenda JSONB -- [{title, presenter}]
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
  type VARCHAR(50) NOT NULL,
  source VARCHAR(100),
  summary TEXT,
  url TEXT
);

-- ============================================
-- 14. AI MODULES
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
  skills JSONB, -- Record<string, Rating>
  psychomotor JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- 15. TRIGGERS & FUNCTIONS
-- ============================================

-- Function to update conversation last message
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS trigger AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_text = new.content,
      last_message_at = new.created_at
  WHERE id = new.conversation_id;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new message
DROP TRIGGER IF EXISTS on_new_message ON public.messages;
CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE PROCEDURE public.update_conversation_last_message();

-- Function to handle new user signup via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_user_id INTEGER;
BEGIN
  -- 1. Insert into public.users
  INSERT INTO public.users (supabase_uid, email, name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'name', COALESCE(new.raw_user_meta_data->>'role', 'Student'))
  RETURNING id INTO new_user_id;

  -- 2. Insert into role-specific table
  IF (new.raw_user_meta_data->>'role' = 'Teacher') THEN
    INSERT INTO public.teachers (user_id, name, email)
    VALUES (new_user_id, new.raw_user_meta_data->>'name', new.email);
  ELSIF (new.raw_user_meta_data->>'role' = 'Parent') THEN
    INSERT INTO public.parents (user_id, name, email)
    VALUES (new_user_id, new.raw_user_meta_data->>'name', new.email);
  ELSIF (new.raw_user_meta_data->>'role' = 'Student') THEN
    -- Default grade 1 (change as needed)
    INSERT INTO public.students (user_id, name, grade, section)
    VALUES (new_user_id, new.raw_user_meta_data->>'name', 1, 'A');
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================
-- 16. REALTIME CONFIGURATION
-- ============================================

-- Enable Realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE student_attendance;

-- Enable REPLICA IDENTITY for full row updates
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;
-- assignments might be heavy, stick to default unless needed

-- ============================================
-- 17. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
-- (Add other tables as needed)

-- Policies (Simplified for initial rollout)
-- Allow public read/write for now to fix connection issues, then lock down
CREATE POLICY "Public Access" ON users FOR ALL USING (true);
CREATE POLICY "Public Access" ON students FOR ALL USING (true);
CREATE POLICY "Public Access" ON teachers FOR ALL USING (true);
CREATE POLICY "Public Access" ON parents FOR ALL USING (true);
CREATE POLICY "Public Access" ON messages FOR ALL USING (true);
CREATE POLICY "Public Access" ON conversations FOR ALL USING (true);
CREATE POLICY "Public Access" ON conversation_participants FOR ALL USING (true);
-- ... Repeat for others or assume disabled RLS (Supabase default is RLS disabled on new tables usually, but explicit is better)

-- Disable RLS temporarily to ensure easy setup for the user
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE teachers DISABLE ROW LEVEL SECURITY;
ALTER TABLE parents DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
