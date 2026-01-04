-- Phase 3B: Professional Development Schema
-- Tables for teacher professional development and training

-- PD Courses
CREATE TABLE IF NOT EXISTS pd_courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    level VARCHAR(50) CHECK (level IN ('Beginner', 'Intermediate', 'Advanced')),
    duration_hours INTEGER,
    instructor VARCHAR(255),
    thumbnail_url TEXT,
    video_url TEXT,
    materials_url TEXT,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Course Modules (lessons within a course)
CREATE TABLE IF NOT EXISTS course_modules (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES pd_courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    content_type VARCHAR(50) CHECK (content_type IN ('Video', 'Reading', 'Quiz', 'Assignment')),
    content_url TEXT,
    duration_minutes INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teacher Course Enrollment
CREATE TABLE IF NOT EXISTS teacher_course_enrollments (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES pd_courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'In Progress' CHECK (status IN ('In Progress', 'Completed', 'Dropped')),
    progress_percentage INTEGER DEFAULT 0,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    UNIQUE(teacher_id, course_id)
);

-- Module Progress Tracking
CREATE TABLE IF NOT EXISTS module_progress (
    id SERIAL PRIMARY KEY,
    enrollment_id INTEGER REFERENCES teacher_course_enrollments(id) ON DELETE CASCADE,
    module_id INTEGER REFERENCES course_modules(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    time_spent_minutes INTEGER DEFAULT 0,
    UNIQUE(enrollment_id, module_id)
);

-- Course Certificates
CREATE TABLE IF NOT EXISTS pd_certificates (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES pd_courses(id) ON DELETE CASCADE,
    certificate_number VARCHAR(100) UNIQUE NOT NULL,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    certificate_url TEXT,
    expiry_date TIMESTAMP
);

-- Achievement Badges
CREATE TABLE IF NOT EXISTS pd_badges (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon_url TEXT,
    criteria TEXT,
    points INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teacher Earned Badges
CREATE TABLE IF NOT EXISTS teacher_badges (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    badge_id INTEGER REFERENCES pd_badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(teacher_id, badge_id)
);

-- Mentoring Matches
CREATE TABLE IF NOT EXISTS mentoring_matches (
    id SERIAL PRIMARY KEY,
    mentor_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    mentee_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    subject_area VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Cancelled')),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    notes TEXT
);

-- PD Events/Workshops
CREATE TABLE IF NOT EXISTS pd_events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(100) CHECK (event_type IN ('Workshop', 'Seminar', 'Conference', 'Training')),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    location VARCHAR(255),
    is_virtual BOOLEAN DEFAULT false,
    max_participants INTEGER,
    organizer VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Event Registrations
CREATE TABLE IF NOT EXISTS event_registrations (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES pd_events(id) ON DELETE CASCADE,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    attendance_status VARCHAR(50) DEFAULT 'Registered' CHECK (attendance_status IN ('Registered', 'Attended', 'Cancelled', 'No Show')),
    UNIQUE(event_id, teacher_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_course_enrollments_teacher ON teacher_course_enrollments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON teacher_course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_enrollment ON module_progress(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_certificates_teacher ON pd_certificates(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_badges_teacher ON teacher_badges(teacher_id);
CREATE INDEX IF NOT EXISTS idx_mentoring_mentor ON mentoring_matches(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentoring_mentee ON mentoring_matches(mentee_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_teacher ON event_registrations(teacher_id);

-- Insert sample PD courses
INSERT INTO pd_courses (title, description, category, level, duration_hours, instructor, is_published) VALUES
('Effective Classroom Management', 'Learn strategies for managing diverse classrooms', 'Pedagogy', 'Beginner', 8, 'Dr. Amina Mohammed', true),
('Advanced Mathematics Teaching', 'Modern approaches to teaching mathematics', 'Subject Matter', 'Advanced', 12, 'Prof. Chukwudi Okafor', true),
('Digital Learning Tools', 'Master digital tools for online and hybrid teaching', 'Technology', 'Intermediate', 10, 'Ms. Funmi Adeyemi', true),
('Student Assessment Strategies', 'Comprehensive guide to student evaluation', 'Assessment', 'Intermediate', 6, 'Dr. Ibrahim Yusuf', true),
('Inclusive Education Practices', 'Teaching students with diverse needs', 'Pedagogy', 'Beginner', 8, 'Mrs. Grace Eze', true);

-- Insert sample badges
INSERT INTO pd_badges (name, description, icon_url, criteria, points) VALUES
('First Course', 'Complete your first PD course', '🎓', 'Complete 1 course', 10),
('Learning Champion', 'Complete 5 PD courses', '🏆', 'Complete 5 courses', 50),
('Subject Expert', 'Complete advanced course in your subject', '⭐', 'Complete 1 advanced course', 30),
('Digital Pioneer', 'Master digital teaching tools', '💻', 'Complete Digital Learning Tools course', 20),
('Mentor', 'Mentor a fellow teacher for 3 months', '🤝', 'Complete 3 months of mentoring', 40);

COMMENT ON TABLE pd_courses IS 'Professional development courses available to teachers';
COMMENT ON TABLE teacher_course_enrollments IS 'Tracks which teachers are enrolled in which PD courses';
COMMENT ON TABLE module_progress IS 'Tracks progress through individual course modules';
COMMENT ON TABLE pd_certificates IS 'Certificates awarded upon course completion';
COMMENT ON TABLE pd_badges IS 'Achievement badges that teachers can earn';
COMMENT ON TABLE teacher_badges IS 'Badges earned by teachers';
COMMENT ON TABLE mentoring_matches IS 'Teacher-to-teacher mentoring relationships';
COMMENT ON TABLE pd_events IS 'Professional development events, workshops, and conferences';
