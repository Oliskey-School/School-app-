-- Phase 6D: APIs & Integrations Schema
-- Purpose: External system integration, API management, webhooks
-- Nigerian Context: WAEC, NECO, JAMB, NIMC integration

-- =============================================
-- API Keys (For External Access)
-- =============================================

CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    key_name VARCHAR(100) NOT NULL,
    api_key VARCHAR(64) UNIQUE NOT NULL, -- Hashed key
    api_secret VARCHAR(128), -- Encrypted secret
    
    -- Owner
    organization_name VARCHAR(200),
    contact_email VARCHAR(100),
    contact_person VARCHAR(100),
    
    -- Permissions
    scope TEXT[], -- ['read:students', 'write:grades', etc.]
    allowed_endpoints TEXT[],
    rate_limit_per_hour INTEGER DEFAULT 1000,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP,
    
    -- Usage Stats
    total_requests INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    revoked_at TIMESTAMP,
    revoked_by INTEGER REFERENCES users(id),
    revocation_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(api_key) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(organization_name);

-- =============================================
-- API Requests (Logging & Analytics)
-- =============================================

CREATE TABLE IF NOT EXISTS api_requests (
    id SERIAL PRIMARY KEY,
    api_key_id INTEGER REFERENCES api_keys(id),
    
    -- Request Details
    method VARCHAR(10) NOT NULL, -- 'GET', 'POST', 'PUT', 'DELETE'
    endpoint VARCHAR(500) NOT NULL,
    query_params JSONB,
    request_body JSONB,
    
    -- Response
    status_code INTEGER,
    response_time_ms INTEGER,
    response_size_bytes INTEGER,
    
    -- Client Info
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamp
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Error Tracking
    error_message TEXT,
    stack_trace TEXT
);

CREATE INDEX IF NOT EXISTS idx_api_requests_key ON api_requests(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_requests_date ON api_requests(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_requests_endpoint ON api_requests(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_requests_status ON api_requests(status_code);

-- =============================================
-- Webhooks (Event Notifications)
-- =============================================

CREATE TABLE IF NOT EXISTS webhooks (
    id SERIAL PRIMARY KEY,
    webhook_name VARCHAR(100) NOT NULL,
    webhook_url TEXT NOT NULL,
    
    -- Events to Listen For
    event_types TEXT[] NOT NULL, -- ['student.created', 'payment.completed', etc.]
    
    -- Security
    secret_key VARCHAR(128), -- For HMAC signature
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Retry Configuration
    max_retries INTEGER DEFAULT 3,
    retry_delay_seconds INTEGER DEFAULT 60,
    
    -- Stats
    total_deliveries INTEGER DEFAULT 0,
    failed_deliveries INTEGER DEFAULT 0,
    last_triggered_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_webhooks_events ON webhooks USING GIN(event_types);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active) WHERE is_active = true;

-- =============================================
-- Webhook Deliveries (Delivery Logs)
-- =============================================

CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id SERIAL PRIMARY KEY,
    webhook_id INTEGER REFERENCES webhooks(id) ON DELETE CASCADE,
    
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    
    -- Delivery
    attempt_number INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'delivered', 'failed'
    
    http_status_code INTEGER,
    response_body TEXT,
    response_time_ms INTEGER,
    
    error_message TEXT,
    
    delivered_at TIMESTAMP,
    next_retry_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_date ON webhook_deliveries(created_at DESC);

-- =============================================
-- External Integrations (Third-Party Systems)
-- =============================================

CREATE TABLE IF NOT EXISTS external_integrations (
    id SERIAL PRIMARY KEY,
    integration_name VARCHAR(100) NOT NULL,
    integration_type VARCHAR(50) NOT NULL, -- 'WAEC', 'NECO', 'JAMB', 'NIMC', 'LMS', 'Payment'
    
    -- Connection Details
    base_url TEXT,
    auth_type VARCHAR(50), -- 'OAuth2', 'ApiKey', 'Basic', 'Bearer'
    credentials JSONB, -- Encrypted credentials
    
    -- Configuration
    sync_frequency VARCHAR(50), -- 'Realtime', 'Hourly', 'Daily', 'Manual'
    auto_sync BOOLEAN DEFAULT false,
    last_sync_at TIMESTAMP,
    next_sync_at TIMESTAMP,
    
    -- Data Mapping
    field_mappings JSONB, -- How to map our fields to their fields
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    connection_status VARCHAR(20) DEFAULT 'disconnected', -- 'connected', 'disconnected', 'error'
    health_check_url TEXT,
    last_health_check TIMESTAMP,
    
    -- Nigerian-Specific
    exam_board_code VARCHAR(20), -- For WAEC, NECO, JAMB
    school_registration_number VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_integrations_type ON external_integrations(integration_type);
CREATE INDEX IF NOT EXISTS idx_integrations_active ON external_integrations(is_active) WHERE is_active = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_integrations_name ON external_integrations(integration_name);

-- =============================================
-- Sync Logs (Integration Sync History)
-- =============================================
-- ... (skipping unchanged content) ...

-- =============================================
-- Sample Data: External Integrations
-- =============================================

INSERT INTO external_integrations (integration_name, integration_type, base_url, auth_type, sync_frequency, is_active, school_registration_number, created_by) VALUES
('WAEC Integration', 'WAEC', 'https://api.waec.ng/v1', 'ApiKey', 'Manual', false, 'SCH/2026/LAG/001', 1),
('NECO Integration', 'NECO', 'https://portal.neco.gov.ng/api', 'OAuth2', 'Manual', false, 'NECO/2026/001', 1),
('JAMB Integration', 'JAMB', 'https://jamb.gov.ng/api/v1', 'Bearer', 'Manual', false, 'JAMB/SCHOOL/2026', 1)
ON CONFLICT (integration_name) DO NOTHING;

CREATE TABLE IF NOT EXISTS sync_logs (
    id SERIAL PRIMARY KEY,
    integration_id INTEGER REFERENCES external_integrations(id),
    
    sync_type VARCHAR(50), -- 'StudentData', 'ExamResults', 'Enrollment', 'HealthRecords'
    sync_direction VARCHAR(20), -- 'push', 'pull', 'bidirectional'
    
    -- Summary
    records_processed INTEGER DEFAULT 0,
    records_succeeded INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    
    -- Timing
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER,
    
    -- Status
    status VARCHAR(20) DEFAULT 'running', -- 'running', 'completed', 'failed', 'partial'
    
    -- Details
    error_details JSONB,
    sync_summary TEXT,
    
    triggered_by VARCHAR(50) -- 'automatic', 'manual', 'webhook'
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_integration ON sync_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_date ON sync_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);

-- =============================================
-- Integration Errors (Error Tracking)
-- =============================================

CREATE TABLE IF NOT EXISTS integration_errors (
    id SERIAL PRIMARY KEY,
    integration_id INTEGER REFERENCES external_integrations(id),
    sync_log_id INTEGER REFERENCES sync_logs(id),
    
    error_type VARCHAR(100), -- 'AuthenticationError', 'ValidationError', 'NetworkError'
    error_code VARCHAR(50),
    error_message TEXT,
    
    -- Context
    endpoint VARCHAR(500),
    request_data JSONB,
    response_data JSONB,
    
    -- Resolution
    is_resolved BOOLEAN DEFAULT false,
    resolution_notes TEXT,
    resolved_at TIMESTAMP,
    
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_integration_errors_integration ON integration_errors(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_errors_resolved ON integration_errors(is_resolved);
CREATE INDEX IF NOT EXISTS idx_integration_errors_date ON integration_errors(occurred_at DESC);

-- =============================================
-- Third Party Apps (Marketplace)
-- =============================================

CREATE TABLE IF NOT EXISTS third_party_apps (
    id SERIAL PRIMARY KEY,
    app_name VARCHAR(100) NOT NULL,
    app_slug VARCHAR(100) UNIQUE NOT NULL,
    developer_name VARCHAR(200),
    
    category VARCHAR(50), -- 'LMS', 'Assessment', 'Communication', 'Analytics'
    description TEXT,
    icon_url TEXT,
    
    -- Integration
    oauth_client_id VARCHAR(100),
    oauth_client_secret VARCHAR(200),
    redirect_uris TEXT[],
    
    scopes_required TEXT[],
    webhook_url TEXT,
    
    -- Status
    is_verified BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT false,
    
    -- Stats
    total_installs INTEGER DEFAULT 0,
    rating DECIMAL(3,2),
    review_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_third_party_apps_slug ON third_party_apps(app_slug);
CREATE INDEX IF NOT EXISTS idx_third_party_apps_category ON third_party_apps(category);
CREATE INDEX IF NOT EXISTS idx_third_party_apps_published ON third_party_apps(is_published) WHERE is_published = true;

-- =============================================
-- App Installations (School-Level)
-- =============================================

CREATE TABLE IF NOT EXISTS app_installations (
    id SERIAL PRIMARY KEY,
    app_id INTEGER REFERENCES third_party_apps(id),
    
    -- OAuth Tokens
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    
    -- Configuration
    app_settings JSONB,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    installed_by INTEGER REFERENCES users(id),
    
    last_used_at TIMESTAMP,
    uninstalled_at TIMESTAMP,
    uninstalled_by INTEGER REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_app_installations_app ON app_installations(app_id);
CREATE INDEX IF NOT EXISTS idx_app_installations_active ON app_installations(is_active) WHERE is_active = true;

-- =============================================
-- Sample Data: External Integrations
-- =============================================

INSERT INTO external_integrations (integration_name, integration_type, base_url, auth_type, sync_frequency, is_active, school_registration_number, created_by) VALUES
('WAEC Integration', 'WAEC', 'https://api.waec.ng/v1', 'ApiKey', 'Manual', false, 'SCH/2026/LAG/001', 1),
('NECO Integration', 'NECO', 'https://portal.neco.gov.ng/api', 'OAuth2', 'Manual', false, 'NECO/2026/001', 1),
('JAMB Integration', 'JAMB', 'https://jamb.gov.ng/api/v1', 'Bearer', 'Manual', false, 'JAMB/SCHOOL/2026', 1)
ON CONFLICT (integration_name) DO NOTHING;

-- =============================================
-- Sample Data: Third Party Apps
-- =============================================

INSERT INTO third_party_apps (app_name, app_slug, developer_name, category, description, is_verified, is_published, total_installs, rating, created_by) VALUES
('Google Classroom Sync', 'google-classroom', 'Google LLC', 'LMS', 'Sync assignments and grades with Google Classroom', true, true, 150, 4.5, 1),
('Zoom Meeting Integration', 'zoom-meetings', 'Zoom Video Communications', 'Communication', 'Schedule and manage virtual classes via Zoom', true, true, 200, 4.7, 1),
('Khan Academy Content', 'khan-academy', 'Khan Academy', 'Assessment', 'Access Khan Academy learning resources', true, true, 85, 4.8, 1),
('Microsoft Teams Education', 'ms-teams-edu', 'Microsoft Corporation', 'Communication', 'Integrate with Microsoft Teams for Education', true, true, 120, 4.6, 1)
ON CONFLICT (app_slug) DO NOTHING;

COMMENT ON TABLE api_keys IS 'API key management for external system access';
COMMENT ON TABLE api_requests IS 'API request logging and analytics';
COMMENT ON TABLE webhooks IS 'Webhook configuration for event notifications';
COMMENT ON TABLE external_integrations IS 'Nigerian exam boards and external system integrations';
COMMENT ON TABLE sync_logs IS 'Data synchronization history and monitoring';
COMMENT ON TABLE third_party_apps IS 'EdTech marketplace apps directory';
COMMENT ON TABLE app_installations IS 'School-level third-party app installations';
