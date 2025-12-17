-- ============================================
-- Fix CBT Schema (Add ALL missing columns)
-- ============================================

DO $$ 
BEGIN 
    -- 1. teacher_id (The current error)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cbt_tests' AND column_name='teacher_id') THEN
        ALTER TABLE cbt_tests ADD COLUMN teacher_id INTEGER REFERENCES teachers(id);
    END IF;

    -- 2. class_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cbt_tests' AND column_name='class_name') THEN
        ALTER TABLE cbt_tests ADD COLUMN class_name VARCHAR(50) DEFAULT 'Grade 10A';
    END IF;

    -- 3. subject
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cbt_tests' AND column_name='subject') THEN
        ALTER TABLE cbt_tests ADD COLUMN subject VARCHAR(100) DEFAULT 'General';
    END IF;

    -- 4. attempts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cbt_tests' AND column_name='attempts') THEN
        ALTER TABLE cbt_tests ADD COLUMN attempts INTEGER DEFAULT 1;
    END IF;

    -- 5. type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cbt_tests' AND column_name='type') THEN
        ALTER TABLE cbt_tests ADD COLUMN type VARCHAR(20) DEFAULT 'Test';
    END IF;

    -- 6. duration
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cbt_tests' AND column_name='duration') THEN
        ALTER TABLE cbt_tests ADD COLUMN duration INTEGER DEFAULT 60;
    END IF;
    
    -- 7. questions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cbt_tests' AND column_name='questions') THEN
        ALTER TABLE cbt_tests ADD COLUMN questions JSONB DEFAULT '[]';
    END IF;

    -- 8. is_published
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cbt_tests' AND column_name='is_published') THEN
        ALTER TABLE cbt_tests ADD COLUMN is_published BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Ensure cbt_submissions table exists if not already
CREATE TABLE IF NOT EXISTS cbt_submissions (
    id SERIAL PRIMARY KEY,
    test_id INTEGER REFERENCES cbt_tests(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    score DECIMAL(5,2) NOT NULL,
    total_score DECIMAL(5,2) NOT NULL,
    total_questions INTEGER NOT NULL,
    answers JSONB DEFAULT '[]',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(test_id, student_id)
);

-- Ensure academic_performance columns exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='academic_performance' AND column_name='cbt_score') THEN
        ALTER TABLE academic_performance ADD COLUMN cbt_score DECIMAL(5,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='academic_performance' AND column_name='theory_score') THEN
        ALTER TABLE academic_performance ADD COLUMN theory_score DECIMAL(5,2) DEFAULT 0;
    END IF;
END $$;
