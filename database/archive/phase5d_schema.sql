-- Phase 5D: Community Resources & Referrals Schema
-- Tables for mapping community support resources and family referrals

-- Community Resources
CREATE TABLE IF NOT EXISTS community_resources (
    id SERIAL PRIMARY KEY,
    resource_name VARCHAR(255) NOT NULL,
    resource_category VARCHAR(100) CHECK (resource_category IN ('Health', 'Food Support', 'Vocational Training', 'Legal Aid', 'Youth Programs', 'Mental Health', 'Emergency Shelter', 'Other')),
    description TEXT NOT NULL,
    address TEXT,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    lga VARCHAR(100), -- Local Government Area
    state VARCHAR(100) DEFAULT 'Lagos',
    phone_number VARCHAR(20),
    email VARCHAR(255),
    website_url TEXT,
    operating_hours TEXT,
    eligibility_criteria TEXT,
    services_offered TEXT[],
    languages_spoken TEXT[],
    is_free BOOLEAN DEFAULT false,
    cost_details TEXT,
    is_active BOOLEAN DEFAULT true,
    verified BOOLEAN DEFAULT false,
    verified_by INTEGER REFERENCES users(id),
    verified_at TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resource Categories (for organization)
CREATE TABLE IF NOT EXISTS resource_categories (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon_name VARCHAR(50),
    display_order INTEGER,
    is_active BOOLEAN DEFAULT true
);

-- Resource Contacts (for detailed contact info)
CREATE TABLE IF NOT EXISTS resource_contacts (
    id SERIAL PRIMARY KEY,
    resource_id INTEGER REFERENCES community_resources(id) ON DELETE CASCADE,
    contact_name VARCHAR(255),
    contact_title VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    is_primary BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Family Referrals
CREATE TABLE IF NOT EXISTS family_referrals (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES parents(id),
    submitted_by INTEGER REFERENCES users(id), -- Could be admin, teacher, social worker
    referral_type VARCHAR(100) CHECK (referral_type IN ('Health', 'Food', 'Shelter', 'Legal', 'Counseling', 'Financial', 'Other')),
    need_description TEXT NOT NULL,
    urgency VARCHAR(50) CHECK (urgency IN ('Low', 'Medium', 'High', 'Critical')) DEFAULT 'Medium',
    status VARCHAR(50) DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Under Review', 'Matched', 'In Progress', 'Resolved', 'Closed')),
    is_confidential BOOLEAN DEFAULT true,
    preferred_resource_id INTEGER REFERENCES community_resources(id),
    assigned_to INTEGER REFERENCES users(id), -- Social worker/admin handling
    assigned_at TIMESTAMP,
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Referral Outcomes (tracking results)
CREATE TABLE IF NOT EXISTS referral_outcomes (
    id SERIAL PRIMARY KEY,
    referral_id INTEGER REFERENCES family_referrals(id) ON DELETE CASCADE,
    resource_id INTEGER REFERENCES community_resources(id),
    contact_date DATE,
    service_received TEXT,
    outcome_status VARCHAR(50) CHECK (outcome_status IN ('Successful', 'Partially Resolved', 'Unresolved', 'Declined', 'Follow-up Needed')),
    follow_up_date DATE,
    notes TEXT,
    recorded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Referral Tracking (audit trail)
CREATE TABLE IF NOT EXISTS referral_tracking (
    id SERIAL PRIMARY KEY,
    referral_id INTEGER REFERENCES family_referrals(id) ON DELETE CASCADE,
    action VARCHAR(50) CHECK (action IN ('Submitted', 'Reviewed', 'Assigned', 'Contact Attempted', 'Service Provided', 'Follow-up', 'Closed')),
    action_by INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resource Usage Stats
CREATE TABLE IF NOT EXISTS resource_usage_stats (
    id SERIAL PRIMARY KEY,
    resource_id INTEGER REFERENCES community_resources(id) ON DELETE CASCADE,
    referral_count INTEGER DEFAULT 0,
    successful_referrals INTEGER DEFAULT 0,
    last_referral_date DATE,
    rating_avg DECIMAL(3,2),
    review_count INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resource Reviews (from families)
CREATE TABLE IF NOT EXISTS resource_reviews (
    id SERIAL PRIMARY KEY,
    resource_id INTEGER REFERENCES community_resources(id) ON DELETE CASCADE,
    reviewed_by INTEGER REFERENCES users(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    helpful_count INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resource Availability (hours, capacity)
CREATE TABLE IF NOT EXISTS resource_availability (
    id SERIAL PRIMARY KEY,
    resource_id INTEGER REFERENCES community_resources(id) ON DELETE CASCADE,
    day_of_week VARCHAR(20),
    open_time TIME,
    close_time TIME,
    capacity INTEGER,
    current_usage INTEGER DEFAULT 0,
    notes TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_community_resources_category ON community_resources(resource_category);
CREATE INDEX IF NOT EXISTS idx_community_resources_location ON community_resources(lga, state);
CREATE INDEX IF NOT EXISTS idx_community_resources_active ON community_resources(is_active);
CREATE INDEX IF NOT EXISTS idx_family_referrals_student ON family_referrals(student_id);
CREATE INDEX IF NOT EXISTS idx_family_referrals_status ON family_referrals(status);
CREATE INDEX IF NOT EXISTS idx_family_referrals_urgency ON family_referrals(urgency);
CREATE INDEX IF NOT EXISTS idx_referral_outcomes_referral ON referral_outcomes(referral_id);
CREATE INDEX IF NOT EXISTS idx_resource_reviews_resource ON resource_reviews(resource_id);

-- Insert sample resource categories
INSERT INTO resource_categories (category_name, description, icon_name, display_order) VALUES
('Health', 'Primary health centres, clinics, hospitals', 'heart', 1),
('Food Support', 'Food banks, feeding programs, nutrition assistance', 'utensils', 2),
('Vocational Training', 'Skills acquisition, job training, apprenticeships', 'briefcase', 3),
('Legal Aid', 'Free legal services, advocacy, rights protection', 'scales', 4),
('Youth Programs', 'After-school programs, mentorship, sports', 'users', 5),
('Mental Health', 'Counseling, support groups, crisis intervention', 'brain', 6),
('Emergency Shelter', 'Housing assistance, temporary shelter', 'home', 7),
('Other', 'Other community support services', 'help-circle', 8);

-- Insert sample community resources (Nigerian context)
INSERT INTO community_resources (
    resource_name, resource_category, description, address, lga, state, 
    phone_number, services_offered, languages_spoken, is_free, is_active, verified
) VALUES
(
    'Ikorodu Primary Health Centre',
    'Health',
    'Government health facility providing basic healthcare, immunization, and maternal services',
    '12 Lagos Road, Ikorodu',
    'Ikorodu',
    'Lagos',
    '080XXXXXXXX',
    ARRAY['Immunization', 'Prenatal Care', 'General Consultation', 'Child Health'],
    ARRAY['English', 'Yoruba'],
    true,
    true,
    true
),
(
    'Lagos Food Bank Initiative',
    'Food Support',
    'NGO providing food relief to families in need',
    'Yaba, Lagos',
    'Lagos Mainland',
    'Lagos',
    '080YYYYYYYY',
    ARRAY['Food Packages', 'Hot Meals', 'Nutrition Education'],
    ARRAY['English', 'Yoruba', 'Igbo'],
    true,
    true,
    true
),
(
    'SMEDAN Skills Acquisition Center',
    'Vocational Training',
    'Government vocational training for youth and adults',
    'Ikeja',
    'Ikeja',
    'Lagos',
    '080ZZZZZZZ',
    ARRAY['Tailoring', 'Catering', 'Computer Training', 'Welding'],
    ARRAY['English', 'Yoruba', 'Pidgin'],
    false,
    true,
    true
);

COMMENT ON TABLE community_resources IS 'Directory of community support services (health, food, training, etc.)';
COMMENT ON TABLE family_referrals IS 'Referrals connecting families to community resources';
COMMENT ON TABLE referral_outcomes IS 'Tracking results and effectiveness of referrals';
COMMENT ON TABLE resource_usage_stats IS 'Analytics on resource utilization and success rates';
