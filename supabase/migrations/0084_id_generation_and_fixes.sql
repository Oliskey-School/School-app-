-- Create a sequence for school-wide unique numbering (or could be per role)
CREATE SEQUENCE IF NOT EXISTS school_global_id_seq START 1000;

-- Function to generate the formatted ID
-- Format: SCH-001-{ROLE}-{NUMBER}
-- Example: SCH-001-STU-1001
CREATE OR REPLACE FUNCTION generate_school_role_id(role_code TEXT)
RETURNS TEXT AS $$
DECLARE
    next_val BIGINT;
    formatted_id TEXT;
BEGIN
    -- Get next value from sequence
    next_val := nextval('school_global_id_seq');
    
    -- Format: SCH-001-{ROLE}-{0000}
    -- We hardcode SCH-001 for now as the single tenant/branch. 
    -- In a multi-tenant setup, this would come from a parameter or lookups.
    formatted_id := 'SCH-001-' || role_code || '-' || LPAD(next_val::TEXT, 4, '0');
    
    RETURN formatted_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger Function for Students
CREATE OR REPLACE FUNCTION set_student_generated_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Only generate if not provided
    IF NEW.school_generated_id IS NULL OR NEW.school_generated_id = '' THEN
        NEW.school_generated_id := generate_school_role_id('STU');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger Function for Teachers
CREATE OR REPLACE FUNCTION set_teacher_generated_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.school_generated_id IS NULL OR NEW.school_generated_id = '' THEN
        NEW.school_generated_id := generate_school_role_id('TEA');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger Function for Parents
CREATE OR REPLACE FUNCTION set_parent_generated_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.school_generated_id IS NULL OR NEW.school_generated_id = '' THEN
        NEW.school_generated_id := generate_school_role_id('PAR');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply Triggers
DROP TRIGGER IF EXISTS trigger_set_student_id ON students;
CREATE TRIGGER trigger_set_student_id
BEFORE INSERT ON students
FOR EACH ROW
EXECUTE FUNCTION set_student_generated_id();

DROP TRIGGER IF EXISTS trigger_set_teacher_id ON teachers;
CREATE TRIGGER trigger_set_teacher_id
BEFORE INSERT ON teachers
FOR EACH ROW
EXECUTE FUNCTION set_teacher_generated_id();

DROP TRIGGER IF EXISTS trigger_set_parent_id ON parents;
CREATE TRIGGER trigger_set_parent_id
BEFORE INSERT ON parents
FOR EACH ROW
EXECUTE FUNCTION set_parent_generated_id();

-- Grant permissions if needed
GRANT USAGE ON SEQUENCE school_global_id_seq TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION generate_school_role_id TO authenticated, service_role, anon;
