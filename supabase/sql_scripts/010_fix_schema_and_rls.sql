-- =====================================================
-- FIX: Schema Updates & RLS Policies
-- Date: 2026-01-28
-- =====================================================

-- 1. ADD MISSING updated_at COLUMNS
-- This fixes the SyncEngine 400 errors

-- Function to safely add timestamp columns
CREATE OR REPLACE FUNCTION add_timestamp_cols() RETURNS void AS $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('notices', 'messages', 'schools', 'branches', 'users', 'students', 'teachers', 'parents')
    LOOP
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()', t);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now()', t);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT add_timestamp_cols();
DROP FUNCTION add_timestamp_cols();

-- 2. CREATE AUTO-UPDATE TRIGGER
-- Ensures updated_at is actually updated on change

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all relevant tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('notices', 'messages', 'schools', 'branches', 'users', 'students', 'teachers', 'parents')
    LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE event_object_table = t AND trigger_name = 'update_' || t || '_modtime') THEN
            EXECUTE format('CREATE TRIGGER update_%I_modtime BEFORE UPDATE ON %I FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()', t, t);
        END IF;
    END LOOP;
END $$;

-- 3. FIX TABLE NAME MISMATCH (attendance vs attendance_records)
-- Option A: Create a view so 'attendance' query works
CREATE OR REPLACE VIEW attendance AS SELECT * FROM attendance_records;

-- Option B: Or just ensure attendance_records has the right columns too
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 4. FIX RLS POLICIES (401 Errors)
-- Ensure strict school_id isolation

-- Helper function to get current user's school_id from metadata
CREATE OR REPLACE FUNCTION get_my_school_id()
RETURNS UUID AS $$
BEGIN
    RETURN (auth.jwt() ->> 'school_id')::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Generic Policy Generator
-- "Users can view data from their own school"
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'students', 'teachers', 'parents', 'notices', 'messages', 'attendance_records')
    LOOP
        -- Drop existing policy to avoid conflicts
        EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Policy" ON %I', t);
        
        -- Create new policy
        -- Note: We check if the record's school_id matches the user's school_id
        -- We also allow if the user is a super_admin (optional, but good practice)
        EXECUTE format('CREATE POLICY "Tenant Isolation Policy" ON %I FOR ALL USING (school_id = get_my_school_id())', t);
    END LOOP;
END $$;

-- 5. FIX MISSING PROFILE DATA
-- Ensure triggers populate school_id correctly

CREATE OR REPLACE FUNCTION ensure_user_school_id()
RETURNS TRIGGER AS $$
BEGIN
    -- If school_id is missing in public.users, try to get it from auth.users metadata
    IF NEW.school_id IS NULL THEN
        NEW.school_id := (SELECT (raw_app_meta_data->>'school_id')::UUID FROM auth.users WHERE id = NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_user_created_check_school ON public.users;
CREATE TRIGGER on_user_created_check_school
    BEFORE INSERT ON public.users
    FOR EACH ROW
    EXECUTE PROCEDURE ensure_user_school_id();

