-- DATA SEEDING SCRIPT for 'Demo Academy' (FIXED SCHEMA v9: Lowercase Status)
-- Purpose: Populate the database with realistic demo data.
-- Target School: Demo Academy (d0ff3e95-9b4c-4c12-989c-e5640d3cacd1)

DO $$
DECLARE
    v_school_id uuid := 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
    v_teacher1_id uuid;
    v_teacher2_id uuid;
    v_parent1_id uuid;
    v_student1_id uuid;
    v_student_rec record;
    v_class_rec record;
    v_class_map_id uuid;
BEGIN
    -- 1. Create Subjects
    INSERT INTO subjects (school_id, name, code) VALUES
    (v_school_id, 'Mathematics', 'MATH'),
    (v_school_id, 'English Language', 'ENG'),
    (v_school_id, 'General Science', 'SCI'),
    (v_school_id, 'History', 'HIST')
    ON CONFLICT DO NOTHING;

    -- 2. Create Classes
    INSERT INTO classes (school_id, name, grade, level) VALUES
    (v_school_id, 'Grade 1', 1, 'Primary'),
    (v_school_id, 'Grade 2', 2, 'Primary'),
    (v_school_id, 'Grade 3', 3, 'Primary'),
    (v_school_id, 'Grade 4', 4, 'Primary'),
    (v_school_id, 'Grade 5', 5, 'Primary'),
    (v_school_id, 'Grade 6', 6, 'Primary')
    ON CONFLICT DO NOTHING;

    -- 3. Create Teachers
    -- Teacher 1
    -- Teacher 1
    SELECT id INTO v_teacher1_id FROM auth.users WHERE email = 'john.smith@demo.com';
    IF v_teacher1_id IS NULL THEN
        v_teacher1_id := gen_random_uuid();
        -- Auth User
        INSERT INTO auth.users (id, email, aud, role) 
        VALUES (v_teacher1_id, 'john.smith@demo.com', 'authenticated', 'authenticated');
    END IF;

    -- Public User
    INSERT INTO users (id, school_id, email, name, role)
    VALUES (v_teacher1_id, v_school_id, 'john.smith@demo.com', 'John Smith', 'teacher') 
    ON CONFLICT (id) DO NOTHING;

    -- Profile
    INSERT INTO profiles (id, school_id, full_name, role)
    VALUES (v_teacher1_id, v_school_id, 'John Smith', 'Teacher')
    ON CONFLICT (id) DO NOTHING;
    
    -- Teacher Record
    INSERT INTO teachers (id, school_id, user_id, name, email, subject_specialization)
    VALUES (gen_random_uuid(), v_school_id, v_teacher1_id, 'John Smith', 'john.smith@demo.com', ARRAY['Mathematics'])
    ON CONFLICT DO NOTHING;

    -- Teacher 2
    -- Teacher 2
    SELECT id INTO v_teacher2_id FROM auth.users WHERE email = 'sarah.jones@demo.com';
    IF v_teacher2_id IS NULL THEN
        v_teacher2_id := gen_random_uuid();
        INSERT INTO auth.users (id, email, aud, role) 
        VALUES (v_teacher2_id, 'sarah.jones@demo.com', 'authenticated', 'authenticated');
    END IF;

    INSERT INTO users (id, school_id, email, name, role)
    VALUES (v_teacher2_id, v_school_id, 'sarah.jones@demo.com', 'Sarah Jones', 'teacher')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO profiles (id, school_id, full_name, role)
    VALUES (v_teacher2_id, v_school_id, 'Sarah Jones', 'Teacher')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO teachers (id, school_id, user_id, name, email, subject_specialization)
    VALUES (gen_random_uuid(), v_school_id, v_teacher2_id, 'Sarah Jones', 'sarah.jones@demo.com', ARRAY['English'])
    ON CONFLICT DO NOTHING;

    -- 4. Create Parents
    -- 4. Create Parents
    SELECT id INTO v_parent1_id FROM auth.users WHERE email = 'parent1@demo.com';
    IF v_parent1_id IS NULL THEN
        v_parent1_id := gen_random_uuid();
        INSERT INTO auth.users (id, email, aud, role) 
        VALUES (v_parent1_id, 'parent1@demo.com', 'authenticated', 'authenticated');
    END IF;

    INSERT INTO users (id, school_id, email, name, role)
    VALUES (v_parent1_id, v_school_id, 'parent1@demo.com', 'Michael Brown', 'parent')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO profiles (id, school_id, full_name, role)
    VALUES (v_parent1_id, v_school_id, 'Michael Brown', 'Parent')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO parents (id, school_id, user_id, name, email, phone, address)
    VALUES (gen_random_uuid(), v_school_id, v_parent1_id, 'Michael Brown', 'parent1@demo.com', '+1234567890', '123 Maple St')
    ON CONFLICT DO NOTHING;

    -- 5. Create Students
    FOR i IN 1..20 LOOP
        SELECT id INTO v_student1_id FROM auth.users WHERE email = 'student'||i||'@demo.com';
        
        IF v_student1_id IS NULL THEN
            v_student1_id := gen_random_uuid();
            -- Auth User
            INSERT INTO auth.users (id, email, aud, role) 
            VALUES (v_student1_id, 'student'||i||'@demo.com', 'authenticated', 'authenticated');
        END IF;

        -- Public User
        INSERT INTO users (id, school_id, email, full_name, role)
        VALUES (v_student1_id, v_school_id, 'student'||i||'@demo.com', 'Student '||i, 'student')
        ON CONFLICT (id) DO NOTHING;

        -- Profile
        INSERT INTO profiles (id, school_id, full_name, role)
        VALUES (
            v_student1_id, 
            v_school_id, 
            'Student '||i, 
            'Student'
        ) ON CONFLICT (id) DO NOTHING;

        -- Student Record
        INSERT INTO students (
            id, 
            school_id, 
            user_id, 
            name, 
            email,
            grade, 
            section, 
            enrollment_number, 
            attendance_status
        )
        VALUES (
            gen_random_uuid(), 
            v_school_id, 
            v_student1_id, 
            'Student '||i, 
            'student'||i||'@demo.com',
            (i % 6) + 1, 
            CASE WHEN (i % 2) = 0 THEN 'A' ELSE 'B' END, 
            'ENR'||2024000||i, 
            'present'      -- Lowercase
        );
    END LOOP;

    -- 6. Create Fees
    FOR v_student_rec IN (SELECT id, name FROM students WHERE school_id = v_school_id) LOOP
        -- Overdue Fee
        INSERT INTO student_fees (
            student_id, 
            amount, 
            paid_amount,
            status, 
            due_date, 
            title, 
            school_id
        )
        VALUES (
            v_student_rec.id, 
            500.00, 
            0.00,
            'Overdue', 
            NOW() - INTERVAL '30 days', 
            'Term 1 Tuition', 
            v_school_id
        );
        
        -- Paid Fee
        INSERT INTO student_fees (
            student_id, 
            amount, 
            paid_amount,
            status, 
            due_date, 
            title, 
            school_id
        )
        VALUES (
            v_student_rec.id, 
            200.00, 
            200.00,
            'Paid', 
            NOW() - INTERVAL '60 days', 
            'Uniform Fee', 
            v_school_id
        );
    END LOOP;

    -- 7. Create Attendance
    FOR v_student_rec IN (SELECT id, grade FROM students WHERE school_id = v_school_id) LOOP
        -- Find class ID
        SELECT id INTO v_class_map_id FROM classes 
        WHERE school_id = v_school_id AND grade = v_student_rec.grade 
        LIMIT 1;
        
        IF v_class_map_id IS NOT NULL THEN
            INSERT INTO student_attendance (
                student_id,
                date,
                status,
                class_id,
                school_id
            ) VALUES (
                v_student_rec.id,
                CURRENT_DATE,
                'present',   -- Lowercase
                v_class_map_id,
                v_school_id
            ) ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;

END $$;
