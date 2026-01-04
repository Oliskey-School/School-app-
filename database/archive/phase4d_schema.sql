-- Phase 4D: Special Needs & Accessibility Schema
-- Tables for IEP tracking and accessibility support

-- Student IEPs (Individualized Education Programs)
CREATE TABLE IF NOT EXISTS student_ieps (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE UNIQUE,
    diagnosis TEXT,
    goals TEXT NOT NULL,
    accommodations TEXT NOT NULL,
    services_needed TEXT,
    start_date DATE NOT NULL,
    review_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Draft', 'Active', 'Under Review', 'Completed')),
    created_by INTEGER REFERENCES users(id),
    parent_signature_url TEXT,
    parent_signed_at TIMESTAMP,
    teacher_notes TEXT,
    progress_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Accessibility Settings
CREATE TABLE IF NOT EXISTS accessibility_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    font_size INTEGER DEFAULT 100 CHECK (font_size >= 100 AND font_size <= 200),
    high_contrast BOOLEAN DEFAULT false,
    text_to_speech_enabled BOOLEAN DEFAULT false,
    speech_rate NUMERIC(3,1) DEFAULT 1.0 CHECK (speech_rate >= 0.5 AND speech_rate <= 2.0),
    language VARCHAR(50) DEFAULT 'en',
    keyboard_nav_only BOOLEAN DEFAULT false,
    screen_reader_mode BOOLEAN DEFAULT false,
    reduce_motion BOOLEAN DEFAULT false,
    Color_blind_mode VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Accommodation Tracking
CREATE TABLE IF NOT EXISTS accommodation_tracking (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    accommodation_type VARCHAR(100) CHECK (accommodation_type IN ('Extended Time', 'Preferential Seating', 'Visual Aids', 'Assistive Technology', 'Modified Assignment', 'Other')),
    description TEXT NOT NULL,
    implemented_date DATE NOT NULL,
    implemented_by INTEGER REFERENCES users(id),
    effectiveness_rating INTEGER CHECK (effectiveness_rating >= 1 AND effectiveness_rating <= 5),
    teacher_feedback TEXT,
    parent_feedback TEXT,
    is_active BOOLEAN DEFAULT true,
    review_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- IEP Goals Progress
CREATE TABLE IF NOT EXISTS iep_goals_progress (
    id SERIAL PRIMARY KEY,
    iep_id INTEGER REFERENCES student_ieps(id) ON DELETE CASCADE,
    goal_description TEXT NOT NULL,
    target_date DATE,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    status VARCHAR(50) DEFAULT 'In Progress' CHECK (status IN ('Not Started', 'In Progress', 'Achieved', 'Discontinued')),
    notes TEXT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- IEP Meetings
CREATE TABLE IF NOT EXISTS iep_meetings (
    id SERIAL PRIMARY KEY,
    iep_id INTEGER REFERENCES student_ieps(id) ON DELETE CASCADE,
    meeting_date TIMESTAMP NOT NULL,
    meeting_type VARCHAR(50) CHECK (meeting_type IN ('Initial', 'Annual Review', 'Progress Update', 'Emergency', 'Transition')),
    attendees TEXT[],
    decisions_made TEXT,
    action_items TEXT,
    next_meeting_date DATE,
    minutes_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assistive Technology
CREATE TABLE IF NOT EXISTS assistive_technology (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    technology_name VARCHAR(255) NOT NULL,
    technology_type VARCHAR(100) CHECK (technology_type IN ('Screen Reader', 'Text-to-Speech', 'Speech-to-Text', 'Magnification', 'Adaptive Keyboard', 'Communication Device', 'Other')),
    provided_date DATE,
    training_required BOOLEAN DEFAULT false,
    training_completed BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Requested', 'Active', 'Inactive', 'Returned')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Language Support
CREATE TABLE IF NOT EXISTS language_support (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    primary_language VARCHAR(100) NOT NULL,
    english_proficiency VARCHAR(50) CHECK (english_proficiency IN ('Beginner', 'Intermediate', 'Advanced', 'Native')),
    requires_translation BOOLEAN DEFAULT false,
    interpreter_needed BOOLEAN DEFAULT false,
    support_program VARCHAR(100),
    entry_date DATE,
    exit_date DATE,
    progress_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Special Education Staff
CREATE TABLE IF NOT EXISTS special_education_staff (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    specialization VARCHAR(100) CHECK (specialization IN ('Learning Disabilities', 'Physical Disabilities', 'Autism Spectrum', 'Speech Therapy', 'Occupational Therapy', 'General')),
    certification VARCHAR(255),
    years_experience INTEGER,
    caseload_limit INTEGER,
    current_caseload INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parent-Teacher Collaboration
CREATE TABLE IF NOT EXISTS iep_collaboration_notes (
    id SERIAL PRIMARY KEY,
    iep_id INTEGER REFERENCES student_ieps(id) ON DELETE CASCADE,
    note_type VARCHAR(50) CHECK (note_type IN ('Progress Update', 'Concern', 'Success', 'Question', 'Suggestion')),
    created_by INTEGER REFERENCES users(id),
    created_by_role VARCHAR(50),
    content TEXT NOT NULL,
    attachments TEXT[],
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ieps_student ON student_ieps(student_id);
CREATE INDEX IF NOT EXISTS idx_ieps_status ON student_ieps(status);
CREATE INDEX IF NOT EXISTS idx_accessibility_user ON accessibility_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_student ON accommodation_tracking(student_id);
CREATE INDEX IF NOT EXISTS idx_goals_iep ON iep_goals_progress(iep_id);
CREATE INDEX IF NOT EXISTS idx_meetings_iep ON iep_meetings(iep_id);
CREATE INDEX IF NOT EXISTS idx_assistive_tech_student ON assistive_technology(student_id);
CREATE INDEX IF NOT EXISTS idx_language_student ON language_support(student_id);

COMMENT ON TABLE student_ieps IS 'Individualized Education Programs for students with special needs';
COMMENT ON TABLE accessibility_settings IS 'User-specific accessibility preferences and settings';
COMMENT ON TABLE accommodation_tracking IS 'Tracking classroom accommodations and their effectiveness';
COMMENT ON TABLE assistive_technology IS 'Assistive technology devices assigned to students';
COMMENT ON TABLE language_support IS 'Language support and ESL/ELL tracking';
