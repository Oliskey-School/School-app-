-- Add CA and Exam columns to academic_performance table
ALTER TABLE academic_performance 
ADD COLUMN IF NOT EXISTS ca_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS exam_score NUMERIC DEFAULT 0;

-- Optional: Update existing rows to have some default split if needed, 
-- but for now we'll leave them as 0 and assume 'score' was the total.
-- We might want to ensure score = ca_score + exam_score in future triggers.
