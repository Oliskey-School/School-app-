-- Migration: Cleanup and Standardize IDs for ALL Users
-- Description: 
-- 1. Resets all role-specific ID sequences to 1.
-- 2. Iterates through existing Students, Teachers, Parents, and Admins in chronological order.
-- 3. Generates new sequential IDs (OLISKEY_MAIN_ROLE_XXXX).
-- 4. Updates both the profile table (students, etc.) and the users table (custom_id) to ensure consistency.

BEGIN;

-- 1. Reset Sequences
ALTER SEQUENCE school_student_id_seq RESTART WITH 1;
ALTER SEQUENCE school_teacher_id_seq RESTART WITH 1;
ALTER SEQUENCE school_parent_id_seq RESTART WITH 1;
ALTER SEQUENCE school_staff_id_seq RESTART WITH 1;

-- 2. Backfill Students
DO $$
DECLARE
    r RECORD;
    new_id TEXT;
BEGIN
    FOR r IN SELECT id, user_id FROM students ORDER BY created_at ASC LOOP
        -- Generate new ID
        new_id := generate_school_role_id('Student');
        
        -- Update Student Profile
        UPDATE students SET school_generated_id = new_id WHERE id = r.id;
        
        -- Update User Record (if linked)
        IF r.user_id IS NOT NULL THEN
            UPDATE users SET custom_id = new_id WHERE id = r.user_id;
        END IF;
    END LOOP;
END $$;

-- 3. Backfill Teachers
DO $$
DECLARE
    r RECORD;
    new_id TEXT;
BEGIN
    FOR r IN SELECT id, user_id FROM teachers ORDER BY created_at ASC LOOP
        new_id := generate_school_role_id('Teacher');
        
        UPDATE teachers SET school_generated_id = new_id WHERE id = r.id;
        
        IF r.user_id IS NOT NULL THEN
            UPDATE users SET custom_id = new_id WHERE id = r.user_id;
        END IF;
    END LOOP;
END $$;

-- 4. Backfill Parents
DO $$
DECLARE
    r RECORD;
    new_id TEXT;
BEGIN
    FOR r IN SELECT id, user_id FROM parents ORDER BY created_at ASC LOOP
        new_id := generate_school_role_id('Parent');
        
        UPDATE parents SET school_generated_id = new_id WHERE id = r.id;
        
        IF r.user_id IS NOT NULL THEN
            UPDATE users SET custom_id = new_id WHERE id = r.user_id;
        END IF;
    END LOOP;
END $$;

-- 5. Backfill Admins/Staff (from Users table directly if no profile table, or just checking roles)
-- Note: 'users' table is the source of truth for Admins usually.
DO $$
DECLARE
    r RECORD;
    new_id TEXT;
BEGIN
    -- Select users with admin roles who might not be covered above (or to ensure they get admin IDs)
    FOR r IN SELECT id FROM users WHERE role IN ('admin', 'superadmin', 'Admin', 'Super Admin') ORDER BY created_at ASC LOOP
        new_id := generate_school_role_id('Admin');
        
        UPDATE users SET custom_id = new_id WHERE id = r.id;
    END LOOP;
END $$;

COMMIT;
