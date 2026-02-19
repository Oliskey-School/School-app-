-- 151_populate_and_secure_classes.sql
-- Purpose: 
-- 1. Updates schema constraints for 'level'
-- 2. Fixes RLS policies for classes/schools/branches (Public/Demo access)
-- 3. Populates the standard class list for the Demo School

-- ==========================================
-- 1. SCHEMA UPDATE
-- ==========================================
DO $$ BEGIN
    ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_level_check;
    ALTER TABLE classes ADD CONSTRAINT classes_level_check 
    CHECK (level IN ('Preschool', 'Primary', 'Secondary', 'Tertiary', 'JSS', 'SSS', 'Nursery'));
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- ==========================================
-- 2. RLS SECURITY FIXES (Demo Public Access)
-- ==========================================
-- Classes
DROP POLICY IF EXISTS "tenant_isolation_classes" ON "public"."classes";
DROP POLICY IF EXISTS "demo_class_select" ON "public"."classes";
DROP POLICY IF EXISTS "demo_class_insert" ON "public"."classes";
DROP POLICY IF EXISTS "demo_class_update" ON "public"."classes";
DROP POLICY IF EXISTS "demo_class_delete" ON "public"."classes";


CREATE POLICY "demo_class_select" ON "public"."classes"
FOR SELECT TO public
USING (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'::uuid OR school_id = get_school_id());

CREATE POLICY "demo_class_insert" ON "public"."classes"
FOR INSERT TO public
WITH CHECK (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'::uuid OR school_id = get_school_id());

CREATE POLICY "demo_class_update" ON "public"."classes"
FOR UPDATE TO public
USING (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'::uuid OR school_id = get_school_id())
WITH CHECK (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'::uuid OR school_id = get_school_id());

CREATE POLICY "demo_class_delete" ON "public"."classes"
FOR DELETE TO public
USING (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'::uuid OR school_id = get_school_id());

-- Schools & Branches
DROP POLICY IF EXISTS "tenant_isolation_schools" ON "public"."schools";
DROP POLICY IF EXISTS "demo_bypass_schools" ON "public"."schools";
DROP POLICY IF EXISTS "demo_school_all" ON "public"."schools";
CREATE POLICY "demo_school_all" ON "public"."schools" FOR ALL TO public
USING (id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'::uuid OR id = get_school_id())
WITH CHECK (id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'::uuid OR id = get_school_id());

DROP POLICY IF EXISTS "tenant_isolation_branches" ON "public"."branches";
DROP POLICY IF EXISTS "demo_bypass_branches" ON "public"."branches";
DROP POLICY IF EXISTS "demo_branch_all" ON "public"."branches";
CREATE POLICY "demo_branch_all" ON "public"."branches" FOR ALL TO public
USING (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'::uuid OR school_id = get_school_id())
WITH CHECK (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'::uuid OR school_id = get_school_id());

-- ==========================================
-- 3. DATA POPULATION (Demo School)
-- ==========================================
DO $$
DECLARE
    v_school_id uuid := 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
BEGIN
    -- SSS
    INSERT INTO classes (school_id, name, grade, level, section) VALUES
    (v_school_id, 'SSS 3', 12, 'SSS', NULL),
    (v_school_id, 'SSS 2', 11, 'SSS', NULL),
    (v_school_id, 'SSS 1', 10, 'SSS', NULL)
    ON CONFLICT DO NOTHING;

    -- JSS
    INSERT INTO classes (school_id, name, grade, level, section) VALUES
    (v_school_id, 'JSS 3', 9, 'JSS', NULL),
    (v_school_id, 'JSS 2', 8, 'JSS', NULL),
    (v_school_id, 'JSS 1', 7, 'JSS', NULL)
    ON CONFLICT DO NOTHING;

    -- Primary
    INSERT INTO classes (school_id, name, grade, level, section) VALUES
    (v_school_id, 'Primary 6', 6, 'Primary', NULL),
    (v_school_id, 'Primary 5', 5, 'Primary', NULL),
    (v_school_id, 'Primary 4', 4, 'Primary', NULL),
    (v_school_id, 'Primary 3', 3, 'Primary', NULL),
    (v_school_id, 'Primary 2', 2, 'Primary', NULL),
    (v_school_id, 'Primary 1', 1, 'Primary', NULL)
    ON CONFLICT DO NOTHING;

    -- Nursery
    INSERT INTO classes (school_id, name, grade, level, section) VALUES
    (v_school_id, 'Nursery 2', 0, 'Nursery', NULL),
    (v_school_id, 'Nursery 1', -1, 'Nursery', NULL),
    (v_school_id, 'Pre-Nursery / Playgroup', -2, 'Nursery', NULL),
    (v_school_id, 'Creche', -3, 'Nursery', NULL)
    ON CONFLICT DO NOTHING;
    
    -- Cleanup old/duplicate names if necessary
    DELETE FROM classes WHERE school_id = v_school_id AND name LIKE 'Grade %';
    
END $$;
