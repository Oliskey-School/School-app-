-- ============================================
-- MIGRATION: Enhanced Attendance System
-- Purpose: QR codes, analytics, parent notifications, dropout detection
-- ============================================

-- Add QR code to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS qr_code TEXT UNIQUE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS qr_code_generated_at TIMESTAMPTZ;

-- Create attendance analytics table
CREATE TABLE IF NOT EXISTS attendance_analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'present', 'absent', 'late', 'excused'
  check_in_time TIME,
  check_in_method VARCHAR(20), -- 'qr', 'manual', 'biometric'
  location VARCHAR(255),
  notes TEXT,
  marked_by INTEGER REFERENCES users(id),
  parent_notified BOOLEAN DEFAULT FALSE,
  parent_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date)
);

-- Create attendance statistics table (pre-computed for performance)
CREATE TABLE IF NOT EXISTS attendance_statistics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- First day of month
  total_days INTEGER DEFAULT 0,
  present_days INTEGER DEFAULT 0,
  absent_days INTEGER DEFAULT 0,
  late_days INTEGER DEFAULT 0,
  excused_days INTEGER DEFAULT 0,
  attendance_rate DECIMAL(5,2), -- Percentage
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, month)
);

-- Create dropout alerts table
CREATE TABLE IF NOT EXISTS dropout_alerts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL, -- 'consecutive_absences', 'low_attendance', 'pattern_change'
  severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  consecutive_absences INTEGER,
  attendance_rate DECIMAL(5,2),
  details JSONB,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by INTEGER REFERENCES users(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create QR scan logs table
CREATE TABLE IF NOT EXISTS qr_scan_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  scanned_by INTEGER REFERENCES users(id),
  scan_time TIMESTAMPTZ DEFAULT NOW(),
  location VARCHAR(255),
  device_info JSONB,
  status VARCHAR(20) DEFAULT 'success', -- 'success', 'failed', 'duplicate'
  failure_reason TEXT
);

-- Create bulk attendance batches table
CREATE TABLE IF NOT EXISTS bulk_attendance_batches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  class_id VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  created_by INTEGER REFERENCES users(id),
  total_students INTEGER,
  marked_present INTEGER,
  marked_absent INTEGER,
  status VARCHAR(20) DEFAULT 'completed', -- 'in_progress', 'completed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS attendance_analytics_student_idx ON attendance_analytics(student_id);
CREATE INDEX IF NOT EXISTS attendance_analytics_date_idx ON attendance_analytics(date DESC);
CREATE INDEX IF NOT EXISTS attendance_analytics_status_idx ON attendance_analytics(status);
CREATE INDEX IF NOT EXISTS attendance_statistics_student_idx ON attendance_statistics(student_id);
CREATE INDEX IF NOT EXISTS attendance_statistics_month_idx ON attendance_statistics(month DESC);
CREATE INDEX IF NOT EXISTS dropout_alerts_student_idx ON dropout_alerts(student_id);
CREATE INDEX IF NOT EXISTS dropout_alerts_resolved_idx ON dropout_alerts(is_resolved);
CREATE INDEX IF NOT EXISTS qr_scan_logs_student_idx ON qr_scan_logs(student_id);
CREATE INDEX IF NOT EXISTS qr_scan_logs_time_idx ON qr_scan_logs(scan_time DESC);

-- Enable RLS
ALTER TABLE attendance_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE dropout_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_attendance_batches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attendance_analytics
CREATE POLICY "Teachers can view class attendance"
  ON attendance_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin', 'principal')
    )
  );

CREATE POLICY "Parents can view own children attendance"
  ON attendance_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      INNER JOIN students s ON s.id = attendance_analytics.student_id
      WHERE p.id = auth.uid()
      AND p.parent_id IS NOT NULL
      AND s.parent_id = p.parent_id
    )
  );

CREATE POLICY "Teachers can mark attendance"
  ON attendance_analytics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin', 'principal')
    )
  );

-- RLS for attendance_statistics
CREATE POLICY "Users can view relevant statistics"
  ON attendance_statistics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role IN ('teacher', 'admin', 'principal') OR
        (profiles.parent_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM students
          WHERE students.id = attendance_statistics.student_id
          AND students.parent_id = profiles.parent_id
        ))
      )
    )
  );

-- RLS for dropout_alerts
CREATE POLICY "Staff can view all alerts"
  ON dropout_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin', 'principal', 'counselor')
    )
  );

CREATE POLICY "Staff can update alerts"
  ON dropout_alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'principal', 'counselor')
    )
  );

-- Function to generate QR code for student
CREATE OR REPLACE FUNCTION generate_student_qr_code(p_student_id INTEGER)
RETURNS TEXT AS $$
DECLARE
  qr_code TEXT;
BEGIN
  -- Generate unique QR code (student ID + timestamp hash)
  qr_code := 'STU-' || p_student_id || '-' || EXTRACT(EPOCH FROM NOW())::BIGINT;
  
  UPDATE students
  SET qr_code = qr_code,
      qr_code_generated_at = NOW()
  WHERE id = p_student_id;
  
  RETURN qr_code;
END;
$$ LANGUAGE plpgsql;

-- Function to update attendance statistics
CREATE OR REPLACE FUNCTION update_attendance_statistics(p_student_id INTEGER, p_month DATE)
RETURNS void AS $$
DECLARE
  v_total INTEGER;
  v_present INTEGER;
  v_absent INTEGER;
  v_late INTEGER;
  v_excused INTEGER;
  v_rate DECIMAL(5,2);
BEGIN
  -- Calculate statistics for the month
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'present') as present,
    COUNT(*) FILTER (WHERE status = 'absent') as absent,
    COUNT(*) FILTER (WHERE status = 'late') as late,
    COUNT(*) FILTER (WHERE status = 'excused') as excused
  INTO v_total, v_present, v_absent, v_late, v_excused
  FROM attendance_analytics
  WHERE student_id = p_student_id
    AND date >= DATE_TRUNC('month', p_month)
    AND date < DATE_TRUNC('month', p_month) + INTERVAL '1 month';
  
  -- Calculate attendance rate
  IF v_total > 0 THEN
    v_rate := (v_present::DECIMAL / v_total::DECIMAL) * 100;
  ELSE
    v_rate := 100;
  END IF;
  
  -- Upsert statistics
  INSERT INTO attendance_statistics (
    student_id, month, total_days, present_days, absent_days, 
    late_days, excused_days, attendance_rate, updated_at
  )
  VALUES (
    p_student_id, DATE_TRUNC('month', p_month), v_total, v_present, 
    v_absent, v_late, v_excused, v_rate, NOW()
  )
  ON CONFLICT (student_id, month) DO UPDATE
  SET total_days = v_total,
      present_days = v_present,
      absent_days = v_absent,
      late_days = v_late,
      excused_days = v_excused,
      attendance_rate = v_rate,
      updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to check for dropout alerts
CREATE OR REPLACE FUNCTION check_dropout_alerts(p_student_id INTEGER)
RETURNS void AS $$
DECLARE
  v_consecutive_absences INTEGER;
  v_attendance_rate DECIMAL(5,2);
  v_last_30_days_rate DECIMAL(5,2);
BEGIN
  -- Check consecutive absences
  SELECT COUNT(*)
  INTO v_consecutive_absences
  FROM (
    SELECT date, status,
           ROW_NUMBER() OVER (ORDER BY date DESC) as rn
    FROM attendance_analytics
    WHERE student_id = p_student_id
      AND date >= CURRENT_DATE - INTERVAL '30 days'
    ORDER BY date DESC
  ) sub
  WHERE status = 'absent'
    AND rn = ROW_NUMBER() OVER (ORDER BY 1);
  
  -- Get overall attendance rate
  SELECT attendance_rate
  INTO v_attendance_rate
  FROM attendance_statistics
  WHERE student_id = p_student_id
    AND month = DATE_TRUNC('month', CURRENT_DATE)
  LIMIT 1;
  
  -- Create alert for consecutive absences (3+ days)
  IF v_consecutive_absences >= 3 THEN
    INSERT INTO dropout_alerts (
      student_id, alert_type, severity, consecutive_absences, details
    )
    VALUES (
      p_student_id, 
      'consecutive_absences',
      CASE 
        WHEN v_consecutive_absences >= 7 THEN 'critical'
        WHEN v_consecutive_absences >= 5 THEN 'high'
        ELSE 'medium'
      END,
      v_consecutive_absences,
      jsonb_build_object('consecutive_days', v_consecutive_absences)
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Create alert for low attendance (< 70%)
  IF v_attendance_rate IS NOT NULL AND v_attendance_rate < 70 THEN
    INSERT INTO dropout_alerts (
      student_id, alert_type, severity, attendance_rate, details
    )
    VALUES (
      p_student_id,
      'low_attendance',
      CASE 
        WHEN v_attendance_rate < 50 THEN 'critical'
        WHEN v_attendance_rate < 60 THEN 'high'
        ELSE 'medium'
      END,
      v_attendance_rate,
      jsonb_build_object('rate', v_attendance_rate)
    )
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update statistics and check alerts after attendance marked
CREATE OR REPLACE FUNCTION trigger_attendance_updates()
RETURNS TRIGGER AS $$
BEGIN
  -- Update statistics
  PERFORM update_attendance_statistics(NEW.student_id, NEW.date);
  
  -- Check for dropout alerts
  PERFORM check_dropout_alerts(NEW.student_id);
  
  -- Notify parent if absent
  IF NEW.status = 'absent' AND NEW.parent_notified = FALSE THEN
    -- This will be handled by application code or Edge Function
    NEW.parent_notified := TRUE;
    NEW.parent_notified_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER attendance_updates_trigger
  AFTER INSERT ON attendance_analytics
  FOR EACH ROW
  EXECUTE FUNCTION trigger_attendance_updates();

COMMENT ON TABLE attendance_analytics IS 'Daily attendance records with QR scan support';
COMMENT ON TABLE attendance_statistics IS 'Pre-computed monthly attendance statistics';
COMMENT ON TABLE dropout_alerts IS 'Early warning system for at-risk students';
COMMENT ON TABLE qr_scan_logs IS 'Audit trail for all QR code scans';
COMMENT ON TABLE bulk_attendance_batches IS 'Track bulk attendance marking operations';
