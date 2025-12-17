-- ============================================
-- FIX TIMETABLE SCHEMA
-- Run this in Supabase SQL Editor to fix "Failed to publish" errors
-- ============================================

-- 1. Create the timetable table if it's missing
CREATE TABLE IF NOT EXISTS timetable (
  id SERIAL PRIMARY KEY,
  day VARCHAR(20) NOT NULL,
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  class_name VARCHAR(50) NOT NULL,
  teacher_id INTEGER REFERENCES teachers(id),
  status VARCHAR(20) DEFAULT 'Draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Disable Row Level Security (RLS)
-- This allows the application to write to the table without complex policies
ALTER TABLE timetable DISABLE ROW LEVEL SECURITY;

-- 3. Verify it's ready for Realtime
-- (Safe to run even if already added)
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE timetable;
    EXCEPTION WHEN duplicate_object THEN
        NULL; -- Ignore if already added
    END;
END $$;
