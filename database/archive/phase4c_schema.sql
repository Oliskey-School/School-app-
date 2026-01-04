-- Phase 4C: Sanitation & Menstruation Support Schema
-- Tables for facilities management and menstrual health support

-- Facilities Status
CREATE TABLE IF NOT EXISTS facilities_status (
    id SERIAL PRIMARY KEY,
    facility_type VARCHAR(100) CHECK (facility_type IN ('Toilet', 'Latrine', 'Washroom', 'Water Point', 'Sanitation Station')),
    location VARCHAR(255) NOT NULL,
    gender VARCHAR(50) CHECK (gender IN ('Male', 'Female', 'Unisex', 'Staff')),
    capacity INTEGER,
    status VARCHAR(50) DEFAULT 'Operational' CHECK (status IN ('Operational', 'Needs Cleaning', 'Needs Repair', 'Out of Service')),
    last_cleaned TIMESTAMP,
    last_checked TIMESTAMP,
    next_cleaning_due TIMESTAMP,
    maintenance_needed BOOLEAN DEFAULT false,
    reported_issues TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sanitation Reports
CREATE TABLE IF NOT EXISTS sanitation_reports (
    id SERIAL PRIMARY KEY,
    facility_id INTEGER REFERENCES facilities_status(id) ON DELETE CASCADE,
    reported_by INTEGER REFERENCES users(id),
    is_anonymous BOOLEAN DEFAULT false,
    issue_type VARCHAR(100) CHECK (issue_type IN ('Dirty', 'Broken', 'No Water', 'No Soap', 'No Tissue', 'Blocked', 'Bad Odor', 'Other')),
    severity VARCHAR(50) CHECK (severity IN ('Low', 'Medium', 'High', 'Urgent')),
    description TEXT,
    photo_url TEXT,
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    resolved_by INTEGER REFERENCES users(id),
    resolution_notes TEXT
);

-- Menstrual Support Requests
CREATE TABLE IF NOT EXISTS menstrual_support_requests (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
    is_anonymous BOOLEAN DEFAULT true,
    request_type VARCHAR(100) CHECK (request_type IN ('Pads', 'Tampons', 'Pain Relief', 'Privacy Space', 'Clean Clothes')),
    quantity_needed INTEGER DEFAULT 1,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fulfilled BOOLEAN DEFAULT false,
    fulfilled_by INTEGER REFERENCES users(id),
    fulfilled_at TIMESTAMP,
    pickup_location VARCHAR(255),
    notes TEXT
);

-- Pads Donations
CREATE TABLE IF NOT EXISTS pads_donations (
    id SERIAL PRIMARY KEY,
    donor_name VARCHAR(255),
    donor_type VARCHAR(50) CHECK (donor_type IN ('Individual', 'Organization', 'Parent', 'NGO', 'Company')),
    quantity_donated INTEGER NOT NULL,
    product_type VARCHAR(100) DEFAULT 'Sanitary Pads',
    donation_date DATE DEFAULT CURRENT_DATE,
    campaign_id INTEGER,
    distributed_quantity INTEGER DEFAULT 0,
    remaining_quantity INTEGER,
    expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Menstrual Health Campaigns
CREATE TABLE IF NOT EXISTS menstrual_health_campaigns (
    id SERIAL PRIMARY KEY,
    campaign_name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    goal_quantity INTEGER,
    collected_quantity INTEGER DEFAULT 0,
    distributed_quantity INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Planning', 'Active', 'Completed', 'Cancelled')),
    description TEXT,
    coordinator_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Girls Attendance Tracking
CREATE TABLE IF NOT EXISTS girls_attendance_correlation (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    absence_date DATE NOT NULL,
    menstrual_related BOOLEAN,
    support_provided BOOLEAN DEFAULT false,
    follow_up_needed BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cleaning Schedule
CREATE TABLE IF NOT EXISTS cleaning_schedule (
    id SERIAL PRIMARY KEY,
    facility_id INTEGER REFERENCES facilities_status(id) ON DELETE CASCADE,
    scheduled_time TIMESTAMP NOT NULL,
    assigned_to VARCHAR(255),
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    inspection_passed BOOLEAN,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Menstrual Education Resources
CREATE TABLE IF NOT EXISTS menstrual_education_resources (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content_type VARCHAR(50) CHECK (content_type IN ('Article', 'Video', 'Infographic', 'Guide', 'FAQ')),
    description TEXT,
    content_url TEXT,
    target_audience VARCHAR(50) CHECK (target_audience IN ('Students', 'Parents', 'Teachers', 'All')),
    language VARCHAR(50) DEFAULT 'English',
    view_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_facilities_status ON facilities_status(status);
CREATE INDEX IF NOT EXISTS idx_facilities_location ON facilities_status(location);
CREATE INDEX IF NOT EXISTS idx_sanitation_reports_facility ON sanitation_reports(facility_id);
CREATE INDEX IF NOT EXISTS idx_sanitation_reports_resolved ON sanitation_reports(resolved);
CREATE INDEX IF NOT EXISTS idx_menstrual_requests_fulfilled ON menstrual_support_requests(fulfilled);
CREATE INDEX IF NOT EXISTS idx_pads_donations_campaign ON pads_donations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_girls_attendance_date ON girls_attendance_correlation(absence_date);

-- Insert sample facilities
INSERT INTO facilities_status (facility_type, location, gender, capacity, status) VALUES
('Toilet', 'Building A - Ground Floor', 'Female', 5, 'Operational'),
('Toilet', 'Building A - Ground Floor', 'Male', 5, 'Operational'),
('Latrine', 'Sports Field', 'Unisex', 2, 'Operational'),
('Washroom', 'Admin Block', 'Staff', 3, 'Operational');

-- Insert sample menstrual education resources
INSERT INTO menstrual_education_resources (title, content_type, description, target_audience) VALUES
('Understanding Menstruation', 'Guide', 'A comprehensive guide for young girls', 'Students'),
('Managing Period Pain', 'Article', 'Tips for managing menstrual cramps', 'Students'),
('Supporting Your Daughter', 'Article', 'Parent guide to menstrual health', 'Parents'),
('Menstrual Hygiene in Schools', 'Video', 'Educational video on maintaining hygiene', 'All');

COMMENT ON TABLE facilities_status IS 'School sanitation facilities tracking and monitoring';
COMMENT ON TABLE menstrual_support_requests IS 'Discreet requests for menstrual products and support';
COMMENT ON TABLE pads_donations IS 'Tracking donations of menstrual products';
COMMENT ON TABLE girls_attendance_correlation IS 'Track attendance patterns related to menstruation';
