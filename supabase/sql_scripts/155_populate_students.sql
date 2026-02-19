-- Populate Classes with Students
-- This script ensures every class has at least 5 students.

DO $$
DECLARE
    school_id_val UUID := 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'; -- Demo School
    branch_id_val UUID := '7601cbea-e1ba-49d6-b59b-412a584cb94f'; -- Main Branch
    class_rec RECORD;
    i INT;
    new_student_id UUID;
    student_first_names TEXT[] := ARRAY['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
    student_last_names TEXT[] := ARRAY['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
    random_first_name TEXT;
    random_last_name TEXT;
BEGIN
    -- Loop through all active active classes for the school
    FOR class_rec IN SELECT id, name FROM classes WHERE school_id = school_id_val LOOP
        
        -- Check how many students are currently in the class
        -- We want at least 5 students.
        -- We will just add 5 more to be safe and ensure "more in each class" as requested.
        
        FOR i IN 1..5 LOOP
            -- Generate random names
            random_first_name := student_first_names[1 + floor(random() * array_length(student_first_names, 1))::int];
            random_last_name := student_last_names[1 + floor(random() * array_length(student_last_names, 1))::int];
            
            INSERT INTO students (
                first_name, 
                last_name, 
                name, -- Full name
                email, 
                admission_number, 
                school_id, 
                branch_id, 
                class_id, 
                current_class_id,
                status,
                gender,
                date_of_birth,
                enrollment_number
            ) VALUES (
                random_first_name,
                random_last_name,
                random_first_name || ' ' || random_last_name,
                lower(random_first_name) || '.' || lower(random_last_name) || '.' || floor(random() * 10000)::text || '@demo.school',
                'ADM-' || floor(random() * 100000)::text,
                school_id_val,
                branch_id_val,
                class_rec.id,
                class_rec.id,
                'Active', -- Fixed case
                CASE WHEN random() > 0.5 THEN 'Male' ELSE 'Female' END,
                (NOW() - (interval '1 year' * (5 + floor(random() * 13)::int)))::date, -- Age between 5 and 18
                'ENR-' || floor(random() * 100000)::text
            );
        END LOOP;
    END LOOP;
END $$;
