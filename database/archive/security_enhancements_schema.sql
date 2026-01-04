-- Phase 6: Security Enhancements Schema
-- Purpose: 2FA, Enhanced RBAC, Security Monitoring
-- Cross-cutting security features

-- =============================================
-- Two-Factor Authentication
-- =============================================

CREATE TABLE IF NOT EXISTS two_factor_auth (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Method
    method VARCHAR(20) DEFAULT 'sms', -- 'sms', 'totp', 'email'
    
    -- TOTP (Time-based One-Time Password)
    totp_secret VARCHAR(32), -- Base32 encoded secret
    totp_enabled BOOLEAN DEFAULT false,
    
    -- SMS
    phone_number VARCHAR(20),
    phone_verified BOOLEAN DEFAULT false,
    sms_enabled BOOLEAN DEFAULT false,
    
    -- Backup Codes
    backup_codes TEXT[], -- Encrypted backup codes
    backup_codes_used INTEGER DEFAULT 0,
    
    -- Status
    is_enabled BOOLEAN DEFAULT false,
    enforced BOOLEAN DEFAULT false, -- Admin can enforce 2FA
    
    -- Recovery
    recovery_email VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_2fa_user ON two_factor_auth(user_id);
CREATE INDEX idx_2fa_enabled ON two_factor_auth(is_enabled) WHERE is_enabled = true;

-- =============================================
-- 2FA Verification Logs
-- =============================================

CREATE TABLE IF NOT EXISTS two_factor_verifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    
    method VARCHAR(20),
    code_sent VARCHAR(10), -- Last 4 digits for verification
    
    verified BOOLEAN DEFAULT false,
    attempts INTEGER DEFAULT 0,
    
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP
);

CREATE INDEX idx_2fa_verif_user ON two_factor_verifications(user_id);
CREATE INDEX idx_2fa_verif_date ON two_factor_verifications(created_at DESC);

-- =============================================
-- Enhanced RBAC: Granular Permissions
-- =============================================

CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    permission_name VARCHAR(100) UNIQUE NOT NULL,
    resource VARCHAR(100) NOT NULL, -- 'students', 'payments', 'grades', etc.
    action VARCHAR(50) NOT NULL, -- 'create', 'read', 'update', 'delete', 'export'
    description TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default permissions
INSERT INTO permissions (permission_name, resource, action, description) VALUES
('students:read', 'students', 'read', 'View student records'),
('students:write', 'students', 'create', 'Create new students'),
('students:update', 'students', 'update', 'Update student information'),
('students:delete', 'students', 'delete', 'Delete student records'),
('students:export', 'students', 'export', 'Export student data'),

('payments:read', 'payments', 'read', 'View payment records'),
('payments:write', 'payments', 'create', 'Record payments'),
('payments:approve', 'payments', 'approve', 'Approve refunds'),

('grades:read', 'grades', 'read', 'View grades'),
('grades:write', 'grades', 'create', 'Enter grades'),
('grades:update', 'grades', 'update', 'Modify grades'),
('grades:publish', 'grades', 'publish', 'Publish grades'),

('reports:generate', 'reports', 'create', 'Generate reports'),
('reports:export', 'reports', 'export', 'Export confidential reports'),

('settings:manage', 'settings', 'update', 'Manage system settings'),
('users:manage', 'users', 'update', 'Manage user accounts')
ON CONFLICT (permission_name) DO NOTHING;

-- =============================================
-- Role-Permission Mapping
-- =============================================

CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role VARCHAR(50) NOT NULL,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by INTEGER REFERENCES users(id),
    
    UNIQUE(role, permission_id)
);

CREATE INDEX idx_role_perms_role ON role_permissions(role);

-- =============================================
-- User-Specific Permission Overrides
-- =============================================

CREATE TABLE IF NOT EXISTS user_permission_overrides (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    
    is_granted BOOLEAN DEFAULT true, -- true = grant, false = revoke
    
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by INTEGER REFERENCES users(id),
    expires_at TIMESTAMP,
    
    reason TEXT,
    
    UNIQUE(user_id, permission_id)
);

CREATE INDEX idx_user_perms_user ON user_permission_overrides(user_id);
CREATE INDEX idx_user_perms_active ON user_permission_overrides(expires_at);

-- =============================================
-- Data Encryption Tracking
-- =============================================

CREATE TABLE IF NOT EXISTS encrypted_fields (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    column_name VARCHAR(100) NOT NULL,
    
    encryption_algorithm VARCHAR(50) DEFAULT 'AES-256-GCM',
    key_version INTEGER DEFAULT 1,
    
    is_active BOOLEAN DEFAULT true,
    
    encrypted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(table_name, column_name)
);

-- Track which fields are encrypted
INSERT INTO encrypted_fields (table_name, column_name, encryption_algorithm) VALUES
('students', 'health_info', 'AES-256-GCM'),
('users', 'password_hash', 'bcrypt'),
('payments', 'account_number', 'AES-256-GCM'),
('salary_payments', 'amount_paid', 'AES-256-GCM'),
('two_factor_auth', 'totp_secret', 'AES-256-GCM'),
('api_keys', 'api_secret', 'AES-256-GCM')
ON CONFLICT (table_name, column_name) DO NOTHING;

-- =============================================
-- Login Attempts (Security Monitoring)
-- =============================================

CREATE TABLE IF NOT EXISTS login_attempts (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(100),
    user_id INTEGER REFERENCES users(id),
    
    ip_address INET NOT NULL,
    user_agent TEXT,
    
    status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'blocked'
    failure_reason VARCHAR(100), -- 'invalid_password', 'account_locked', 'invalid_2fa'
    
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_login_attempts_email ON login_attempts(user_email);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX idx_login_attempts_date ON login_attempts(attempted_at DESC);
CREATE INDEX idx_login_attempts_failed ON login_attempts(status) WHERE status = 'failed';

-- =============================================
-- Account Lockouts (Automated Security)
-- =============================================

CREATE TABLE IF NOT EXISTS account_lockouts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    reason VARCHAR(100) NOT NULL, -- 'failed_login_attempts', 'suspicious_activity', 'manual'
    failed_attempts INTEGER DEFAULT 0,
    
    locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unlock_at TIMESTAMP, -- Auto-unlock time
    
    is_active BOOLEAN DEFAULT true,
    
    unlocked_at TIMESTAMP,
    unlocked_by INTEGER REFERENCES users(id),
    unlock_reason TEXT
);

CREATE INDEX idx_lockouts_user ON account_lockouts(user_id);
CREATE INDEX idx_lockouts_active ON account_lockouts(is_active) WHERE is_active = true;

-- =============================================
-- Security Events (Real-time Monitoring)
-- =============================================

CREATE TABLE IF NOT EXISTS security_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL, -- 'PasswordChange', 'RoleChange', 'PermissionGrant', 'SuspiciousLogin'
    severity VARCHAR(20) DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
    
    user_id INTEGER REFERENCES users(id),
    target_user_id INTEGER REFERENCES users(id), -- For events affecting other users
    
    description TEXT,
    event_data JSONB,
    
    ip_address INET,
    user_agent TEXT,
    
    requires_action BOOLEAN DEFAULT false,
    action_taken TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_date ON security_events(created_at DESC);
CREATE INDEX idx_security_events_action ON security_events(requires_action) WHERE requires_action = true;

-- =============================================
-- Session Management (Enhanced)
-- =============================================

CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(128) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    ip_address INET,
    user_agent TEXT,
    device_fingerprint TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    
    is_active BOOLEAN DEFAULT true,
    terminated_at TIMESTAMP,
    termination_reason VARCHAR(100)
);

CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_active ON user_sessions(is_active, expires_at) WHERE is_active = true;
CREATE INDEX idx_sessions_id ON user_sessions(session_id);

-- =============================================
-- Functions: Check Login Attempts
-- =============================================

CREATE OR REPLACE FUNCTION check_failed_login_attempts(p_user_email VARCHAR)
RETURNS TABLE(should_lock BOOLEAN, attempts INTEGER) AS $$
DECLARE
    v_attempts INTEGER;
    v_lockout_threshold INTEGER := 5;
    v_time_window INTERVAL := '15 minutes';
BEGIN
    -- Count failed attempts in last 15 minutes
    SELECT COUNT(*) INTO v_attempts
    FROM login_attempts
    WHERE user_email = p_user_email
    AND status = 'failed'
    AND attempted_at > NOW() - v_time_window;
    
    should_lock := v_attempts >= v_lockout_threshold;
    attempts := v_attempts;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Functions: Auto-unlock Accounts
-- =============================================

CREATE OR REPLACE FUNCTION auto_unlock_expired_lockouts()
RETURNS INTEGER AS $$
DECLARE
    v_unlocked INTEGER;
BEGIN
    UPDATE account_lockouts
    SET is_active = false,
        unlocked_at = NOW(),
        unlock_reason = 'Auto-unlocked after timeout'
    WHERE is_active = true
    AND unlock_at IS NOT NULL
    AND unlock_at < NOW();
    
    GET DIAGNOSTICS v_unlocked = ROW_COUNT;
    RETURN v_unlocked;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE two_factor_auth IS 'Two-factor authentication configuration per user';
COMMENT ON TABLE permissions IS 'Granular permission definitions for RBAC';
COMMENT ON TABLE role_permissions IS 'Mapping of permissions to roles';
COMMENT ON TABLE user_permission_overrides IS 'User-specific permission grants/revocations';
COMMENT ON TABLE login_attempts IS 'Login attempt logging for security monitoring';
COMMENT ON TABLE account_lockouts IS 'Automated account lockout management';
COMMENT ON TABLE security_events IS 'Real-time security event monitoring';
COMMENT ON TABLE user_sessions IS 'Enhanced session management with device tracking';
