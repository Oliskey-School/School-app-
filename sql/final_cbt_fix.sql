-- ============================================
-- FINAL CBT FIX (Cleanup constraints)
-- ============================================

DO $$ 
BEGIN 
    -- 1. Handle the 'duration_minutes' column causing the "null value" error.
    -- We make it nullable so we can ignore it, as we use 'duration' column instead.
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cbt_tests' AND column_name='duration_minutes') THEN
        ALTER TABLE cbt_tests ALTER COLUMN duration_minutes DROP NOT NULL;
        ALTER TABLE cbt_tests ALTER COLUMN duration_minutes SET DEFAULT 60;
    END IF;

    -- 2. Ensure 'duration' column exists (used by our frontend)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cbt_tests' AND column_name='duration') THEN
        ALTER TABLE cbt_tests ADD COLUMN duration INTEGER DEFAULT 60;
    END IF;

    -- 3. Ensure 'teacher_id' is nullable for now (easier development) or has default
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cbt_tests' AND column_name='teacher_id') THEN
        ALTER TABLE cbt_tests ALTER COLUMN teacher_id DROP NOT NULL;
    END IF;

    -- 4. Ensure other columns exist and have defaults
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cbt_tests' AND column_name='class_name') THEN
        ALTER TABLE cbt_tests ADD COLUMN class_name VARCHAR(50) DEFAULT 'Grade 10A';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cbt_tests' AND column_name='subject') THEN
        ALTER TABLE cbt_tests ADD COLUMN subject VARCHAR(100) DEFAULT 'General';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cbt_tests' AND column_name='attempts') THEN
        ALTER TABLE cbt_tests ADD COLUMN attempts INTEGER DEFAULT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cbt_tests' AND column_name='questions') THEN
        ALTER TABLE cbt_tests ADD COLUMN questions JSONB DEFAULT '[]';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cbt_tests' AND column_name='is_published') THEN
        ALTER TABLE cbt_tests ADD COLUMN is_published BOOLEAN DEFAULT FALSE;
    END IF;

END $$;
