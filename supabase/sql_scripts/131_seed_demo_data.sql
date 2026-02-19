-- DATA SEEDING SCRIPT for 'Demo Academy'
-- Purpose: Populate the database with realistic demo data to ensure dashboards are not empty.
-- Target School: Demo Academy (d0ff3e95-9b4c-4c12-989c-e5640d3cacd1)

DO $$
DECLARE
    v_school_id uuid := 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
    v_admin_id uuid;
    v_teacher1_id uuid;
    v_teacher2_id uuid;
    v_parent1_id uuid;
    v_parent2_id uuid;
    v_student1_id uuid;
    v_student2_id uuid;
    v_student_rec record;
    v_subject_math uuid;
    v_subject_eng uuid;
    v_subject_sci uuid;
    v_subject_hist uuid;
    v_class1_id uuid;
    v_class2_id uuid;
BEGIN
    -- 1. Ensure School Exists (Already confirmed, but good practice to allow run elsewhere if needed, skipping for now as ID is fixed)
    
    -- 2. Create/Get Subjects
    INSERT INTO subjects (school_id, name, code, description) VALUES
    (v_school_id, 'Mathematics', 'MATH', 'Core Mathematics'),
    (v_school_id, 'English Language', 'ENG', 'English Language and Literature'),
    (v_school_id, 'General Science', 'SCI', 'Integrated Science'),
    (v_school_id, 'History', 'HIST', 'World History')
    ON CONFLICT DO NOTHING;
    
    SELECT id INTO v_subject_math FROM subjects WHERE school_id = v_school_id AND code = 'MATH' LIMIT 1;
    SELECT id INTO v_subject_eng FROM subjects WHERE school_id = v_school_id AND code = 'ENG' LIMIT 1;
    SELECT id INTO v_subject_sci FROM subjects WHERE school_id = v_school_id AND code = 'SCI' LIMIT 1;
    SELECT id INTO v_subject_hist FROM subjects WHERE school_id = v_school_id AND code = 'HIST' LIMIT 1;

    -- 3. Create Classes
    INSERT INTO classes (school_id, name, grade_level) VALUES
    (v_school_id, 'Grade 1', 1),
    (v_school_id, 'Grade 2', 2),
    (v_school_id, 'Grade 3', 3),
    (v_school_id, 'Grade 4', 4),
    (v_school_id, 'Grade 5', 5),
    (v_school_id, 'Grade 6', 6)
    ON CONFLICT DO NOTHING;

    -- 4. Create Teachers (Profiles)
    -- We generate UUIDs for them. Since we can't easily insert into auth.users, these users won't be able to login 
    -- unless we manually create auth users later. But they will appear in lists.
    
    -- Teacher 1: Mr. John Smith
    v_teacher1_id := gen_random_uuid();
    INSERT INTO profiles (id, school_id, email, name, role, user_type)
    VALUES (v_teacher1_id, v_school_id, 'john.smith@demo.com', 'John Smith', 'teacher', 'teacher')
    ON CONFLICT (id) DO NOTHING; -- unlikely to conflict with random uuid
    
    INSERT INTO teachers (id, school_id, user_id, name, email, subject_specialization, qualification)
    VALUES (gen_random_uuid(), v_school_id, v_teacher1_id, 'John Smith', 'john.smith@demo.com', 'Mathematics', 'B.Ed Math')
    ON CONFLICT DO NOTHING;

    -- Teacher 2: Mrs. Sarah Jones
    v_teacher2_id := gen_random_uuid();
    INSERT INTO profiles (id, school_id, email, name, role, user_type)
    VALUES (v_teacher2_id, v_school_id, 'sarah.jones@demo.com', 'Sarah Jones', 'teacher', 'teacher')
    ON CONFLICT DO NOTHING;

    INSERT INTO teachers (id, school_id, user_id, name, email, subject_specialization, qualification)
    VALUES (gen_random_uuid(), v_school_id, v_teacher2_id, 'Sarah Jones', 'sarah.jones@demo.com', 'English', 'MA English')
    ON CONFLICT DO NOTHING;

    -- 5. Create Parents
    -- Parent 1
    v_parent1_id := gen_random_uuid();
    INSERT INTO profiles (id, school_id, email, name, role, user_type)
    VALUES (v_parent1_id, v_school_id, 'parent1@demo.com', 'Michael Brown', 'parent', 'parent')
    ON CONFLICT DO NOTHING;

    INSERT INTO parents (id, school_id, user_id, name, email, phone, address)
    VALUES (gen_random_uuid(), v_school_id, v_parent1_id, 'Michael Brown', 'parent1@demo.com', '+1234567890', '123 Maple St')
    ON CONFLICT DO NOTHING;

    -- 6. Create Students
    -- Create 20 students
    FOR i IN 1..20 LOOP
        v_student1_id := gen_random_uuid();
        INSERT INTO profiles (id, school_id, email, name, role, user_type)
        VALUES (
            v_student1_id, 
            v_school_id, 
            'student'||i||'@demo.com', 
            'Student '||i, 
            'student', 
            'student'
        );

        INSERT INTO students (
            id, 
            school_id, 
            user_id, 
            name, 
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
            (i % 6) + 1, 
            CASE WHEN (i % 2) = 0 THEN 'A' ELSE 'B' END, 
            'ENR'||2024000||i, 
            'Present'
        );
    END LOOP;

    -- 7. Create Fees (Overdue & Paid)
    -- We need to select students we just created
    FOR v_student_rec IN (SELECT id, name FROM students WHERE school_id = v_school_id) LOOP
        -- Create an Overdue Fee
        INSERT INTO student_fees (
            student_id, 
            amount, 
            total_fee,
            paid_amount,
            status, 
            due_date, 
            title, 
            term,
            school_id -- Assuming column exists based on best practices, if not it will fail and I'll fix
        )
        VALUES (
            v_student_rec.id, 
            500.00, 
            500.00,
            0.00,
            'Overdue', 
            NOW() - INTERVAL '30 days', 
            'Term 1 Tuition', 
            'Term 1',
            v_school_id
        );
        
        -- Create a Paid Fee
        INSERT INTO student_fees (
            student_id, 
            amount, 
            total_fee,
            paid_amount,
            status, 
            due_date, 
            title, 
            term,
            school_id
        )
        VALUES (
            v_student_rec.id, 
            200.00, 
            200.00,
            200.00,
            'Paid', 
            NOW() - INTERVAL '60 days', 
            'Uniform Fee', 
            'Term 1',
            v_school_id
        );
    END LOOP;

    -- 8. Create Attendance
    -- Mark today as 'Present' for everyone
     FOR v_student_rec IN (SELECT id, name, grade, section FROM students WHERE school_id = v_school_id) LOOP
        INSERT INTO student_attendance (
            student_id,
            date,
            status,
            class_name,
            school_id
        ) VALUES (
            v_student_rec.id,
            CURRENT_DATE,
            'Present',
            'Grade ' || v_student_rec.grade || ' - ' || v_student_rec.section,
            v_school_id
        ) ON CONFLICT DO NOTHING;
    END LOOP;

END $$;
