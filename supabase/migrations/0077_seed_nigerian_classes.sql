-- Migration: 0077_seed_nigerian_classes.sql
-- Description: Adds level_category column and seeds Nigerian K-12 classes for Demo Academy

DO $$
DECLARE
    target_school_id UUID := 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'; -- Demo Academy
    target_branch_id UUID;
BEGIN
    -- 1. Add level_category column to classes if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'classes' 
        AND column_name = 'level_category'
    ) THEN
        ALTER TABLE public.classes ADD COLUMN level_category TEXT;
    END IF;

    -- 1b. Fix Incorrect Global Unique Constraint on Name (Must be per school)
    -- Drop the global unique constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'classes_name_key'
    ) THEN
        ALTER TABLE public.classes DROP CONSTRAINT classes_name_key;
    END IF;

    -- Add the correct composite unique constraint (school_id, name) if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'classes_school_id_name_key'
    ) THEN
        ALTER TABLE public.classes ADD CONSTRAINT classes_school_id_name_key UNIQUE (school_id, name);
    END IF;

    -- 2. Ensure a Main Branch exists using a more robust check (or create one)
    SELECT id INTO target_branch_id 
    FROM public.branches 
    WHERE school_id = target_school_id 
    AND is_main = true 
    LIMIT 1;

    IF target_branch_id IS NULL THEN
        INSERT INTO public.branches (school_id, name, is_main, address, phone)
        VALUES (target_school_id, 'Main Branch', true, '123 School Lane', '0800-SCHOOL')
        RETURNING id INTO target_branch_id;
    END IF;

    -- 3. Seed Classes (Idempotent Insert using Loop or direct blocks)
    
    -- Early Years (Mapped to 'Preschool' for level constraint)
    INSERT INTO public.classes (school_id, branch_id, name, level_category, grade, level)
    SELECT target_school_id, target_branch_id, 'Creche', 'Early Years', 0, 'Preschool'
    WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE school_id = target_school_id AND name = 'Creche');

    INSERT INTO public.classes (school_id, branch_id, name, level_category, grade, level)
    SELECT target_school_id, target_branch_id, 'Pre-KG', 'Early Years', 0, 'Preschool'
    WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE school_id = target_school_id AND name = 'Pre-KG');

    INSERT INTO public.classes (school_id, branch_id, name, level_category, grade, level)
    SELECT target_school_id, target_branch_id, 'KG 1', 'Early Years', 0, 'Preschool'
    WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE school_id = target_school_id AND name = 'KG 1');

    INSERT INTO public.classes (school_id, branch_id, name, level_category, grade, level)
    SELECT target_school_id, target_branch_id, 'KG 2', 'Early Years', 0, 'Preschool'
    WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE school_id = target_school_id AND name = 'KG 2');

    -- Primary (Mapped to 'Primary')
    INSERT INTO public.classes (school_id, branch_id, name, level_category, grade, level)
    SELECT target_school_id, target_branch_id, 'Primary 1', 'Primary', 1, 'Primary'
    WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE school_id = target_school_id AND name = 'Primary 1');

    INSERT INTO public.classes (school_id, branch_id, name, level_category, grade, level)
    SELECT target_school_id, target_branch_id, 'Primary 2', 'Primary', 2, 'Primary'
    WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE school_id = target_school_id AND name = 'Primary 2');

    INSERT INTO public.classes (school_id, branch_id, name, level_category, grade, level)
    SELECT target_school_id, target_branch_id, 'Primary 3', 'Primary', 3, 'Primary'
    WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE school_id = target_school_id AND name = 'Primary 3');

    INSERT INTO public.classes (school_id, branch_id, name, level_category, grade, level)
    SELECT target_school_id, target_branch_id, 'Primary 4', 'Primary', 4, 'Primary'
    WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE school_id = target_school_id AND name = 'Primary 4');

    INSERT INTO public.classes (school_id, branch_id, name, level_category, grade, level)
    SELECT target_school_id, target_branch_id, 'Primary 5', 'Primary', 5, 'Primary'
    WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE school_id = target_school_id AND name = 'Primary 5');

    INSERT INTO public.classes (school_id, branch_id, name, level_category, grade, level)
    SELECT target_school_id, target_branch_id, 'Primary 6', 'Primary', 6, 'Primary'
    WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE school_id = target_school_id AND name = 'Primary 6');

    -- Junior Secondary (Mapped to 'Secondary')
    INSERT INTO public.classes (school_id, branch_id, name, level_category, grade, level)
    SELECT target_school_id, target_branch_id, 'JSS 1', 'Junior Secondary', 7, 'Secondary'
    WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE school_id = target_school_id AND name = 'JSS 1');

    INSERT INTO public.classes (school_id, branch_id, name, level_category, grade, level)
    SELECT target_school_id, target_branch_id, 'JSS 2', 'Junior Secondary', 8, 'Secondary'
    WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE school_id = target_school_id AND name = 'JSS 2');

    INSERT INTO public.classes (school_id, branch_id, name, level_category, grade, level)
    SELECT target_school_id, target_branch_id, 'JSS 3', 'Junior Secondary', 9, 'Secondary'
    WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE school_id = target_school_id AND name = 'JSS 3');

    -- Senior Secondary (Mapped to 'Secondary')
    INSERT INTO public.classes (school_id, branch_id, name, level_category, grade, level)
    SELECT target_school_id, target_branch_id, 'SSS 1', 'Senior Secondary', 10, 'Secondary'
    WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE school_id = target_school_id AND name = 'SSS 1');

    INSERT INTO public.classes (school_id, branch_id, name, level_category, grade, level)
    SELECT target_school_id, target_branch_id, 'SSS 2', 'Senior Secondary', 11, 'Secondary'
    WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE school_id = target_school_id AND name = 'SSS 2');

    INSERT INTO public.classes (school_id, branch_id, name, level_category, grade, level)
    SELECT target_school_id, target_branch_id, 'SSS 3', 'Senior Secondary', 12, 'Secondary'
    WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE school_id = target_school_id AND name = 'SSS 3');

END $$;
