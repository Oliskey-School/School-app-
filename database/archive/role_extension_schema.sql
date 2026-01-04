-- ============================================================================
-- Role Extension Schema - Add New User Roles
-- ============================================================================
-- Run this AFTER Phase 1 schema
-- Adds 4 new roles while preserving existing ones
-- ============================================================================

-- ====================
-- NEW ROLE TABLES
-- ====================

-- Proprietors/Owners Table
CREATE TABLE IF NOT EXISTS proprietors (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  school_ownership_type TEXT CHECK (school_ownership_type IN ('Sole Proprietor', 'Partnership', 'Corporate')),
  ownership_percentage DECIMAL(5,2),
  business_registration_number TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inspectors Table (Ministry / Regulatory Body)
CREATE TABLE IF NOT EXISTS inspectors (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  organization TEXT NOT NULL, -- e.g., "Ministry of Education", "Quality Assurance Agency"
  inspector_id TEXT UNIQUE, -- Official inspector ID
  certification_number TEXT,
  inspection_areas TEXT[], -- Areas of expertise
  assigned_region TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exam Officers Table
CREATE TABLE IF NOT EXISTS exam_officers (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  employee_id TEXT UNIQUE,
  exam_center_code TEXT,
  authorized_exam_levels TEXT[], -- e.g., ["Primary", "Secondary", "WAEC", "NECO"]
  certifications TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compliance Officers Table
CREATE TABLE IF NOT EXISTS compliance_officers (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  employee_id TEXT UNIQUE,
  compliance_areas TEXT[], -- e.g., ["Safety", "Curriculum", "Finance", "HR"]
  certifications TEXT[],
  reporting_to BIGINT, -- Can reference admin or proprietor
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================
-- AUDIT & ACTIVITY TRACKING
-- ====================

-- Inspection Reports (for Inspectors)
CREATE TABLE IF NOT EXISTS inspection_reports (
  id BIGSERIAL PRIMARY KEY,
  inspector_id BIGINT REFERENCES inspectors(id),
  inspection_date DATE NOT NULL,
  inspection_type TEXT CHECK (inspection_type IN ('Routine', 'Complaint-Based', 'Follow-up', 'Certification')),
  areas_inspected TEXT[],
  findings TEXT,
  recommendations TEXT,
  compliance_rating TEXT CHECK (compliance_rating IN ('Excellent', 'Good', 'Satisfactory', 'Needs Improvement', 'Non-Compliant')),
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date DATE,
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Reviewed', 'Published')),
  attachments_urls TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compliance Audits (for Compliance Officers)
CREATE TABLE IF NOT EXISTS compliance_audits (
  id BIGSERIAL PRIMARY KEY,
  compliance_officer_id BIGINT REFERENCES compliance_officers(id),
  audit_date DATE NOT NULL,
  audit_type TEXT, -- e.g., "Safety Audit", "Financial Compliance", "Curriculum Review"
  audit_area TEXT NOT NULL,
  findings TEXT,
  issues_identified INTEGER DEFAULT 0,
  issues_resolved INTEGER DEFAULT 0,
  recommendations TEXT,
  priority TEXT CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  status TEXT DEFAULT 'In Progress' CHECK (status IN ('Scheduled', 'In Progress', 'Completed', 'Closed')),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exam Sessions (for Exam Officers)
CREATE TABLE IF NOT EXISTS exam_sessions (
  id BIGSERIAL PRIMARY KEY,
  exam_officer_id BIGINT REFERENCES exam_officers(id),
  session_name TEXT NOT NULL,
  exam_type TEXT, -- e.g., "Mid-Term", "Final", "WAEC", "NECO"
  exam_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  venue TEXT,
  total_candidates INTEGER,
  invigilators TEXT[],
  materials_checklist JSONB,
  status TEXT DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'In Progress', 'Completed', 'Cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================
-- EXTEND PROFILES TABLE (if exists)
-- ====================

-- Add new role type enum if profiles table exists
-- Note: Run this if you have a profiles table, otherwise skip

-- ALTER TABLE profiles 
-- DROP CONSTRAINT IF EXISTS profiles_role_check;

-- ALTER TABLE profiles 
-- ADD CONSTRAINT profiles_role_check 
-- CHECK (role IN ('Administrator', 'Teacher', 'Parent', 'Student', 'Proprietor', 'Inspector', 'Exam Officer', 'Compliance Officer'));

-- ====================
-- INDEXES
-- ====================

CREATE INDEX idx_proprietors_email ON proprietors(email);
CREATE INDEX idx_proprietors_active ON proprietors(is_active);

CREATE INDEX idx_inspectors_email ON inspectors(email);
CREATE INDEX idx_inspectors_organization ON inspectors(organization);
CREATE INDEX idx_inspectors_active ON inspectors(is_active);

CREATE INDEX idx_exam_officers_email ON exam_officers(email);
CREATE INDEX idx_exam_officers_active ON exam_officers(is_active);

CREATE INDEX idx_compliance_officers_email ON compliance_officers(email);
CREATE INDEX idx_compliance_officers_areas ON compliance_officers USING GIN (compliance_areas);
CREATE INDEX idx_compliance_officers_active ON compliance_officers(is_active);

CREATE INDEX idx_inspection_reports_inspector ON inspection_reports(inspector_id);
CREATE INDEX idx_inspection_reports_date ON inspection_reports(inspection_date);
CREATE INDEX idx_inspection_reports_status ON inspection_reports(status);

CREATE INDEX idx_compliance_audits_officer ON compliance_audits(compliance_officer_id);
CREATE INDEX idx_compliance_audits_date ON compliance_audits(audit_date);
CREATE INDEX idx_compliance_audits_priority ON compliance_audits(priority);

CREATE INDEX idx_exam_sessions_officer ON exam_sessions(exam_officer_id);
CREATE INDEX idx_exam_sessions_date ON exam_sessions(exam_date);

-- ====================
-- COMMENTS
-- ====================

COMMENT ON TABLE proprietors IS 'School owners and proprietors';
COMMENT ON TABLE inspectors IS 'Government/regulatory inspectors';
COMMENT ON TABLE exam_officers IS 'Exam administration officers';
COMMENT ON TABLE compliance_officers IS 'Internal compliance and quality assurance officers';
COMMENT ON TABLE inspection_reports IS 'Reports from regulatory inspections';
COMMENT ON TABLE compliance_audits IS 'Internal compliance audit records';
COMMENT ON TABLE exam_sessions IS 'Exam session management';

SELECT '✅ Role Extension Schema Applied Successfully!' as status;
SELECT '📊 New Roles Added: Proprietor, Inspector, Exam Officer, Compliance Officer' as info;
