-- ===================================================================
-- MIGRATION 0019: ADDITIONAL FEATURES
-- Digital ID Cards, Alumni Network, Fundraising, Enhanced Shop, 
-- Reward Points & Badges, Video Conferencing, Custom Learning Paths
-- ===================================================================
-- Run after: 0018_inspector_portal.sql
-- ===================================================================

-- ===================================================================
-- FEATURE 1: DIGITAL ID CARDS
-- ===================================================================

-- Add ID card fields to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS id_card_number VARCHAR(20) UNIQUE,
ADD COLUMN IF NOT EXISTS blood_type VARCHAR(5),
ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(255);

-- Add ID card fields to teachers table
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS id_card_number VARCHAR(20) UNIQUE,
ADD COLUMN IF NOT EXISTS employee_id VARCHAR(20) UNIQUE;

-- ID Card Generation tracking
DROP TABLE IF EXISTS id_cards CASCADE;
CREATE TABLE IF NOT EXISTS id_cards (
  id BIGSERIAL PRIMARY KEY,
  user_type VARCHAR(20) NOT NULL, -- 'student' or 'teacher'
  user_id BIGINT NOT NULL,
  card_number VARCHAR(20) UNIQUE NOT NULL,
  qr_code_data TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at DATE,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_id_cards_user ON id_cards(user_type, user_id);

-- ===================================================================
-- FEATURE 2: ALUMNI NETWORK & FUNDRAISING
-- ===================================================================

DROP TABLE IF EXISTS mentorship_requests CASCADE;
DROP TABLE IF EXISTS donations CASCADE;
DROP TABLE IF EXISTS fundraising_campaigns CASCADE;
DROP TABLE IF EXISTS alumni CASCADE;

CREATE TABLE IF NOT EXISTS alumni (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id BIGINT REFERENCES students(id),
  graduation_year INTEGER NOT NULL,
  degree_obtained VARCHAR(255),
  current_occupation VARCHAR(255),
  company VARCHAR(255),
  location VARCHAR(255),
  linkedin_url VARCHAR(500),
  website_url VARCHAR(500),
  bio TEXT,
  is_mentor_available BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alumni_user ON alumni(user_id);
CREATE INDEX IF NOT EXISTS idx_alumni_year ON alumni(graduation_year);

CREATE TABLE IF NOT EXISTS fundraising_campaigns (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  goal_amount DECIMAL(12,2) NOT NULL,
  raised_amount DECIMAL(12,2) DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'active', -- active, completed, cancelled
  image_url VARCHAR(500),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON fundraising_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON fundraising_campaigns(start_date, end_date);

CREATE TABLE IF NOT EXISTS donations (
  id BIGSERIAL PRIMARY KEY,
  campaign_id BIGINT REFERENCES fundraising_campaigns(id) ON DELETE CASCADE,
  donor_id BIGINT REFERENCES alumni(id),
  donor_name VARCHAR(255), -- For anonymous or non-alumni donors
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  is_anonymous BOOLEAN DEFAULT false,
  payment_reference VARCHAR(255),
  payment_provider VARCHAR(50),
  message TEXT,
  donated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donations_campaign ON donations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_donations_donor ON donations(donor_id);

CREATE TABLE IF NOT EXISTS mentorship_requests (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
  mentor_id BIGINT REFERENCES alumni(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, declined, completed
  subject_area VARCHAR(255),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mentorship_student ON mentorship_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_mentor ON mentorship_requests(mentor_id);

-- ===================================================================
-- FEATURE 3: ENHANCED SCHOOL SHOP
-- ===================================================================

-- Enhance existing store_products table
ALTER TABLE store_products 
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS sizes JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS colors JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS sku VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS store_orders CASCADE;
DROP TABLE IF EXISTS shopping_cart CASCADE;

CREATE TABLE IF NOT EXISTS shopping_cart (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES store_products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  size VARCHAR(10),
  color VARCHAR(50),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id, size, color)
);

CREATE INDEX IF NOT EXISTS idx_cart_user ON shopping_cart(user_id);

CREATE TABLE IF NOT EXISTS store_orders (
  id BIGSERIAL PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  total_amount DECIMAL(12,2) NOT NULL,
  shipping_address TEXT,
  contact_phone VARCHAR(20),
  contact_email VARCHAR(255),
  payment_reference VARCHAR(255),
  payment_provider VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, shipped, delivered, cancelled
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON store_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON store_orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_number ON store_orders(order_number);

CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES store_orders(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES store_products(id),
  product_name VARCHAR(255) NOT NULL, -- Capture at time of order
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  size VARCHAR(10),
  color VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- ===================================================================
-- FEATURE 4: REWARD POINTS & BADGES
-- ===================================================================

DROP TABLE IF EXISTS student_points CASCADE;
CREATE TABLE IF NOT EXISTS student_points (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT REFERENCES students(id) ON DELETE CASCADE UNIQUE,
  points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  total_earned INTEGER DEFAULT 0, -- Lifetime points
  total_spent INTEGER DEFAULT 0,  -- Points redeemed
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_points_student ON student_points(student_id);
CREATE INDEX IF NOT EXISTS idx_student_points_level ON student_points(points DESC);

DROP TABLE IF EXISTS point_transactions CASCADE;
CREATE TABLE IF NOT EXISTS point_transactions (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
  points INTEGER NOT NULL, -- Positive for earning, negative for spending
  reason VARCHAR(255) NOT NULL,
  category VARCHAR(50), -- academic, behavior, attendance, participation, redemption
  reference_id BIGINT, -- Link to related record (assignment, attendance, etc.)
  awarded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_point_transactions_student ON point_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_date ON point_transactions(created_at DESC);

-- Badges table
DROP TABLE IF EXISTS badges CASCADE;
CREATE TABLE IF NOT EXISTS badges (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon_url VARCHAR(500),
  color VARCHAR(50), -- e.g., 'bg-green-100 text-green-800'
  category VARCHAR(50), -- academic, behavioral, attendance, special
  points_required INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TABLE IF EXISTS student_badges CASCADE;
CREATE TABLE IF NOT EXISTS student_badges (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
  badge_id BIGINT REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_student_badges_student ON student_badges(student_id);
CREATE INDEX IF NOT EXISTS idx_student_badges_badge ON student_badges(badge_id);

DROP TABLE IF EXISTS badge_criteria CASCADE;
CREATE TABLE IF NOT EXISTS badge_criteria (
  id BIGSERIAL PRIMARY KEY,
  badge_id BIGINT REFERENCES badges(id) ON DELETE CASCADE,
  criteria_type VARCHAR(50), -- points_threshold, attendance_streak, grade_average, etc.
  criteria_value JSONB NOT NULL,
  description TEXT
);

-- Rewards catalog
DROP TABLE IF EXISTS rewards_catalog CASCADE;
CREATE TABLE IF NOT EXISTS rewards_catalog (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL CHECK (points_cost > 0),
  category VARCHAR(50), -- privilege, physical, experience
  stock_quantity INTEGER,
  is_available BOOLEAN DEFAULT true,
  image_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TABLE IF EXISTS reward_redemptions CASCADE;
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
  reward_id BIGINT REFERENCES rewards_catalog(id),
  points_spent INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, delivered, cancelled
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  fulfilled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_redemptions_student ON reward_redemptions(student_id);

-- ===================================================================
-- FEATURE 5: VIDEO CONFERENCING
-- ===================================================================

DROP TABLE IF EXISTS class_attendance_virtual CASCADE;
DROP TABLE IF EXISTS virtual_classes CASCADE;

CREATE TABLE IF NOT EXISTS virtual_classes (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  teacher_id BIGINT REFERENCES teachers(id) ON DELETE CASCADE,
  class_grade INTEGER,
  class_section VARCHAR(10),
  subject VARCHAR(100),
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  meeting_link VARCHAR(500),
  meeting_id VARCHAR(100) UNIQUE,
  meeting_password VARCHAR(100),
  platform VARCHAR(50) DEFAULT 'jitsi', -- jitsi, zoom, daily, etc.
  status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, live, ended, cancelled
  recording_url VARCHAR(500),
  max_participants INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_virtual_classes_teacher ON virtual_classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_virtual_classes_schedule ON virtual_classes(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_virtual_classes_status ON virtual_classes(status);

CREATE TABLE IF NOT EXISTS class_attendance_virtual (
  id BIGSERIAL PRIMARY KEY,
  class_id BIGINT REFERENCES virtual_classes(id) ON DELETE CASCADE,
  student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  was_on_time BOOLEAN DEFAULT true,
  participation_score INTEGER DEFAULT 0, -- 0-100
  UNIQUE(class_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_virtual_attendance_class ON class_attendance_virtual(class_id);
CREATE INDEX IF NOT EXISTS idx_virtual_attendance_student ON class_attendance_virtual(student_id);

-- ===================================================================
-- FEATURE 6: CUSTOM LEARNING PATHS
-- ===================================================================

DROP TABLE IF EXISTS adaptive_recommendations CASCADE;
DROP TABLE IF EXISTS module_progress CASCADE;
DROP TABLE IF EXISTS student_learning_paths CASCADE;
DROP TABLE IF EXISTS learning_path_modules CASCADE;
DROP TABLE IF EXISTS learning_paths CASCADE;

CREATE TABLE IF NOT EXISTS learning_paths (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  subject VARCHAR(100),
  grade_level INTEGER,
  difficulty_level VARCHAR(20), -- beginner, intermediate, advanced
  estimated_duration_hours INTEGER,
  created_by BIGINT REFERENCES teachers(id),
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT false, -- Visible to all teachers/admins
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_paths_subject ON learning_paths(subject);
CREATE INDEX IF NOT EXISTS idx_learning_paths_grade ON learning_paths(grade_level);
CREATE INDEX IF NOT EXISTS idx_learning_paths_active ON learning_paths(is_active);

CREATE TABLE IF NOT EXISTS learning_path_modules (
  id BIGSERIAL PRIMARY KEY,
  path_id BIGINT REFERENCES learning_paths(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  content_type VARCHAR(50), -- video, reading, quiz, assignment, interactive, exercise
  content_url VARCHAR(500),
  content_data JSONB, -- Store quiz questions, exercise data, etc.
  estimated_minutes INTEGER,
  points_reward INTEGER DEFAULT 0,
  prerequisites JSONB DEFAULT '[]'::jsonb, -- Array of module IDs that must be completed first
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_path_modules_path ON learning_path_modules(path_id);
CREATE INDEX IF NOT EXISTS idx_path_modules_order ON learning_path_modules(path_id, order_index);

CREATE TABLE IF NOT EXISTS student_learning_paths (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
  path_id BIGINT REFERENCES learning_paths(id) ON DELETE CASCADE,
  assigned_by BIGINT REFERENCES teachers(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'assigned', -- assigned, in_progress, completed, archived
  progress_percentage INTEGER DEFAULT 0,
  current_module_id BIGINT REFERENCES learning_path_modules(id),
  UNIQUE(student_id, path_id)
);

CREATE INDEX IF NOT EXISTS idx_student_paths_student ON student_learning_paths(student_id);
CREATE INDEX IF NOT EXISTS idx_student_paths_status ON student_learning_paths(status);

CREATE TABLE IF NOT EXISTS module_progress (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
  module_id BIGINT REFERENCES learning_path_modules(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'not_started', -- not_started, in_progress, completed
  score DECIMAL(5,2), -- For quizzes/assessments
  attempts INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  time_spent_minutes INTEGER DEFAULT 0,
  notes TEXT, -- Student's notes or teacher feedback
  UNIQUE(student_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_module_progress_student ON module_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_module ON module_progress(module_id);

CREATE TABLE IF NOT EXISTS adaptive_recommendations (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
  recommended_path_id BIGINT REFERENCES learning_paths(id) ON DELETE CASCADE,
  reason TEXT,
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  based_on_performance JSONB, -- Data used to make recommendation
  is_accepted BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_recommendations_student ON adaptive_recommendations(student_id);

-- ===================================================================
-- INSERT SAMPLE DATA
-- ===================================================================

-- Sample Badges
INSERT INTO badges (name, description, icon_url, color, category, points_required, is_active) VALUES
('Perfect Attendance', 'No absences for an entire term', '/icons/attendance-badge.png', 'bg-green-100 text-green-800', 'attendance', 100, true),
('Top Scorer', 'Achieved 90%+ average in all subjects', '/icons/academic-badge.png', 'bg-blue-100 text-blue-800', 'academic', 200, true),
('Star Participant', 'Earned 500+ participation points', '/icons/participation-badge.png', 'bg-purple-100 text-purple-800', 'behavioral', 50, true),
('Quick Learner', 'Completed 5 learning paths', '/icons/learning-badge.png', 'bg-yellow-100 text-yellow-800', 'academic', 150, true)
ON CONFLICT DO NOTHING;

-- Sample Rewards
INSERT INTO rewards_catalog (name, description, points_cost, category, is_available, image_url) VALUES
('Homework Pass', 'Skip one homework assignment', 100, 'privilege', true, '/icons/homework-pass.png'),
('Extra Lunch Time', 'Get 15 extra minutes for lunch', 50, 'privilege', true, '/icons/lunch-time.png'),
('School Merchandise', 'Get a free school T-shirt', 200, 'physical', true, '/icons/tshirt.png'),
('Library Book Rental', 'Rent any book from library for free', 30, 'privilege', true, '/icons/book.png')
ON CONFLICT DO NOTHING;

-- Set up RLS (Row Level Security) - Basic policies
ALTER TABLE student_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_learning_paths ENABLE ROW LEVEL SECURITY;

-- Comments for documentation
COMMENT ON TABLE id_cards IS 'Digital ID cards for students and teachers';
COMMENT ON TABLE alumni IS 'Alumni directory and profiles';
COMMENT ON TABLE fundraising_campaigns IS 'School fundraising campaigns';
COMMENT ON TABLE donations IS 'Donations to fundraising campaigns';
COMMENT ON TABLE student_points IS 'Student reward points system';
COMMENT ON TABLE badges IS 'Achievement badges';
COMMENT ON TABLE virtual_classes IS 'Virtual classroom sessions';
COMMENT ON TABLE learning_paths IS 'Custom learning paths for personalized education';

-- ===================================================================
-- MIGRATION COMPLETE
-- ===================================================================
