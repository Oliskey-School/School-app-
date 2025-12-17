-- Add missing columns to the assignments table
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS teacher_id BIGINT;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS class_name TEXT;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS total_students INTEGER DEFAULT 0;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS submissions_count INTEGER DEFAULT 0;
