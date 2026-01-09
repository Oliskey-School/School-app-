-- Add class_id to cbt_exams to link specific class sections (e.g. SSS 1A) instead of just generic text grades
ALTER TABLE cbt_exams ADD COLUMN IF NOT EXISTS class_id BIGINT REFERENCES classes(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_cbt_exams_class_id ON cbt_exams(class_id);
