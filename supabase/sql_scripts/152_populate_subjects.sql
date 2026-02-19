-- 152_populate_subjects.sql
-- Purpose: 
-- 1. Enable RLS on 'subjects' (if not already)
-- 2. Add permissive RLS policies for Demo School (public access)
-- 3. Populate subjects for SSS, JSS, Primary, and Nursery

-- ==========================================
-- 1. SECURITY & RLS
-- ==========================================
ALTER TABLE "public"."subjects" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_subjects" ON "public"."subjects";
DROP POLICY IF EXISTS "demo_subject_all" ON "public"."subjects";

CREATE POLICY "demo_subject_all" ON "public"."subjects"
FOR ALL TO public
USING (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'::uuid OR school_id = get_school_id())
WITH CHECK (school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'::uuid OR school_id = get_school_id());

-- ==========================================
-- 2. DATA POPULATION
-- ==========================================
DO $$
DECLARE
    v_school_id uuid := 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
BEGIN
    -- SSS CORE
    INSERT INTO subjects (school_id, name, code, category, grade_level_category, is_core) VALUES
    (v_school_id, 'English Language', 'ENG', 'Core', 'SSS', true),
    (v_school_id, 'General Mathematics', 'MTH', 'Core', 'SSS', true),
    (v_school_id, 'Citizenship and Heritage Studies', 'CHS', 'Core', 'SSS', true),
    (v_school_id, 'Digital Technologies', 'DIG', 'Core', 'SSS', true),
    -- Trade (Core choice)
    (v_school_id, 'Solar PV Installation', 'SOL', 'Trade', 'SSS', true),
    (v_school_id, 'GSM Repair', 'GSM', 'Trade', 'SSS', true),
    (v_school_id, 'Fashion Design', 'FSH', 'Trade', 'SSS', true)
    ON CONFLICT (school_id, name) DO UPDATE SET 
        grade_level_category = EXCLUDED.grade_level_category,
        category = EXCLUDED.category,
        is_core = EXCLUDED.is_core;

    -- SSS ELECTIVES (Sciences)
    INSERT INTO subjects (school_id, name, code, category, grade_level_category, is_core) VALUES
    (v_school_id, 'Biology', 'BIO', 'Sciences', 'SSS', false),
    (v_school_id, 'Chemistry', 'CHM', 'Sciences', 'SSS', false),
    (v_school_id, 'Physics', 'PHY', 'Sciences', 'SSS', false),
    (v_school_id, 'Agriculture', 'AGR', 'Sciences', 'SSS', false),
    (v_school_id, 'Further Mathematics', 'FMT', 'Sciences', 'SSS', false),
    (v_school_id, 'Technical Drawing', 'TDW', 'Sciences', 'SSS', false)
    ON CONFLICT (school_id, name) DO UPDATE SET category = 'Sciences', grade_level_category = 'SSS';

    -- SSS ELECTIVES (Humanities)
    INSERT INTO subjects (school_id, name, code, category, grade_level_category, is_core) VALUES
    (v_school_id, 'Literature in English', 'LIT', 'Humanities', 'SSS', false),
    (v_school_id, 'Government', 'GOV', 'Humanities', 'SSS', false),
    (v_school_id, 'Nigerian History', 'HIS', 'Humanities', 'SSS', false),
    (v_school_id, 'Christian Religious Studies', 'CRS', 'Humanities', 'SSS', false),
    (v_school_id, 'Islamic Studies', 'IRS', 'Humanities', 'SSS', false),
    (v_school_id, 'Visual Arts', 'ART', 'Humanities', 'SSS', false)
    ON CONFLICT (school_id, name) DO UPDATE SET category = 'Humanities', grade_level_category = 'SSS';

    -- SSS ELECTIVES (Business)
    INSERT INTO subjects (school_id, name, code, category, grade_level_category, is_core) VALUES
    (v_school_id, 'Accounting', 'ACC', 'Business', 'SSS', false),
    (v_school_id, 'Commerce', 'COM', 'Business', 'SSS', false),
    (v_school_id, 'Economics', 'ECO', 'Business', 'SSS', false),
    (v_school_id, 'Marketing', 'MKT', 'Business', 'SSS', false)
    ON CONFLICT (school_id, name) DO UPDATE SET category = 'Business', grade_level_category = 'SSS';

    -- JSS (General) - Note: Using 'General' as category or 'Core'
    INSERT INTO subjects (school_id, name, code, category, grade_level_category, is_core) VALUES
    (v_school_id, 'English Studies', 'ENG-J', 'General', 'JSS', true),
    (v_school_id, 'Mathematics', 'MTH-J', 'General', 'JSS', true),
    (v_school_id, 'Intermediate Science', 'ISC', 'General', 'JSS', true),
    (v_school_id, 'Digital Technologies & Coding', 'DTC', 'General', 'JSS', true),
    (v_school_id, 'Social and Citizenship Studies', 'SCS', 'General', 'JSS', true),
    (v_school_id, 'Physical & Health Education', 'PHE', 'General', 'JSS', true),
    (v_school_id, 'Hausa Language', 'HAU', 'Languages', 'JSS', false),
    (v_school_id, 'Igbo Language', 'IGB', 'Languages', 'JSS', false),
    (v_school_id, 'Yoruba Language', 'YOR', 'Languages', 'JSS', false),
    (v_school_id, 'Cultural & Creative Arts', 'CCA', 'Arts', 'JSS', false),
    (v_school_id, 'Business Studies', 'BUS', 'Pre-Vocational', 'JSS', false),
    (v_school_id, 'French', 'FRE', 'Languages', 'JSS', false),
    (v_school_id, 'Arabic Language', 'ARB', 'Languages', 'JSS', false)
    ON CONFLICT (school_id, name) DO UPDATE SET grade_level_category = 'JSS';

    -- PRIMARY (Upper & Lower merged for simplicity in catalog, user can assign per class)
    INSERT INTO subjects (school_id, name, code, category, grade_level_category, is_core) VALUES
    (v_school_id, 'Basic Science and Technology', 'BST', 'General', 'Primary', true),
    (v_school_id, 'Basic Digital Literacy', 'BDL', 'General', 'Primary', true),
    (v_school_id, 'Pre-vocational Studies', 'PVS', 'General', 'Primary', true),
    -- Re-inserting common names but with different code if needed? 
    -- Actually, if 'Mathematics' exists for JSS, we can't insert it for Primary with same name/school_id if unique constraint is strictly (school_id, name).
    -- BUT, usually subjects are shared across levels or distinct. 
    -- The user listed "Mathematics" for both. 
    -- If the UNIQUE constraint is (school_id, name), we can't have two "Mathematics".
    -- Strategy: Use "Mathematics (Primary)" or verify if we can share.
    -- Ideally, a subject "Mathematics" can be linked to multiple classes. 
    -- So I will NOT insert duplicate names like "Mathematics" or "English Studies" if they match JSS, 
    -- instead I will update the grade_level_category to include both or leave it general.
    -- however, the column `grade_level_category` is TEXT, not array.
    -- SO, I must use distinct names to allow distinct records if they are truly distinct curriculums.
    -- OR, I update the logic to allow shared subjects.
    -- User likely sees them as separate. Let's append suffix if needed, or check if 'Mathematics' is enough.
    -- For now, I'll attempt to insert. If it conflicts, I'll update. 
    -- Wait, if JSS 'Mathematics' is distinct from Primary 'Mathematics', they need distinct names or codes.
    -- I will suffix them for clarity in the DB: "Mathematics (Primary)", "Mathematics (JSS)". 
    -- user input: "General Mathematics" (SSS), "Mathematics" (JSS), "Mathematics" (Primary).
    -- I will rename JSS/Primary to be specific to avoid ambiguity in reports.
    (v_school_id, 'Mathematics (Primary)', 'MTH-P', 'General', 'Primary', true),
    (v_school_id, 'English Studies (Primary)', 'ENG-P', 'General', 'Primary', true),
    (v_school_id, 'Social and Citizenship Studies (Primary)', 'SCS-P', 'General', 'Primary', true),
    (v_school_id, 'Nigerian History (Primary)', 'HIS-P', 'General', 'Primary', true),
    (v_school_id, 'PHE (Primary)', 'PHE-P', 'General', 'Primary', true),
    (v_school_id, 'CCA (Primary)', 'CCA-P', 'Arts', 'Primary', false)
    ON CONFLICT (school_id, name) DO UPDATE SET grade_level_category = 'Primary';

    -- NURSERY
    INSERT INTO subjects (school_id, name, code, category, grade_level_category, is_core) VALUES
    (v_school_id, 'Numeracy', 'NUM', 'General', 'Nursery', true),
    (v_school_id, 'Literacy', 'LIT-N', 'General', 'Nursery', true),
    (v_school_id, 'Social Habits & Etiquette', 'SOC', 'General', 'Nursery', true),
    (v_school_id, 'Rhymes, Songs, and Creative Play', 'RHY', 'Arts', 'Nursery', true)
    ON CONFLICT (school_id, name) DO UPDATE SET grade_level_category = 'Nursery';

END $$;
