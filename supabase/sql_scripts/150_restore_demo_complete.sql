
-- ============================================================
-- 150_restore_demo_complete.sql
-- COMBINED FIX: 
-- 1. Unlocks Demo Visibility (RLS Bypass)
-- 2. Re-Seeds Demo Data (Students, Teachers, Parents)
-- ============================================================

-- PART 1: UNLOCK VISIBILITY (The "No Police" Fix)
DO $$ 
DECLARE 
    t text;
    -- Note: 'schools' is handled separately due to column name difference
    tables_to_open text[] := ARRAY[
        'students', 'teachers', 'parents', 'classes', 
        'profiles', 'branches',
        'payments', 'student_fees', 'student_attendance', 
        'notices', 'transport_buses', 'quizzes', 'quiz_questions'
    ];
    demo_school_id uuid := 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
BEGIN
    -- 1. Generic Tables (school_id)
    FOREACH t IN ARRAY tables_to_open LOOP
        EXECUTE format('DROP POLICY IF EXISTS "demo_bypass_%I" ON public.%I', t, t);
        EXECUTE format('
            CREATE POLICY "demo_bypass_%I" ON public.%I
            FOR ALL TO authenticated
            USING (school_id = %L)', t, t, demo_school_id);
    END LOOP;

    -- 2. Schools Table (id)
    DROP POLICY IF EXISTS "demo_bypass_schools" ON public.schools;
    EXECUTE format('
        CREATE POLICY "demo_bypass_schools" ON public.schools
        FOR ALL TO authenticated
        USING (id = %L)', demo_school_id);
        
    RAISE NOTICE '✅ RLS Bypass Applied for Demo School';
END $$;


-- PART 2: RE-SEED DATA (Ensure Data Exists)
DO $$
DECLARE
    v_school_id uuid := 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
    
    -- Emails
    v_teacher_email text := 'teacher@school.com';
    v_parent_email text := 'parent@school.com';
    
    -- IDs (will be resolved)
    v_teacher_id uuid;
    v_parent_id uuid;
    v_student1_id uuid;
    
    i integer;
BEGIN
    -- 1. Ensure School Exists
    INSERT INTO schools (id, name, slug) 
    VALUES (v_school_id, 'Demo Academy', 'demo-academy')
    ON CONFLICT (id) DO UPDATE SET name = 'Demo Academy';

    -- 2. Create Classes
    INSERT INTO classes (school_id, name, grade, level) VALUES
    (v_school_id, 'Grade 1', 1, 'Primary'),
    (v_school_id, 'Grade 2', 2, 'Primary'),
    (v_school_id, 'SSS 1', 10, 'Secondary'),
    (v_school_id, 'SSS 3', 12, 'Secondary')
    ON CONFLICT DO NOTHING;

    -- ==========================================
    -- 3. HANDLE TEACHER
    -- ==========================================
    -- A. Resolve Auth User
    SELECT id INTO v_teacher_id FROM auth.users WHERE email = v_teacher_email;
    
    IF v_teacher_id IS NULL THEN
        v_teacher_id := gen_random_uuid();
        -- Insert into auth.users (Minimal fields for valid user)
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (
            v_teacher_id, 
            '00000000-0000-0000-0000-000000000000', 
            'authenticated', 
            'authenticated', 
            v_teacher_email, 
            crypt('password123', gen_salt('bf')), -- Requires pgcrypto
            NOW(), 
            '{"provider":"email","providers":["email"]}', 
            '{}', 
            NOW(), 
            NOW()
        );
    END IF;

    -- B. Insert Public User
    -- Ensure role is lowercase 'teacher' to match typical expectations or check constraints
    INSERT INTO users (id, school_id, email, full_name, role)
    VALUES (v_teacher_id, v_school_id, v_teacher_email, 'John Smith', 'teacher')
    ON CONFLICT (id) DO UPDATE SET school_id = v_school_id;

    -- C. Insert Teacher Record
    INSERT INTO teachers (id, school_id, user_id, name, email, subject_specialization)
    VALUES (gen_random_uuid(), v_school_id, v_teacher_id, 'John Smith', v_teacher_email, ARRAY['Math'])
    ON CONFLICT DO NOTHING;


    -- ==========================================
    -- 4. HANDLE PARENT
    -- ==========================================
    -- A. Resolve Auth User
    SELECT id INTO v_parent_id FROM auth.users WHERE email = v_parent_email;
    
    IF v_parent_id IS NULL THEN
        v_parent_id := gen_random_uuid();
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (
            v_parent_id, 
            '00000000-0000-0000-0000-000000000000', 
            'authenticated', 
            'authenticated', 
            v_parent_email, 
            crypt('password123', gen_salt('bf')), 
            NOW(), 
            '{"provider":"email","providers":["email"]}', 
            '{}', 
            NOW(), 
            NOW()
        );
    END IF;

    -- B. Insert Public User
    INSERT INTO users (id, school_id, email, full_name, role)
    VALUES (v_parent_id, v_school_id, v_parent_email, 'Jane Doe', 'parent')
    ON CONFLICT (id) DO UPDATE SET school_id = v_school_id;

    -- C. Insert Parent Record
    INSERT INTO parents (id, school_id, user_id, name, email, phone)
    VALUES (gen_random_uuid(), v_school_id, v_parent_id, 'Jane Doe', v_parent_email, '555-0123')
    ON CONFLICT DO NOTHING;

    -- ==========================================
    -- 5. HANDLE STUDENTS (No Auth User Needed for basic stats, but ideal)
    -- ==========================================
    FOR i IN 1..10 LOOP
        v_student1_id := gen_random_uuid();
        
        INSERT INTO students (
            id, school_id, name, email, grade, enrollment_number, attendance_status
        ) VALUES (
            v_student1_id, 
            v_school_id, 
            'Student ' || i, 
            'student'||i||'@school.com', 
            (i % 12) + 1, 
            'ST-'||i, 
            'Present'
        );
    END LOOP;

    RAISE NOTICE '✅ Demo Data Seeded';
END $$;
