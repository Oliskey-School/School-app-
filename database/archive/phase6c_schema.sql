-- Phase 6C: Policy & Compliance Schema
-- Purpose: Data governance, privacy, NDPR compliance, audit trails
-- Nigerian Context: NDPR (Nigeria Data Protection Regulation) compliance

-- =============================================
-- Data Classifications (For Privacy Controls)
-- =============================================

CREATE TABLE IF NOT EXISTS data_classifications (
    id SERIAL PRIMARY KEY,
    classification_level VARCHAR(50) NOT NULL UNIQUE, -- 'Public', 'Internal', 'Confidential', 'Restricted'
    description TEXT,
    retention_period_months INTEGER, -- How long to retain
    requires_encryption BOOLEAN DEFAULT false,
    requires_consent BOOLEAN DEFAULT false,
    access_level VARCHAR(50), -- Who can access
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert NDPR-compliant data classifications
INSERT INTO data_classifications (classification_level, description, retention_period_months, requires_encryption, requires_consent, access_level) VALUES
('Public', 'Publicly available information (school name, location)', NULL, false, false, 'All'),
('Internal', 'Internal school information (class schedules, announcements)', 24, false, false, 'Staff Only'),
('Confidential', 'Student records, grades, attendance', 60, true, true, 'Authorized Staff'),
('Restricted', 'Health records, financial data, security information', 84, true, true, 'Admin Only')
ON CONFLICT (classification_level) DO NOTHING;

-- =============================================
-- Consent Logs (NDPR Requirement)
-- =============================================

CREATE TABLE IF NOT EXISTS consent_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    user_type VARCHAR(20), -- 'parent', 'student', 'teacher'
    
    consent_type VARCHAR(100) NOT NULL, -- 'DataProcessing', 'PhotoVideo', 'ThirdPartySharing', 'Marketing'
    purpose TEXT NOT NULL, -- Why consent is needed
    
    consent_given BOOLEAN DEFAULT false,
    consent_date TIMESTAMP,
    consent_withdrawn BOOLEAN DEFAULT false,
    withdrawal_date TIMESTAMP,
    
    -- NDPR Requirements
    data_subject_name VARCHAR(200), -- Person giving consent
    data_subject_email VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    
    -- For minors (students)
    is_minor BOOLEAN DEFAULT false,
    parent_guardian_name VARCHAR(200),
    parent_guardian_email VARCHAR(100),
    parent_consent_date TIMESTAMP,
    
    consent_version VARCHAR(20), -- Track policy version
    consent_text TEXT, -- Full consent text shown
    
    expiry_date DATE, -- Some consents expire
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_consent_user ON consent_logs(user_id, user_type);
CREATE INDEX idx_consent_type ON consent_logs(consent_type);
CREATE INDEX idx_consent_status ON consent_logs(consent_given, consent_withdrawn);

-- =============================================
-- Retention Policies (Automated Data Deletion)
-- =============================================

CREATE TABLE IF NOT EXISTS retention_policies (
    id SERIAL PRIMARY KEY,
    policy_name VARCHAR(100) NOT NULL,
    data_type VARCHAR(100) NOT NULL, -- 'student_records', 'attendance', 'financial', 'messages'
    table_name VARCHAR(100),
    
    retention_period_months INTEGER NOT NULL,
    retention_basis VARCHAR(100), -- 'Legal Requirement', 'Business Need', 'Consent Based'
    
    auto_delete BOOLEAN DEFAULT false,
    notify_before_deletion BOOLEAN DEFAULT true,
    notification_days INTEGER DEFAULT 30,
    
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_retention_table ON retention_policies(table_name);

-- Insert default NDPR-compliant retention policies
INSERT INTO retention_policies (policy_name, data_type, table_name, retention_period_months, retention_basis, auto_delete, created_by) VALUES
('Student Records Retention', 'student_records', 'students', 60, 'Legal Requirement', false, 1),
('Attendance Records', 'attendance', 'student_attendance', 36, 'Legal Requirement', false, 1),
('Financial Records', 'financial', 'payments', 84, 'Legal Requirement', false, 1),
('Communication Logs', 'messages', 'messages', 24, 'Business Need', true, 1),
('Consent Records', 'consent', 'consent_logs', 120, 'Legal Requirement', false, 1);

-- =============================================
-- Data Deletion Logs (Audit Trail for Deletions)
-- =============================================

CREATE TABLE IF NOT EXISTS data_deletion_logs (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER,
    record_data JSONB, -- Anonymized snapshot before deletion
    
    deletion_reason VARCHAR(200), -- 'Retention Policy', 'User Request', 'Legal Obligation'
    policy_id INTEGER REFERENCES retention_policies(id),
    
    deleted_by INTEGER REFERENCES users(id),
    deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP
);

CREATE INDEX idx_deletion_table ON data_deletion_logs(table_name);
CREATE INDEX idx_deletion_date ON data_deletion_logs(deleted_at DESC);

-- =============================================
-- Audit Trails (Comprehensive Action Logging)
-- =============================================

CREATE TABLE IF NOT EXISTS audit_trails (
    id SERIAL PRIMARY KEY,
    
    -- Who
    user_id INTEGER REFERENCES users(id),
    user_email VARCHAR(100),
    user_role VARCHAR(50),
    
    -- What
    action_type VARCHAR(100) NOT NULL, -- 'Create', 'Read', 'Update', 'Delete', 'Export', 'Login', 'Logout'
    resource_type VARCHAR(100), -- 'student', 'payment', 'grade', 'user'
    resource_id INTEGER,
    
    -- Details
    action_description TEXT,
    old_values JSONB, -- Before state
    new_values JSONB, -- After state
    
    -- When & Where
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    location VARCHAR(200),
    
    -- Result
    status VARCHAR(20) DEFAULT 'Success', -- 'Success', 'Failed', 'Blocked'
    error_message TEXT,
    
    -- Security
    risk_level VARCHAR(20) DEFAULT 'Low', -- 'Low', 'Medium', 'High', 'Critical'
    is_sensitive BOOLEAN DEFAULT false,
    
    -- Compliance
    requires_review BOOLEAN DEFAULT false,
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP
);

CREATE INDEX idx_audit_user ON audit_trails(user_id);
CREATE INDEX idx_audit_action ON audit_trails(action_type);
CREATE INDEX idx_audit_resource ON audit_trails(resource_type, resource_id);
CREATE INDEX idx_audit_date ON audit_trails(performed_at DESC);
CREATE INDEX idx_audit_risk ON audit_trails(risk_level) WHERE risk_level IN ('High', 'Critical');

-- =============================================
-- Compliance Checks (Automated Compliance Monitoring)
-- =============================================

CREATE TABLE IF NOT EXISTS compliance_checks (
    id SERIAL PRIMARY KEY,
    check_name VARCHAR(200) NOT NULL,
    check_category VARCHAR(100), -- 'NDPR', 'Security', 'DataRetention', 'AccessControl'
    description TEXT,
    
    -- Check Configuration
    check_query TEXT, -- SQL query to run
    check_frequency VARCHAR(50), -- 'Daily', 'Weekly', 'Monthly'
    threshold_value DECIMAL(10,2),
    comparison_operator VARCHAR(10), -- '>', '<', '=', '>=', '<='
    
    -- Status
    last_run_at TIMESTAMP,
    last_result VARCHAR(20), -- 'Pass', 'Fail', 'Warning'
    last_result_value DECIMAL(10,2),
    
    is_active BOOLEAN DEFAULT true,
    is_critical BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_compliance_category ON compliance_checks(check_category);
CREATE INDEX idx_compliance_status ON compliance_checks(last_result) WHERE is_active = true;

-- =============================================
-- Policy Violations (Security & Compliance Incidents)
-- =============================================

CREATE TABLE IF NOT EXISTS policy_violations (
    id SERIAL PRIMARY KEY,
    violation_type VARCHAR(100) NOT NULL, -- 'DataBreach', 'UnauthorizedAccess', 'ConsentViolation', 'RetentionViolation'
    severity VARCHAR(20) DEFAULT 'Medium', -- 'Low', 'Medium', 'High', 'Critical'
    
title VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Who & What
    violator_user_id INTEGER REFERENCES users(id),
    affected_data_type VARCHAR(100),
    affected_records_count INTEGER,
    
    -- Detection
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    detected_by VARCHAR(100), -- 'System', or user ID
    detection_method VARCHAR(100), -- 'Automated', 'User Report', 'Audit Review'
    
    -- Resolution
    status VARCHAR(20) DEFAULT 'Open', -- 'Open', 'InvestigatingResolving', 'Resolved', 'Closed'
    assigned_to INTEGER REFERENCES users(id),
    resolution_notes TEXT,
    resolved_at TIMESTAMP,
    
    -- Compliance Reporting
    reported_to_authority BOOLEAN DEFAULT false,
    authority_name VARCHAR(200), -- e.g., 'NITDA' (Nigeria)
    report_date DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_violations_type ON policy_violations(violation_type);
CREATE INDEX idx_violations_severity ON policy_violations(severity);
CREATE INDEX idx_violations_status ON policy_violations(status);
CREATE INDEX idx_violations_date ON policy_violations(detected_at DESC);

-- =============================================
-- Security Incidents (Cybersecurity Events)
-- =============================================

CREATE TABLE IF NOT EXISTS security_incidents (
    id SERIAL PRIMARY KEY,
    incident_number VARCHAR(50) UNIQUE NOT NULL,
    
    incident_type VARCHAR(100) NOT NULL, -- 'Malware', 'PhishingAttempt', 'BruteForce', 'DDoS', 'DataExfiltration'
    severity VARCHAR(20) DEFAULT 'Medium',
    
    title VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Impact
    systems_affected TEXT[],
    data_compromised BOOLEAN DEFAULT false,
    estimated_impact VARCHAR(200),
    
    -- Timeline
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    occurred_at TIMESTAMP,
    contained_at TIMESTAMP,
    resolved_at TIMESTAMP,
    
    -- Response
    status VARCHAR(20) DEFAULT 'Detected', -- 'Detected', 'Analyzing', 'Containing', 'Eradicating', 'Recovering', 'Resolved'
    incident_commander INTEGER REFERENCES users(id),
    response_team TEXT[], -- Array of user IDs
    
    -- Documentation
    root_cause TEXT,
    mitigation_steps TEXT,
    lessons_learned TEXT,
    
    -- Reporting
    requires_regulatory_report BOOLEAN DEFAULT false,
    reported_to_nitda BOOLEAN DEFAULT false, -- Nigeria IT Development Agency
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_incidents_number ON security_incidents(incident_number);
CREATE INDEX idx_incidents_type ON security_incidents(incident_type);
CREATE INDEX idx_incidents_severity ON security_incidents(severity);
CREATE INDEX idx_incidents_status ON security_incidents(status);

-- =============================================
-- Sample Data: Consent Logs
-- =============================================

-- Sample parent consents for data processing
INSERT INTO consent_logs (user_id, user_type, consent_type, purpose, consent_given, consent_date, is_minor, parent_guardian_name, parent_guardian_email, consent_version) 
SELECT 
    p.id,
    'parent',
    'DataProcessing',
    'Collection and processing of student academic and personal data for educational purposes',
    true,
    CURRENT_TIMESTAMP - INTERVAL '30 days',
    false,
    p.name,
    p.email,
    'v1.0'
FROM parents p
LIMIT 10;

-- =============================================
-- Sample Data: Compliance Checks
-- =============================================

INSERT INTO compliance_checks (check_name, check_category, description, check_frequency, threshold_value, comparison_operator, is_critical, created_by) VALUES
('Consent Coverage', 'NDPR', 'Percentage of parents with valid data processing consent', 'Weekly', 95.0, '>=', true, 1),
('Overdue Data Deletion', 'DataRetention', 'Number of records exceeding retention period', 'Daily', 0, '=', true, 1),
('Failed Login Attempts', 'Security', 'Excessive failed login attempts in last 24 hours', 'Daily', 100, '<', false, 1),
('Unencrypted Sensitive Data', 'Security', 'Count of confidential records without encryption', 'Weekly', 0, '=', true, 1),
('Expired Consents', 'NDPR', 'Number of expired consent records', 'Weekly', 10, '<', false, 1);

COMMENT ON TABLE data_classifications IS 'NDPR-compliant data classification levels';
COMMENT ON TABLE consent_logs IS 'Parent and user consent tracking for NDPR compliance';
COMMENT ON TABLE retention_policies IS 'Automated data retention and deletion policies';
COMMENT ON TABLE audit_trails IS 'Comprehensive audit trail for all system actions';
COMMENT ON TABLE compliance_checks IS 'Automated compliance monitoring and alerts';
COMMENT ON TABLE policy_violations IS 'Data protection and policy violation tracking';
COMMENT ON TABLE security_incidents IS 'Cybersecurity incident management and reporting';
