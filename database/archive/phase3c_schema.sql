-- Phase 3C: Workload & Community Schema
-- Tables for teacher workload management and community features

-- Enhanced Timetable
CREATE TABLE IF NOT EXISTS teacher_timetable (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    day_of_week VARCHAR(20) CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')),
    period_number INTEGER,
    subject VARCHAR(100),
    class_name VARCHAR(100),
    room VARCHAR(50),
    start_time TIME,
    end_time TIME,
    academic_term VARCHAR(50),
    academic_year VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workload Metrics
CREATE TABLE IF NOT EXISTS teacher_workload (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    total_periods INTEGER DEFAULT 0,
    total_hours DECIMAL(5,2) DEFAULT 0,
    number_of_classes INTEGER DEFAULT 0,
    avg_class_size INTEGER DEFAULT 0,
    workload_score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(teacher_id, week_start_date)
);

-- Substitute Assignments
CREATE TABLE IF NOT EXISTS substitute_assignments (
    id SERIAL PRIMARY KEY,
    original_teacher_id INTEGER REFERENCES teachers(id),
    substitute_teacher_id INTEGER REFERENCES teachers(id),
    date DATE NOT NULL,
    period_number INTEGER,
    subject VARCHAR(100),
    class_name VARCHAR(100),
    reason VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Accepted', 'Declined', 'Completed')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Coverage Tracking
CREATE TABLE IF NOT EXISTS coverage_stats (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    period DATE,
    total_assignments INTEGER DEFAULT 0,
    accepted_assignments INTEGER DEFAULT 0,
    declined_assignments INTEGER DEFAULT 0,
    total_hours_covered DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(teacher_id, period)
);

-- Teacher Forum
CREATE TABLE IF NOT EXISTS forum_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    order_index INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS forum_threads (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES forum_categories(id) ON DELETE CASCADE,
    author_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS forum_replies (
    id SERIAL PRIMARY KEY,
    thread_id INTEGER REFERENCES forum_threads(id) ON DELETE CASCADE,
    author_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teacher Recognition
CREATE TABLE IF NOT EXISTS teacher_recognitions (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    recognized_by INTEGER REFERENCES teachers(id),
    recognition_type VARCHAR(100) CHECK (recognition_type IN ('Excellence', 'Innovation', 'Dedication', 'Leadership', 'Team Player')),
    title VARCHAR(255),
    description TEXT,
    points INTEGER DEFAULT 10,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Monthly Highlights
CREATE TABLE IF NOT EXISTS monthly_highlights (
    id SERIAL PRIMARY KEY,
    month DATE NOT NULL,
    highlight_type VARCHAR(100) CHECK (highlight_type IN ('Achievement', 'Event', 'Milestone', 'Announcement')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    featured_teacher_id INTEGER REFERENCES teachers(id),
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resource Sharing
CREATE TABLE IF NOT EXISTS shared_resources (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    resource_type VARCHAR(100) CHECK (resource_type IN ('Lesson Plan', 'Worksheet', 'Presentation', 'Assessment', 'Other')),
    subject VARCHAR(100),
    grade_level VARCHAR(50),
    file_url TEXT,
    download_count INTEGER DEFAULT 0,
    rating_sum INTEGER DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resource_ratings (
    id SERIAL PRIMARY KEY,
    resource_id INTEGER REFERENCES shared_resources(id) ON DELETE CASCADE,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resource_id, teacher_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_timetable_teacher ON teacher_timetable(teacher_id);
CREATE INDEX IF NOT EXISTS idx_workload_teacher ON teacher_workload(teacher_id);
CREATE INDEX IF NOT EXISTS idx_substitute_original ON substitute_assignments(original_teacher_id);
CREATE INDEX IF NOT EXISTS idx_substitute_substitute ON substitute_assignments(substitute_teacher_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_category ON forum_threads(category_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_thread ON forum_replies(thread_id);
CREATE INDEX IF NOT EXISTS idx_recognitions_teacher ON teacher_recognitions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_resources_teacher ON shared_resources(teacher_id);

-- Insert sample forum categories
INSERT INTO forum_categories (name, description, icon, order_index) VALUES
('General Discussion', 'General teaching topics and discussions', '💬', 1),
('Classroom Strategies', 'Share and discuss classroom management techniques', '📚', 2),
('Technology in Education', 'Digital tools and online teaching resources', '💻', 3),
('Subject Specific', 'Subject-focused discussions', '📖', 4),
('Professional Development', 'Career growth and PD opportunities', '🎓', 5);

COMMENT ON TABLE teacher_timetable IS 'Weekly timetable schedules for teachers';
COMMENT ON TABLE teacher_workload IS 'Calculated workload metrics per teacher per week';
COMMENT ON TABLE substitute_assignments IS 'Substitute teacher coverage assignments';
COMMENT ON TABLE forum_threads IS 'Teacher forum discussion threads';
COMMENT ON TABLE teacher_recognitions IS 'Peer recognition and appreciation';
COMMENT ON TABLE shared_resources IS 'Teaching resources shared among teachers';
