-- Phase 5A: Parent Engagement & Communication Schema
-- Tables for volunteer management, conferences, surveys, and parent communication

-- Volunteer Opportunities
CREATE TABLE IF NOT EXISTS volunteer_opportunities (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    opportunity_type VARCHAR(100) CHECK (opportunity_type IN ('Event Support', 'Classroom Help', 'Field Trip', 'Fundraising', 'Tutoring', 'Maintenance', 'Other')),
    date DATE NOT NULL,
    time_start TIME,
    time_end TIME,
    location VARCHAR(255),
    skills_needed TEXT,
    slots_available INTEGER DEFAULT 1,
    slots_filled INTEGER DEFAULT 0,
    coordinator_id INTEGER REFERENCES users(id),
    coordinator_contact VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Open' CHECK (status IN ('Open', 'Filled', 'Completed', 'Cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Volunteer Signups
CREATE TABLE IF NOT EXISTS volunteer_signups (
    id SERIAL PRIMARY KEY,
    opportunity_id INTEGER REFERENCES volunteer_opportunities(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES parents(id) ON DELETE CASCADE,
    signup_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    availability_notes TEXT,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Completed', 'Cancelled', 'No-Show')),
    hours_contributed NUMERIC(5,2),
    feedback TEXT,
    completion_date DATE,
    UNIQUE(opportunity_id, parent_id)
);

-- Volunteer Hours Tracking
CREATE TABLE IF NOT EXISTS volunteer_hours (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES parents(id) ON DELETE CASCADE,
    opportunity_id INTEGER REFERENCES volunteer_opportunities(id),
    hours NUMERIC(5,2) NOT NULL,
    date DATE NOT NULL,
    activity_description TEXT,
    verified_by INTEGER REFERENCES users(id),
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Volunteer Badges/Recognition
CREATE TABLE IF NOT EXISTS volunteer_badges (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES parents(id) ON DELETE CASCADE,
    badge_name VARCHAR(100) NOT NULL,
    badge_type VARCHAR(50) CHECK (badge_type IN ('Hours Milestone', 'Event Champion', 'Monthly Star', 'Year-Round', 'Special Recognition')),
    hours_threshold INTEGER,
    awarded_date DATE DEFAULT CURRENT_DATE,
    icon_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teacher Availability for Conferences
CREATE TABLE IF NOT EXISTS teacher_availability (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time_start TIME NOT NULL,
    time_end TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    location VARCHAR(255),
    conference_type VARCHAR(50) CHECK (conference_type IN ('In-Person', 'Virtual', 'Phone', 'Flexible')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parent-Teacher Conferences
CREATE TABLE IF NOT EXISTS parent_teacher_conferences (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES parents(id) ON DELETE CASCADE,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    conference_type VARCHAR(50) CHECK (conference_type IN ('In-Person', 'Virtual', 'Phone')),
    meeting_link TEXT, -- Google Meet, Zoom, etc.
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Confirmed', 'Completed', 'Rescheduled', 'Cancelled')),
    parent_notes TEXT,
    teacher_notes TEXT,
    follow_up_required BOOLEAN DEFAULT false,
    reminder_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Surveys
CREATE TABLE IF NOT EXISTS surveys (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_by INTEGER REFERENCES users(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    target_audience VARCHAR(50) CHECK (target_audience IN ('Parents', 'Teachers', 'Students', 'All')),
    is_anonymous BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    response_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Survey Questions
CREATE TABLE IF NOT EXISTS survey_questions (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER REFERENCES surveys(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) CHECK (question_type IN ('Multiple Choice', 'Text', 'Rating', 'Yes/No', 'Checkbox')),
    question_order INTEGER NOT NULL,
    options TEXT[], -- For multiple choice/checkbox
    is_required BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Survey Responses
CREATE TABLE IF NOT EXISTS survey_responses (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER REFERENCES surveys(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES survey_questions(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id), -- NULL if anonymous
    user_type VARCHAR(50),
    response_text TEXT,
    response_option VARCHAR(255),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Consent Forms
CREATE TABLE IF NOT EXISTS consent_forms (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    form_type VARCHAR(100) CHECK (form_type IN ('Medical', 'Media Release', 'Field Trip', 'Photo/Video', 'Data Privacy', 'Other')),
    content TEXT NOT NULL,
    created_by INTEGER REFERENCES users(id),
    valid_until DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Consent Signatures
CREATE TABLE IF NOT EXISTS consent_signatures (
    id SERIAL PRIMARY KEY,
    consent_form_id INTEGER REFERENCES consent_forms(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES parents(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    signature_type VARCHAR(50) DEFAULT 'Digital',
    ip_address VARCHAR(50),
    consent_given BOOLEAN NOT NULL,
    notes TEXT,
    UNIQUE(consent_form_id, parent_id, student_id)
);

-- Parent Communication Log
CREATE TABLE IF NOT EXISTS parent_communications (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES parents(id) ON DELETE CASCADE,
    communication_type VARCHAR(50) CHECK (communication_type IN ('Email', 'SMS', 'USSD', 'IVR', 'In-App', 'Phone Call')),
    subject VARCHAR(255),
    message TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivery_status VARCHAR(50) CHECK (delivery_status IN ('Pending', 'Sent', 'Delivered', 'Read', 'Failed')),
    read_at TIMESTAMP,
    response_received BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_volunteer_opportunities_date ON volunteer_opportunities(date);
CREATE INDEX IF NOT EXISTS idx_volunteer_opportunities_status ON volunteer_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_volunteer_signups_parent ON volunteer_signups(parent_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_signups_opportunity ON volunteer_signups(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_conferences_parent ON parent_teacher_conferences(parent_id);
CREATE INDEX IF NOT EXISTS idx_conferences_teacher ON parent_teacher_conferences(teacher_id);
CREATE INDEX IF NOT EXISTS idx_conferences_date ON parent_teacher_conferences(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_surveys_active ON surveys(is_active);
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey ON survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_consent_signatures_parent ON consent_signatures(parent_id);

COMMENT ON TABLE volunteer_opportunities IS 'Parent volunteer opportunities and event support';
COMMENT ON TABLE parent_teacher_conferences IS 'Scheduled parent-teacher meeting appointments';
COMMENT ON TABLE surveys IS 'School surveys and polls for parent/teacher/student feedback';
COMMENT ON TABLE consent_forms IS 'Digital consent and permission forms';
