-- Add missing columns to cbt_exams to support Test/Exam types and Total Marks
ALTER TABLE cbt_exams ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Test'; -- 'Test' or 'Exam'
ALTER TABLE cbt_exams ADD COLUMN IF NOT EXISTS total_marks INT DEFAULT 0;

-- Ensure duration_minutes is handled securely if needed, but it exists.
