-- ============================================
-- MIGRATION: Enhanced Authentication & Verification
-- Purpose: Add phone verification, ID uploads, and new roles
-- ============================================

-- Add verification fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id_document_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id_document_type VARCHAR(50); -- 'national_id', 'passport', 'drivers_license'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'unverified'; -- 'unverified', 'pending', 'verified', 'rejected'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_notes TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Add Principal and Counselor to role constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('student', 'teacher', 'parent', 'admin', 'principal', 'counselor'));

-- Create verification codes table for SMS OTP
CREATE TABLE IF NOT EXISTS verification_codes (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(6) NOT NULL,
  user_id UUID REFERENCES profiles(id),
  purpose VARCHAR(50) NOT NULL, -- 'phone_verification', 'password_reset', 'login'
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS verification_codes_phone_idx ON verification_codes(phone);
CREATE INDEX IF NOT EXISTS verification_codes_expires_idx ON verification_codes(expires_at);

-- Create ID verification requests table
CREATE TABLE IF NOT EXISTS id_verification_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  document_url TEXT NOT NULL,
  document_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  notes TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for admin queries
CREATE INDEX IF NOT EXISTS id_verification_requests_status_idx ON id_verification_requests(status);
CREATE INDEX IF NOT EXISTS id_verification_requests_user_idx ON id_verification_requests(user_id);

-- Create audit log for verification actions
CREATE TABLE IF NOT EXISTS verification_audit_log (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  action VARCHAR(100) NOT NULL, -- 'phone_verification_sent', 'phone_verified', 'id_uploaded', 'id_approved', 'id_rejected'
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE id_verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for verification_codes
CREATE POLICY "Users can view own verification codes"
  ON verification_codes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Only service role can insert/update verification codes (via Edge Functions)
CREATE POLICY "Service role can manage verification codes"
  ON verification_codes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for id_verification_requests
CREATE POLICY "Users can view own ID verification requests"
  ON id_verification_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create ID verification requests"
  ON id_verification_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all ID verification requests"
  ON id_verification_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'principal')
    )
  );

CREATE POLICY "Admins can update ID verification requests"
  ON id_verification_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'principal')
    )
  );

-- RLS Policies for verification_audit_log
CREATE POLICY "Users can view own audit logs"
  ON verification_audit_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all audit logs"
  ON verification_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'principal')
    )
  );

-- Service role can insert audit logs
CREATE POLICY "Service role can insert audit logs"
  ON verification_audit_log FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Function to clean up expired verification codes
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM verification_codes
  WHERE expires_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON verification_codes TO authenticated;
GRANT ALL ON id_verification_requests TO authenticated;
GRANT ALL ON verification_audit_log TO authenticated;

COMMENT ON TABLE verification_codes IS 'SMS OTP codes for phone verification and 2FA';
COMMENT ON TABLE id_verification_requests IS 'National ID and document verification requests';
COMMENT ON TABLE verification_audit_log IS 'Audit trail for all verification actions';
