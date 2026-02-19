-- 153_link_subjects_to_curriculum.sql
-- Purpose: 
-- 1. Create 'Nigerian Curriculum' if it doesn't exist
-- 2. Link all Demo School subjects to this curriculum

DO $$
DECLARE
    v_curriculum_id uuid;
    v_school_id uuid := 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
BEGIN
    -- 1. Get or Create Curriculum
    SELECT id INTO v_curriculum_id FROM curricula WHERE name = 'Nigerian Curriculum';
    
    IF v_curriculum_id IS NULL THEN
        v_curriculum_id := gen_random_uuid();
        INSERT INTO curricula (id, name, description)
        VALUES (v_curriculum_id, 'Nigerian Curriculum', 'Standard Nigerian Curriculum for Primary and Secondary Schools');
    END IF;

    -- 2. Link Subjects
    UPDATE subjects
    SET curriculum_id = v_curriculum_id
    WHERE school_id = v_school_id
    AND curriculum_id IS NULL; -- Only link those not yet linked (idempotency)

    RAISE NOTICE 'Linked subjects to Nigerian Curriculum (%)', v_curriculum_id;
END $$;
