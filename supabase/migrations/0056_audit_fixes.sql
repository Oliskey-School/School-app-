BEGIN;

-- 1. Add missing updated_at columns for Delta Sync
ALTER TABLE timetable ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE classes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Ensure these tables exist (they might be missing if 0052 didn't run fully or if they were only in types)
CREATE TABLE IF NOT EXISTS assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, 
    school_id UUID NOT NULL, 
    title TEXT,
    description TEXT,
    due_date TIMESTAMPTZ,
    class_name TEXT,
    subject TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
); 

CREATE TABLE IF NOT EXISTS grades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, 
    school_id UUID NOT NULL, 
    student_id UUID,
    assignment_id UUID,
    score NUMERIC,
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);


-- 2. Security: Enable RLS and Apply Policy
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('classes', 'timetable', 'subjects', 'assignments', 'grades')
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation" ON %I', t);
        EXECUTE format('CREATE POLICY "Tenant Isolation" ON %I FOR ALL USING (school_id = get_my_school_id())', t);
        
        -- 3. Apply Trigger for Auto-Update
        IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE event_object_table = t AND trigger_name = 'update_' || t || '_modtime') THEN
            EXECUTE format('CREATE TRIGGER update_%I_modtime BEFORE UPDATE ON %I FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()', t, t);
        END IF;
    END LOOP;
END $$;

COMMIT;
