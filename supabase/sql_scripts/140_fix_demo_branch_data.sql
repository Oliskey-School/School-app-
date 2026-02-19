
-- Fix Demo Data Branch Assignment
-- Assigns most students/teachers to Main Branch, and some to Main Campus

DO $$
DECLARE
    v_school_id UUID := 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
    v_main_branch_id UUID := '7601cbea-e1ba-49d6-b59b-412a584cb94f';
    v_campus_branch_id UUID := '90525ef7-34ed-4bb4-af6b-f04884ec6e85';
BEGIN
    -- 1. Update STUDENTS
    -- Assign first 15 to Main Branch
    UPDATE students
    SET branch_id = v_main_branch_id
    WHERE id IN (
        SELECT id FROM students 
        WHERE school_id = v_school_id 
        ORDER BY name 
        LIMIT 15
    );

    -- Assign remaining (5) to Main Campus
    UPDATE students
    SET branch_id = v_campus_branch_id
    WHERE school_id = v_school_id 
    AND branch_id IS NULL; -- records not caught by above update

    -- 2. Update TEACHERS
    -- Assign first 2 to Main Branch
    UPDATE teachers
    SET branch_id = v_main_branch_id
    WHERE id IN (
        SELECT id FROM teachers 
        WHERE school_id = v_school_id 
        ORDER BY name 
        LIMIT 2
    );

    -- Assign remaining (1) to Main Campus
    UPDATE teachers
    SET branch_id = v_campus_branch_id
    WHERE school_id = v_school_id 
    AND branch_id IS NULL;

    -- 3. Update PARENTS
    -- Assign all to Main Branch for simplicity, or split if needed
    UPDATE parents
    SET branch_id = v_main_branch_id
    WHERE school_id = v_school_id;

    -- 4. Update Classes (Important for "Manage Classes" view)
    UPDATE classes
    SET branch_id = v_main_branch_id
    WHERE school_id = v_school_id;

END $$;
