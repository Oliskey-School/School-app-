-- Create timetable table
CREATE TABLE IF NOT EXISTS timetable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  day_of_week TEXT NOT NULL,
  period_index INTEGER NOT NULL,
  start_time TEXT,
  end_time TEXT,
  teacher_id UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON timetable;
CREATE POLICY "Enable read access for authenticated users" ON timetable
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable insert access for admins and teachers" ON timetable;
CREATE POLICY "Enable insert access for admins and teachers" ON timetable
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update access for admins and teachers" ON timetable;
CREATE POLICY "Enable update access for admins and teachers" ON timetable
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable delete access for admins and teachers" ON timetable;
CREATE POLICY "Enable delete access for admins and teachers" ON timetable
  FOR DELETE USING (auth.role() = 'authenticated');
