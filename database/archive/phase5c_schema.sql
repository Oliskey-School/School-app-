-- Phase 5C: Alternative Delivery Systems Schema
-- Tables for SMS, USSD, IVR, and Radio content delivery for feature phones

-- SMS Lessons
CREATE TABLE IF NOT EXISTS sms_lessons (
    id SERIAL PRIMARY KEY,
    lesson_title VARCHAR(255) NOT NULL,
    subject VARCHAR(100),
    grade VARCHAR(50),
    content TEXT NOT NULL CHECK (LENGTH(content) <= 160), -- SMS character limit
    lesson_type VARCHAR(50) CHECK (lesson_type IN ('Educational', 'Reminder', 'Announcement', 'Quiz', 'Tip')),
    language VARCHAR(50) DEFAULT 'English',
    created_by INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SMS Schedules
CREATE TABLE IF NOT EXISTS sms_schedules (
    id SERIAL PRIMARY KEY,
    lesson_id INTEGER REFERENCES sms_lessons(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    target_audience VARCHAR(50) CHECK (target_audience IN ('All Parents', 'Specific Class', 'Specific Students', 'Teachers')),
    class_id INTEGER, -- NULL if all parents
    status VARCHAR(50) DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Sending', 'Sent', 'Failed', 'Cancelled')),
    recipients_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    cost_naira NUMERIC(10,2),
    sent_at TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SMS Contacts
CREATE TABLE IF NOT EXISTS sms_contacts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    phone_number VARCHAR(20) NOT NULL,
    contact_type VARCHAR(50) CHECK (contact_type IN ('Parent', 'Teacher', 'Student', 'Admin')),
    is_verified BOOLEAN DEFAULT false,
    opt_in BOOLEAN DEFAULT true,
    language_preference VARCHAR(50) DEFAULT 'English',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(phone_number)
);

-- SMS Responses (for quizzes)
CREATE TABLE IF NOT EXISTS sms_responses (
    id SERIAL PRIMARY KEY,
    lesson_id INTEGER REFERENCES sms_lessons(id),
    schedule_id INTEGER REFERENCES sms_schedules(id),
    phone_number VARCHAR(20) NOT NULL,
    response_text TEXT,
    is_correct BOOLEAN,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- USSD Menu Structure
CREATE TABLE IF NOT EXISTS ussd_menu_structure (
    id SERIAL PRIMARY KEY,
    menu_code VARCHAR(50) NOT NULL, -- e.g., *347*123#
    menu_level INTEGER NOT NULL, -- 0 = main, 1 = submenu, etc.
    parent_menu_id INTEGER REFERENCES ussd_menu_structure(id),
    menu_text TEXT NOT NULL,
    menu_option VARCHAR(10), -- 1, 2, 3, etc.
    action_type VARCHAR(50) CHECK (action_type IN ('Display', 'Check Fees', 'Check Attendance', 'Make Payment', 'Report Absence', 'View Events', 'End Session')),
    response_template TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- USSD Sessions
CREATE TABLE IF NOT EXISTS ussd_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    current_menu_id INTEGER REFERENCES ussd_menu_structure(id),
    session_data JSONB, -- Store user selections and context
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_interaction TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Timeout', 'Error'))
);

-- USSD Transactions (for payments, etc.)
CREATE TABLE IF NOT EXISTS ussd_transactions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) REFERENCES ussd_sessions(session_id),
    phone_number VARCHAR(20) NOT NULL,
    transaction_type VARCHAR(50) CHECK (transaction_type IN ('Fee Payment', 'Fee Check', 'Attendance Check', 'Absence Report', 'Event View')),
    student_id INTEGER REFERENCES students(id),
    amount NUMERIC(12,2),
    transaction_ref VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Initiated' CHECK (status IN ('Initiated', 'Completed', 'Failed', 'Cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Radio Content
CREATE TABLE IF NOT EXISTS radio_content (
    id SERIAL PRIMARY KEY,
    content_title VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(100),
    grade VARCHAR(50),
    audio_file_url TEXT,
    duration_minutes INTEGER,
    language VARCHAR(50) DEFAULT 'English',
    content_type VARCHAR(50) CHECK (content_type IN ('Lesson', 'Story', 'Announcement', 'Music', 'Interview')),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Radio Broadcasts
CREATE TABLE IF NOT EXISTS radio_broadcasts (
    id SERIAL PRIMARY KEY,
    content_id INTEGER REFERENCES radio_content(id) ON DELETE CASCADE,
    radio_partner_id INTEGER REFERENCES radio_partners(id),
    broadcast_date DATE NOT NULL,
    broadcast_time TIME NOT NULL,
    frequency VARCHAR(50), -- e.g., "99.5 FM"
    estimated_listeners INTEGER,
    status VARCHAR(50) DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Aired', 'Cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Radio Partners
CREATE TABLE IF NOT EXISTS radio_partners (
    id SERIAL PRIMARY KEY,
    station_name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    frequency VARCHAR(50),
    coverage_area TEXT,
    contact_person VARCHAR(255),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    partnership_status VARCHAR(50) DEFAULT 'Active' CHECK (partnership_status IN ('Active', 'Inactive', 'Pending')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Radio Feedback
CREATE TABLE IF NOT EXISTS radio_feedback (
    id SERIAL PRIMARY KEY,
    broadcast_id INTEGER REFERENCES radio_broadcasts(id) ON DELETE CASCADE,
    listener_phone VARCHAR(20),
    feedback_text TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- IVR Lessons (Voice calls)
CREATE TABLE IF NOT EXISTS ivr_lessons (
    id SERIAL PRIMARY KEY,
    lesson_title VARCHAR(255) NOT NULL,
    subject VARCHAR(100),
    grade VARCHAR(50),
    audio_file_url TEXT NOT NULL,
    script TEXT, -- Text version of audio
    duration_seconds INTEGER,
    language VARCHAR(50) DEFAULT 'English',
    lesson_type VARCHAR(50) CHECK (lesson_type IN ('Educational', 'Announcement', 'Survey', 'Reminder')),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- IVR Calls
CREATE TABLE IF NOT EXISTS ivr_calls (
    id SERIAL PRIMARY KEY,
    lesson_id INTEGER REFERENCES ivr_lessons(id),
    phone_number VARCHAR(20) NOT NULL,
    call_sid VARCHAR(255), -- Twilio/Africa's Talking call ID
    call_status VARCHAR(50) CHECK (call_status IN ('Initiated', 'Ringing', 'InProgress', 'Completed', 'Failed', 'Busy', 'NoAnswer')),
    call_duration_seconds INTEGER,
    keypad_responses JSONB, -- Store DTMF inputs
    initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- IVR Sessions
CREATE TABLE IF NOT EXISTS ivr_sessions (
    id SERIAL PRIMARY KEY,
    call_id INTEGER REFERENCES ivr_calls(id),
    lesson_id INTEGER REFERENCES ivr_lessons(id),
    phone_number VARCHAR(20) NOT NULL,
    session_data JSONB,
    completion_percentage INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- IVR Feedback
CREATE TABLE IF NOT EXISTS ivr_feedback (
    id SERIAL PRIMARY KEY,
    call_id INTEGER REFERENCES ivr_calls(id),
    lesson_id INTEGER REFERENCES ivr_lessons(id),
    phone_number VARCHAR(20),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sms_lessons_active ON sms_lessons(is_active);
CREATE INDEX IF NOT EXISTS idx_sms_schedules_date ON sms_schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_sms_schedules_status ON sms_schedules(status);
CREATE INDEX IF NOT EXISTS idx_sms_contacts_phone ON sms_contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_responses_lesson ON sms_responses(lesson_id);
CREATE INDEX IF NOT EXISTS idx_ussd_sessions_phone ON ussd_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_ussd_sessions_status ON ussd_sessions(status);
CREATE INDEX IF NOT EXISTS idx_radio_broadcasts_date ON radio_broadcasts(broadcast_date);
CREATE INDEX IF NOT EXISTS idx_ivr_calls_phone ON ivr_calls(phone_number);
CREATE INDEX IF NOT EXISTS idx_ivr_calls_status ON ivr_calls(call_status);

-- Insert sample USSD menu structure
INSERT INTO ussd_menu_structure (menu_code, menu_level, parent_menu_id, menu_text, menu_option, action_type, is_active) VALUES
('*347*123#', 0, NULL, 'Welcome to School App\n1. Check Fees\n2. View Attendance\n3. Report Absence\n4. Make Payment\n5. Upcoming Events', NULL, 'Display', true),
('*347*123#', 1, 1, 'Enter Student ID:', '1', 'Check Fees', true),
('*347*123#', 1, 1, 'Enter Student ID:', '2', 'Check Attendance', true),
('*347*123#', 1, 1, 'Enter Student ID and reason:', '3', 'Report Absence', true),
('*347*123#', 1, 1, 'Enter amount (Min N100):', '4', 'Make Payment', true),
('*347*123#', 1, 1, 'Loading events...', '5', 'View Events', true);

COMMENT ON TABLE sms_lessons IS 'SMS-based educational content (160 char limit)';
COMMENT ON TABLE ussd_menu_structure IS 'USSD menu tree for feature phone access';
COMMENT ON TABLE radio_broadcasts IS 'Community radio broadcast schedule';
COMMENT ON TABLE ivr_lessons IS 'Interactive voice response audio lessons';
