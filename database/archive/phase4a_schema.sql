-- Phase 4A: Emergency & Safety Workflows Schema
-- Tables for emergency response, security, and safety management

-- Emergency Alerts
CREATE TABLE IF NOT EXISTS emergency_alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(100) CHECK (alert_type IN ('Fire', 'Medical', 'Security Threat', 'Natural Disaster', 'Evacuation', 'Other')),
    severity_level VARCHAR(50) CHECK (severity_level IN ('Critical', 'High', 'Medium', 'Low')),
    triggered_by INTEGER REFERENCES users(id),
    user_type VARCHAR(50),
    location VARCHAR(255),
    location_coordinates POINT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'In Progress', 'Resolved', 'False Alarm')),
    response_time INTEGER, -- in seconds
    resolved_by INTEGER REFERENCES users(id),
    resolved_at TIMESTAMP,
    geofence_radius INTEGER, -- in meters
    affected_users TEXT[], -- array of user IDs in area
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Panic Button Activations
CREATE TABLE IF NOT EXISTS panic_activations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    user_type VARCHAR(50),
    location VARCHAR(255),
    location_coordinates POINT,
    device_info TEXT,
    alert_sent BOOLEAN DEFAULT true,
    emergency_alert_id INTEGER REFERENCES emergency_alerts(id),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT false
);

-- Emergency Contacts
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    contact_name VARCHAR(255) NOT NULL,
    relationship VARCHAR(100),
    phone VARCHAR(20) NOT NULL,
    alternate_phone VARCHAR(20),
    email VARCHAR(255),
    is_primary BOOLEAN DEFAULT false,
    priority_order INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Visitor Logs
CREATE TABLE IF NOT EXISTS visitor_logs (
    id SERIAL PRIMARY KEY,
    visitor_name VARCHAR(255) NOT NULL,
    visitor_phone VARCHAR(20),
    visitor_email VARCHAR(255),
    id_type VARCHAR(50),
    id_number VARCHAR(100),
    purpose VARCHAR(255) NOT NULL,
    host_user_id INTEGER REFERENCES users(id),
    host_name VARCHAR(255),
    check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    check_out_time TIMESTAMP,
    expected_duration INTEGER, -- in minutes
    qr_code VARCHAR(255) UNIQUE,
    photo_url TEXT,
    verification_status VARCHAR(50) DEFAULT 'Pending' CHECK (verification_status IN ('Pending', 'Verified', 'Denied')),
    approved_by INTEGER REFERENCES users(id),
    vehicle_info VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permission Slips
CREATE TABLE IF NOT EXISTS permission_slips (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    event_type VARCHAR(100) CHECK (event_type IN ('Field Trip', 'Sports Event', 'Excursion', 'Medical Treatment', 'Media Release', 'Other')),
    event_name VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    event_location VARCHAR(255),
    requested_by INTEGER REFERENCES users(id),
    requested_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by INTEGER REFERENCES users(id),
    approval_date TIMESTAMP,
    parent_signature_url TEXT,
    parent_signed_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Parent Approved', 'Rejected', 'Expired')),
    description TEXT,
    special_instructions TEXT,
    medical_considerations TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Incident Reports
CREATE TABLE IF NOT EXISTS incident_reports (
    id SERIAL PRIMARY KEY,
    incident_type VARCHAR(100) CHECK (incident_type IN ('Accident', 'Fight', 'Bullying', 'Theft', 'Vandalism', 'Missing Person', 'Other')),
    severity VARCHAR(50) CHECK (severity IN ('Minor', 'Moderate', 'Serious', 'Critical')),
    reported_by INTEGER REFERENCES users(id),
    incident_date TIMESTAMP NOT NULL,
    location VARCHAR(255),
    students_involved INTEGER[],
    staff_involved INTEGER[],
    description TEXT NOT NULL,
    witnesses TEXT,
    immediate_action_taken TEXT,
    follow_up_required BOOLEAN DEFAULT false,
    assigned_to INTEGER REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'Open' CHECK (status IN ('Open', 'Under Investigation', 'Resolved', 'Closed')),
    resolution_notes TEXT,
    parent_notified BOOLEAN DEFAULT false,
    police_notified BOOLEAN DEFAULT false,
    attachments TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Emergency Evacuation Plans
CREATE TABLE IF NOT EXISTS evacuation_plans (
    id SERIAL PRIMARY KEY,
    location VARCHAR(255) NOT NULL,
    assembly_point VARCHAR(255) NOT NULL,
    route_description TEXT,
    capacity INTEGER,
    responsible_staff INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Emergency Drills
CREATE TABLE IF NOT EXISTS emergency_drills (
    id SERIAL PRIMARY KEY,
    drill_type VARCHAR(100) CHECK (drill_type IN ('Fire Drill', 'Earthquake Drill', 'Lockdown Drill', 'Evacuation Drill')),
    scheduled_date TIMESTAMP NOT NULL,
    conducted_date TIMESTAMP,
    duration_seconds INTEGER,
    participants_count INTEGER,
    evacuation_plan_id INTEGER REFERENCES evacuation_plans(id),
    success_rating INTEGER CHECK (success_rating >= 1 AND success_rating <= 5),
    observations TEXT,
    improvements_needed TEXT,
    conducted_by INTEGER REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Safety Equipment Inventory
CREATE TABLE IF NOT EXISTS safety_equipment (
    id SERIAL PRIMARY KEY,
    equipment_type VARCHAR(100) CHECK (equipment_type IN ('Fire Extinguisher', 'First Aid Kit', 'AED', 'Emergency Light', 'Alarm System', 'Security Camera')),
    location VARCHAR(255) NOT NULL,
    serial_number VARCHAR(100),
    last_inspection_date DATE,
    next_inspection_date DATE,
    status VARCHAR(50) DEFAULT 'Operational' CHECK (status IN ('Operational', 'Needs Maintenance', 'Out of Service', 'Expired')),
    responsible_person INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_status ON emergency_alerts(status);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_timestamp ON emergency_alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_panic_activations_user ON panic_activations(user_id);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_checkin ON visitor_logs(check_in_time DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_qr ON visitor_logs(qr_code);
CREATE INDEX IF NOT EXISTS idx_permission_slips_student ON permission_slips(student_id);
CREATE INDEX IF NOT EXISTS idx_permission_slips_status ON permission_slips(status);
CREATE INDEX IF NOT EXISTS idx_incident_reports_status ON incident_reports(status);
CREATE INDEX IF NOT EXISTS idx_incident_reports_date ON incident_reports(incident_date DESC);

COMMENT ON TABLE emergency_alerts IS 'Critical emergency situations and school-wide alerts';
COMMENT ON TABLE panic_activations IS 'Staff panic button activations for immediate response';
COMMENT ON TABLE visitor_logs IS 'Security tracking for all school visitors';
COMMENT ON TABLE permission_slips IS 'Parent permission for student activities and events';
COMMENT ON TABLE incident_reports IS 'Documentation of safety and security incidents';
COMMENT ON TABLE emergency_drills IS 'Safety drill planning and evaluation';
