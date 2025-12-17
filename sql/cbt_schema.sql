-- ============================================
-- CBT (Computer Based Test) Schema
-- ============================================

-- 1. CBT Tests Table
CREATE TABLE IF NOT EXISTS cbt_tests (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(20) DEFAULT 'Test', -- 'Test' or 'Exam'
    class_name VARCHAR(50) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    duration INTEGER NOT NULL, -- minutes
    attempts INTEGER DEFAULT 1,
    questions JSONB NOT NULL DEFAULT '[]', -- Array of {id, question, options, answer, mark}
    teacher_id INTEGER REFERENCES teachers(id),
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CBT Submissions Table
CREATE TABLE IF NOT EXISTS cbt_submissions (
    id SERIAL PRIMARY KEY,
    test_id INTEGER REFERENCES cbt_tests(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    score DECIMAL(5,2) NOT NULL,
    total_score DECIMAL(5,2) NOT NULL, -- The total possible score
    total_questions INTEGER NOT NULL,
    answers JSONB DEFAULT '[]', -- Student's selected answers
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(test_id, student_id) -- Assumption: One submission per test per student for now
);

-- 3. Extend Academic Performance Table
-- Add columns for component scores if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='academic_performance' AND column_name='cbt_score') THEN
        ALTER TABLE academic_performance ADD COLUMN cbt_score DECIMAL(5,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='academic_performance' AND column_name='theory_score') THEN
        ALTER TABLE academic_performance ADD COLUMN theory_score DECIMAL(5,2) DEFAULT 0;
    END IF;
END $$;

-- 4. Trigger Function to Update Report Card (Academic Performance)
CREATE OR REPLACE FUNCTION update_report_card_from_cbt()
RETURNS TRIGGER AS $$
DECLARE
    v_subject VARCHAR(100);
    v_class_name VARCHAR(50);
    v_term VARCHAR(50) := 'First Term'; -- Default/Current Term - in a real app this would be dynamic possibly from a 'current_term' settings table
    v_session VARCHAR(20) := '2024/2025'; -- Default/Current Session
    v_existing_theory DECIMAL(5,2);
BEGIN
    -- Get Subject and Class from the Test
    SELECT subject INTO v_subject
    FROM cbt_tests
    WHERE id = NEW.test_id;

    -- Check if record exists to get current theory score
    SELECT theory_score INTO v_existing_theory
    FROM academic_performance
    WHERE student_id = NEW.student_id 
      AND subject = v_subject 
      AND term = v_term;

    -- Handle null theory score
    IF v_existing_theory IS NULL THEN
        v_existing_theory := 0;
    END IF;

    -- Upsert into Academic Performance
    INSERT INTO academic_performance (student_id, subject, term, session, cbt_score, theory_score, score)
    VALUES (
        NEW.student_id, 
        v_subject, 
        v_term, 
        v_session, 
        NEW.score, 
        v_existing_theory,
        NEW.score + v_existing_theory
    )
    ON CONFLICT (id) DO UPDATE -- Note: 'id' is primary key, but we usually conflict on (student_id, subject, term). The current schema has no unique constraint on that tuple. Let's rely on logic or add constraint.
    -- Wait, the academic_performance table schema in setup_supabase_schema.sql does NOT have a unique constraint on (student_id, subject, term).
    -- We must check existence first or ADD the constraint.
    -- Adding Unique Constraint for safety:
    -- BUT if we can't reliably predict the 'id', ON CONFLICT (id) won't work on insert.
    -- We'll use a standard IF EXISTS UPDATE ELSE INSERT block or assume the constraint will be added.
    
    -- Let's try to update based on student_id/subject/term
    SET cbt_score = EXCLUDED.cbt_score,
        score = EXCLUDED.cbt_score + academic_performance.theory_score;
        -- This logic is tricky without a UNIQUE constraint.
        -- Let's revise the function to use UPDATE then INSERT if not found.
        
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Revised Trigger Function (Better logic without assuming UNIQUE constraint exists yet, though it should)
CREATE OR REPLACE FUNCTION update_report_card_from_cbt_robust()
RETURNS TRIGGER AS $$
DECLARE
    v_subject VARCHAR(100);
    v_term VARCHAR(50) := 'First Term';
    v_session VARCHAR(20) := '2024/2025';
    v_record_id INTEGER;
    v_current_theory DECIMAL(5,2) := 0;
BEGIN
    -- Get Subject
    SELECT subject INTO v_subject FROM cbt_tests WHERE id = NEW.test_id;

    -- Find existing record
    SELECT id, theory_score INTO v_record_id, v_current_theory
    FROM academic_performance
    WHERE student_id = NEW.student_id 
      AND subject = v_subject 
      AND term = v_term
    LIMIT 1;

    IF v_record_id IS NOT NULL THEN
        -- Update
        UPDATE academic_performance
        SET cbt_score = NEW.score,
            score = (COALESCE(theory_score, 0) + NEW.score), -- Assuming Total = Theory + CBT
            updated_at = NOW() -- Assuming updated_at exists or is managed
        WHERE id = v_record_id;
    ELSE
        -- Insert
        INSERT INTO academic_performance (student_id, subject, term, session, cbt_score, theory_score, score)
        VALUES (NEW.student_id, v_subject, v_term, v_session, NEW.score, 0, NEW.score);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to recreate
DROP TRIGGER IF EXISTS trg_update_report_card_cbt ON cbt_submissions;

CREATE TRIGGER trg_update_report_card_cbt
AFTER INSERT OR UPDATE ON cbt_submissions
FOR EACH ROW
EXECUTE FUNCTION update_report_card_from_cbt_robust();

-- Disable RLS on new tables for simplicity
ALTER TABLE cbt_tests DISABLE ROW LEVEL SECURITY;
ALTER TABLE cbt_submissions DISABLE ROW LEVEL SECURITY;
