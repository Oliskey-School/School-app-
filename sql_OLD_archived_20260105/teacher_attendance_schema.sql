-- ============================================
-- TEACHER ATTENDANCE APPROVAL SYSTEM
-- Schema for teacher self-attendance with admin approval workflow
-- ============================================

-- Create teacher_attendance table
CREATE TABLE IF NOT EXISTS teacher_attendance (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(teacher_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_teacher ON teacher_attendance(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_date ON teacher_attendance(date);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_status ON teacher_attendance(status);

-- Disable RLS for development
ALTER TABLE teacher_attendance DISABLE ROW LEVEL SECURITY;

-- Enable realtime (optional but recommended for live updates)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE teacher_attendance;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'teacher_attendance table already in realtime publication';
END $$;

-- Verification
SELECT 'Teacher Attendance Table Created Successfully!' as status;
