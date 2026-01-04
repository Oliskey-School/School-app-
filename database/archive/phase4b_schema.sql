-- Phase 4B: Guidance & Counselling Portal Schema
-- Tables for mental health support, counseling services, and student wellbeing

-- Counseling Sessions
CREATE TABLE IF NOT EXISTS counseling_sessions (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
    is_anonymous BOOLEAN DEFAULT false,
    anonymous_code VARCHAR(100), -- unique code for anonymous follow-up
    counselor_id INTEGER REFERENCES users(id),
    session_date TIMESTAMP NOT NULL,
    duration_minutes INTEGER,
    session_type VARCHAR(100) CHECK (session_type IN ('Individual', 'Group', 'Family', 'Crisis', 'Follow-up')),
    category VARCHAR(100) CHECK (category IN ('Academic', 'Behavioral', 'Social', 'Emotional', 'Family', 'Trauma', 'Other')),
    notes_encrypted TEXT, -- encrypted session notes
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,
    status VARCHAR(50) DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Cancelled', 'No Show')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Anonymous Reports
CREATE TABLE IF NOT EXISTS anonymous_reports (
    id SERIAL PRIMARY KEY,
    report_hash VARCHAR(255) UNIQUE NOT NULL, -- for anonymous tracking
    track_code VARCHAR(20) UNIQUE NOT NULL, -- code given to reporter
    category VARCHAR(100) CHECK (category IN ('Bullying', 'Safety Concern', 'Mental Health', 'Abuse', 'Substance Use', 'Other')),
    severity VARCHAR(50) CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    description_encrypted TEXT NOT NULL,
    location VARCHAR(255),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_to INTEGER REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'New' CHECK (status IN ('New', 'Under Review', 'In Progress', 'Resolved', 'Closed')),
    resolution_notes TEXT,
    resolved_at TIMESTAMP,
    follow_up_sent BOOLEAN DEFAULT false
);

-- Mental Health Screenings
CREATE TABLE IF NOT EXISTS mental_health_screenings (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    screening_type VARCHAR(100) CHECK (screening_type IN ('Depression', 'Anxiety', 'Stress', 'General Wellbeing', 'Trauma')),
    screening_date DATE NOT NULL,
    score INTEGER,
    max_score INTEGER,
    risk_level VARCHAR(50) CHECK (risk_level IN ('Low', 'Moderate', 'High', 'Critical')),
    flagged_for_followup BOOLEAN DEFAULT false,
    counselor_notified BOOLEAN DEFAULT false,
    counselor_notes TEXT,
    parent_notified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Counseling Appointments
CREATE TABLE IF NOT EXISTS counseling_appointments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    counselor_id INTEGER REFERENCES users(id),
    requested_date TIMESTAMP NOT NULL,
    confirmed_date TIMESTAMP,
    appointment_type VARCHAR(100) CHECK (appointment_type IN ('Initial Consultation', 'Follow-up', 'Crisis', 'Parent Meeting')),
    reason TEXT,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Completed', 'Cancelled', 'Rescheduled')),
    reminder_sent BOOLEAN DEFAULT false,
    attended BOOLEAN,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mental Health Resources
CREATE TABLE IF NOT EXISTS mental_health_resources (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) CHECK (category IN ('Article', 'Video', 'Helpline', 'Self-Help Guide', 'Crisis Resource', 'Other')),
    description TEXT,
    content_url TEXT,
    language VARCHAR(50) DEFAULT 'English',
    age_group VARCHAR(50),
    is_crisis_resource BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crisis Helplines (Nigerian)
CREATE TABLE IF NOT EXISTS crisis_helplines (
    id SERIAL PRIMARY KEY,
    organization_name VARCHAR(255) NOT NULL,
    helpline_type VARCHAR(100) CHECK (helpline_type IN ('Mental Health', 'Suicide Prevention', 'Child Protection', 'Domestic Violence', 'General Crisis')),
    phone_number VARCHAR(20) NOT NULL,
    alternate_phone VARCHAR(20),
    email VARCHAR(255),
    website TEXT,
    availability VARCHAR(100), -- e.g., "24/7", "Mon-Fri 9am-5pm"
    languages_supported TEXT[],
    is_toll_free BOOLEAN DEFAULT false,
    state VARCHAR(100), -- Nigerian state
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wellbeing Check-ins
CREATE TABLE IF NOT EXISTS wellbeing_checkins (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    checkin_date DATE NOT NULL,
    mood_rating INTEGER CHECK (mood_rating >= 1 AND mood_rating <= 5),
    sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 5),
    stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 5),
    social_connection INTEGER CHECK (social_connection >= 1 AND social_connection <= 5),
    notes TEXT,
    flagged BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Counselor Referrals
CREATE TABLE IF NOT EXISTS counselor_referrals (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    referred_by INTEGER REFERENCES users(id),
    referred_to INTEGER REFERENCES users(id), -- external counselor/therapist
    referral_reason TEXT NOT NULL,
    urgency VARCHAR(50) CHECK (urgency IN ('Routine', 'Urgent', 'Emergency')),
    specialist_type VARCHAR(100), -- e.g., "Clinical Psychologist", "Psychiatrist"
    referral_date DATE NOT NULL,
    appointment_scheduled BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Accepted', 'In Progress', 'Completed', 'Declined')),
    feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Peer Support Programs
CREATE TABLE IF NOT EXISTS peer_support_programs (
    id SERIAL PRIMARY KEY,
    program_name VARCHAR(255) NOT NULL,
    description TEXT,
    coordinator_id INTEGER REFERENCES users(id),
    start_date DATE,
    end_date DATE,
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Peer Support Matching
CREATE TABLE IF NOT EXISTS peer_support_matches (
    id SERIAL PRIMARY KEY,
    program_id INTEGER REFERENCES peer_support_programs(id) ON DELETE CASCADE,
    peer_supporter_id INTEGER REFERENCES students(id),
    supported_student_id INTEGER REFERENCES students(id),
    match_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Inactive')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_counseling_sessions_student ON counseling_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_counseling_sessions_date ON counseling_sessions(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_anonymous_reports_status ON anonymous_reports(status);
CREATE INDEX IF NOT EXISTS idx_anonymous_reports_track ON anonymous_reports(track_code);
CREATE INDEX IF NOT EXISTS idx_screening_student ON mental_health_screenings(student_id);
CREATE INDEX IF NOT EXISTS idx_screening_risk ON mental_health_screenings(risk_level);
CREATE INDEX IF NOT EXISTS idx_appointments_student ON counseling_appointments(student_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON counseling_appointments(status);
CREATE INDEX IF NOT EXISTS idx_checkins_student ON wellbeing_checkins(student_id);

-- Insert sample crisis helplines (Nigerian)
INSERT INTO crisis_helplines (organization_name, helpline_type, phone_number, availability, languages_supported, state, is_toll_free) VALUES
('Mental Health Foundation Nigeria', 'Mental Health', '0800-000-6472', '24/7', ARRAY['English', 'Pidgin'], 'Lagos', true),
('Suicide Research and Prevention Initiative (SURPIN)', 'Suicide Prevention', '0809-210-6491', '24/7', ARRAY['English'], 'National', false),
('Child Helpline Nigeria', 'Child Protection', '08008008001', '24/7', ARRAY['English', 'Hausa', 'Yoruba', 'Igbo'], 'National', true),
('Women At Risk International Foundation (WARIF)', 'Domestic Violence', '0809-999-0000', 'Mon-Fri 9am-5pm', ARRAY['English'], 'Lagos', false);

-- Insert sample mental health resources
INSERT INTO mental_health_resources (title, category, description, is_crisis_resource, language) VALUES
('Understanding Anxiety in Teens', 'Article', 'A guide for students experiencing anxiety', false, 'English'),
('Stress Management Techniques', 'Self-Help Guide', 'Practical strategies for managing school stress', false, 'English'),
('How to Talk About Your Feelings', 'Video', 'Video guide on emotional expression', false, 'English'),
('Nigeria Suicide Prevention Hotline', 'Crisis Resource', 'Immediate help for suicidal thoughts', true, 'English');

COMMENT ON TABLE counseling_sessions IS 'Confidential counseling session records';
COMMENT ON TABLE anonymous_reports IS 'Anonymous incident and concern reporting system';
COMMENT ON TABLE mental_health_screenings IS 'Mental health assessment and screening records';
COMMENT ON TABLE crisis_helplines IS 'Nigerian crisis and mental health helplines';
COMMENT ON TABLE wellbeing_checkins IS 'Regular student wellbeing self-assessments';
