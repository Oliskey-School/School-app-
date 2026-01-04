-- Phase 5B: Financial Support & Donations Schema
-- Tables for micro-donations, scholarships, and student sponsorships

-- Donation Campaigns
CREATE TABLE IF NOT EXISTS donation_campaigns (
    id SERIAL PRIMARY KEY,
    campaign_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    campaign_type VARCHAR(100) CHECK (campaign_type IN ('Books', 'Uniforms', 'Feeding', 'Infrastructure', 'Scholarships', 'General')),
    goal_amount NUMERIC(12,2) NOT NULL,
    raised_amount NUMERIC(12,2) DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE,
    banner_image_url TEXT,
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Draft', 'Active', 'Completed', 'Cancelled')),
    created_by INTEGER REFERENCES users(id),
    beneficiary_count INTEGER,
    impact_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Donors
CREATE TABLE IF NOT EXISTS donors (
    id SERIAL PRIMARY KEY,
    donor_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    donor_type VARCHAR(50) CHECK (donor_type IN ('Individual', 'Organization', 'Alumni', 'Anonymous')),
    is_anonymous BOOLEAN DEFAULT false,
    total_donated NUMERIC(12,2) DEFAULT 0,
    donation_count INTEGER DEFAULT 0,
    recognition_level VARCHAR(50), -- Bronze, Silver, Gold, Platinum
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Donations
CREATE TABLE IF NOT EXISTS donations (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES donation_campaigns(id) ON DELETE SET NULL,
    donor_id INTEGER REFERENCES donors(id),
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 100), -- Minimum ₦100
    currency VARCHAR(10) DEFAULT 'NGN',
    donation_type VARCHAR(50) CHECK (donation_type IN ('One-Time', 'Recurring')),
    payment_method VARCHAR(50) CHECK (payment_method IN ('Flutterwave', 'Paystack', 'Bank Transfer', 'Cash', 'Mobile Money')),
    transaction_ref VARCHAR(255) UNIQUE,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed', 'Failed', 'Refunded')),
    payment_date TIMESTAMP,
    receipt_url TEXT,
    tax_receipt_generated BOOLEAN DEFAULT false,
    is_anonymous BOOLEAN DEFAULT false,
    message TEXT, -- Thank you message or dedication
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Donation Receipts
CREATE TABLE IF NOT EXISTS donation_receipts (
    id SERIAL PRIMARY KEY,
    donation_id INTEGER REFERENCES donations(id) ON DELETE CASCADE UNIQUE,
    receipt_number VARCHAR(100) UNIQUE NOT NULL,
    issue_date DATE DEFAULT CURRENT_DATE,
    donor_name VARCHAR(255),
    amount NUMERIC(12,2) NOT NULL,
    campaign_name VARCHAR(255),
    receipt_pdf_url TEXT,
    sent_to_donor BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scholarships
CREATE TABLE IF NOT EXISTS scholarships (
    id SERIAL PRIMARY KEY,
    scholarship_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    scholarship_type VARCHAR(100) CHECK (scholarship_type IN ('Academic Merit', 'Financial Need', 'Sports', 'Arts', 'Special Talent', 'Full', 'Partial')),
    amount NUMERIC(12,2) NOT NULL,
    duration_years INTEGER DEFAULT 1,
    eligibility_criteria TEXT NOT NULL,
    available_slots INTEGER,
    filled_slots INTEGER DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE,
    funded_by VARCHAR(255), -- Donor or organization name
    status VARCHAR(50) DEFAULT 'Open' CHECK (status IN ('Draft', 'Open', 'Closed', 'Suspended')),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scholarship Applications
CREATE TABLE IF NOT EXISTS scholarship_applications (
    id SERIAL PRIMARY KEY,
    scholarship_id INTEGER REFERENCES scholarships(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    application_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    parent_id INTEGER REFERENCES parents(id),
    academic_performance TEXT,
    financial_need_statement TEXT,
    supporting_documents TEXT[], -- URLs to uploaded documents
    teacher_recommendation TEXT,
    status VARCHAR(50) DEFAULT 'Submitted' CHECK (status IN ('Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Waitlisted')),
    reviewed_by INTEGER REFERENCES users(id),
    review_notes TEXT,
    reviewed_at TIMESTAMP,
    award_amount NUMERIC(12,2),
    UNIQUE(scholarship_id, student_id)
);

-- Scholarship Recipients
CREATE TABLE IF NOT EXISTS scholarship_recipients (
    id SERIAL PRIMARY KEY,
    scholarship_id INTEGER REFERENCES scholarships(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    application_id INTEGER REFERENCES scholarship_applications(id),
    award_date DATE NOT NULL,
    award_amount NUMERIC(12,2) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    term VARCHAR(20),
    renewal_status VARCHAR(50) CHECK (renewal_status IN ('Active', 'Renewed', 'Expired', 'Revoked')),
    performance_review TEXT,
    next_review_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(scholarship_id, student_id, academic_year)
);

-- Sponsorship Requests (Anonymous)
CREATE TABLE IF NOT EXISTS sponsorship_requests (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    request_type VARCHAR(100) CHECK (request_type IN ('Full Sponsorship', 'Partial Fees', 'Books', 'Uniform', 'Feeding', 'Transport', 'Other')),
    description TEXT NOT NULL,
    amount_needed NUMERIC(12,2) NOT NULL,
    urgency VARCHAR(50) CHECK (urgency IN ('Low', 'Medium', 'High', 'Critical')),
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Matched', 'Funded', 'Rejected')),
    is_anonymous BOOLEAN DEFAULT true,
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sponsorships (Matching sponsors to students)
CREATE TABLE IF NOT EXISTS sponsorships (
    id SERIAL PRIMARY KEY,
    sponsorship_request_id INTEGER REFERENCES sponsorship_requests(id) ON DELETE CASCADE,
    donor_id INTEGER REFERENCES donors(id),
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    sponsorship_type VARCHAR(100),
    duration_months INTEGER,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Suspended', 'Cancelled')),
    is_anonymous BOOLEAN DEFAULT false,
    communication_allowed BOOLEAN DEFAULT false, -- Can sponsor and student communicate?
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sponsorship Updates (Progress reports to sponsors)
CREATE TABLE IF NOT EXISTS sponsorship_updates (
    id SERIAL PRIMARY KEY,
    sponsorship_id INTEGER REFERENCES sponsorships(id) ON DELETE CASCADE,
    update_type VARCHAR(50) CHECK (update_type IN ('Progress Report', 'Thank You', 'Milestone', 'Need Update')),
    message TEXT NOT NULL,
    academic_progress TEXT,
    photos TEXT[], -- URLs (anonymized if needed)
    created_by INTEGER REFERENCES users(id),
    sent_to_sponsor BOOLEAN DEFAULT false,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fund Disbursements
CREATE TABLE IF NOT EXISTS fund_disbursements (
    id SERIAL PRIMARY KEY,
    disbursement_type VARCHAR(50) CHECK (disbursement_type IN ('Scholarship', 'Sponsorship', 'Campaign', 'Other')),
    recipient_type VARCHAR(50) CHECK (recipient_type IN ('Student', 'School', 'Vendor', 'Other')),
    recipient_id INTEGER, -- Could be student_id or other
    amount NUMERIC(12,2) NOT NULL,
    purpose TEXT NOT NULL,
    payment_method VARCHAR(50),
    transaction_ref VARCHAR(255),
    disbursed_by INTEGER REFERENCES users(id),
    disbursement_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Completed', 'Failed')),
    proof_of_payment_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON donation_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON donation_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_donations_campaign ON donations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_donations_donor ON donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_scholarships_status ON scholarships(status);
CREATE INDEX IF NOT EXISTS idx_scholarship_apps_student ON scholarship_applications(student_id);
CREATE INDEX IF NOT EXISTS idx_scholarship_apps_status ON scholarship_applications(status);
CREATE INDEX IF NOT EXISTS idx_sponsorship_requests_status ON sponsorship_requests(status);
CREATE INDEX IF NOT EXISTS idx_sponsorships_student ON sponsorships(student_id);
CREATE INDEX IF NOT EXISTS idx_sponsorships_donor ON sponsorships(donor_id);

COMMENT ON TABLE donation_campaigns IS 'Fundraising campaigns for school needs';
COMMENT ON TABLE donations IS 'Individual donation transactions with payment tracking';
COMMENT ON TABLE scholarships IS 'Scholarship programs for students';
COMMENT ON TABLE sponsorship_requests IS 'Anonymous student sponsorship needs';
COMMENT ON TABLE sponsorships IS 'Active student-sponsor matches';
COMMENT ON TABLE fund_disbursements IS 'Tracking of fund allocation and payment';
