-- Add status column to timetable table to track published timetables
-- This allows admins to publish timetables that become visible to teachers and students

ALTER TABLE timetable ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Draft';
ALTER TABLE timetable ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE timetable ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_timetable_status ON timetable(status);
CREATE INDEX IF NOT EXISTS idx_timetable_class ON timetable(class_name);
CREATE INDEX IF NOT EXISTS idx_timetable_teacher ON timetable(teacher_id);

-- Comment on the status column
COMMENT ON COLUMN timetable.status IS 'Status of timetable entry: Draft or Published. Only Published entries are visible to teachers and students.';
