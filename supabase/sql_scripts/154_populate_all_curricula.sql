-- ==========================================
-- 1. Standardize Curricula
-- ==========================================

-- Ensure we have exactly two main curricula: "Nigerian Curriculum" and "British Curriculum"
-- We will use UPSERT based on name to get IDs.

-- First, clean up any "Nigerian" duplicates if they exist and we want to consolidate to "Nigerian Curriculum"
-- If "Nigerian" exists, let's rename it to "Nigerian Curriculum" to preserve ID if possible
UPDATE curricula 
SET name = 'Nigerian Curriculum', description = 'Standard Nigerian Curriculum (NERDC)'
WHERE name = 'Nigerian';

-- If "British" exists, rename to "British Curriculum"
UPDATE curricula
SET name = 'British Curriculum', description = 'British National Curriculum (Key Stages)'
WHERE name = 'British';

-- Insert if they don't exist
INSERT INTO curricula (name, description)
VALUES 
    ('Nigerian Curriculum', 'Standard Nigerian Curriculum (NERDC)'),
    ('British Curriculum', 'British National Curriculum (Key Stages)')
ON CONFLICT (name) DO NOTHING;

-- Get IDs for reference
DO $$
DECLARE
    nigerian_id UUID;
    british_id UUID;
    school_id_val UUID;
BEGIN
    SELECT id INTO nigerian_id FROM curricula WHERE name = 'Nigerian Curriculum';
    SELECT id INTO british_id FROM curricula WHERE name = 'British Curriculum';
    
    -- Get Demo School ID
    SELECT id INTO school_id_val FROM schools LIMIT 1;

    -- ==========================================
    -- 2. Populate Nigerian Curriculum Subjects
    -- ==========================================

    -- Primary (Basic 1-6)
    -- Core
    INSERT INTO subjects (name, code, category, curriculum_id, grade_level_category, school_id) VALUES
    ('English Studies', 'ENG-PRI', 'Core', nigerian_id, 'Primary', school_id_val),
    ('Mathematics', 'MATH-PRI', 'Core', nigerian_id, 'Primary', school_id_val),
    ('Basic Science & Technology', 'BST-PRI', 'Core', nigerian_id, 'Primary', school_id_val),
    ('Religion & National Values', 'RNV-PRI', 'Core', nigerian_id, 'Primary', school_id_val),
    ('Pre-Vocational Studies', 'PVS-PRI', 'Core', nigerian_id, 'Primary', school_id_val)
    ON CONFLICT (name, grade_level_category, school_id) DO UPDATE SET curriculum_id = nigerian_id;

    -- Other
    INSERT INTO subjects (name, code, category, curriculum_id, grade_level_category, school_id) VALUES
    ('Cultural & Creative Arts', 'CCA-PRI', 'Elective', nigerian_id, 'Primary', school_id_val),
    ('French', 'FREN-PRI', 'Elective', nigerian_id, 'Primary', school_id_val),
    ('Yoruba', 'YOR-PRI', 'Elective', nigerian_id, 'Primary', school_id_val),
    ('Igbo', 'IGB-PRI', 'Elective', nigerian_id, 'Primary', school_id_val),
    ('Hausa', 'HAU-PRI', 'Elective', nigerian_id, 'Primary', school_id_val)
    ON CONFLICT (name, grade_level_category, school_id) DO UPDATE SET curriculum_id = nigerian_id;

    -- JSS (1-3)
    -- Core
    INSERT INTO subjects (name, code, category, curriculum_id, grade_level_category, school_id) VALUES
    ('English Language', 'ENG-JSS', 'Core', nigerian_id, 'JSS', school_id_val),
    ('Mathematics', 'MATH-JSS', 'Core', nigerian_id, 'JSS', school_id_val),
    ('Basic Science', 'BS-JSS', 'Core', nigerian_id, 'JSS', school_id_val),
    ('Basic Technology', 'BT-JSS', 'Core', nigerian_id, 'JSS', school_id_val)
    ON CONFLICT (name, grade_level_category, school_id) DO UPDATE SET curriculum_id = nigerian_id;

    -- Humanities & Arts
    INSERT INTO subjects (name, code, category, curriculum_id, grade_level_category, school_id) VALUES
    ('Social Studies', 'SOC-JSS', 'Humanities', nigerian_id, 'JSS', school_id_val),
    ('Civic Education', 'CIV-JSS', 'Humanities', nigerian_id, 'JSS', school_id_val),
    ('Business Studies', 'BUS-JSS', 'Humanities', nigerian_id, 'JSS', school_id_val),
    ('Cultural & Creative Arts', 'CCA-JSS', 'Arts', nigerian_id, 'JSS', school_id_val),
    ('French', 'FREN-JSS', 'Languages', nigerian_id, 'JSS', school_id_val),
    ('Christian Religious Studies', 'CRS-JSS', 'Humanities', nigerian_id, 'JSS', school_id_val),
    ('Islamic Religious Studies', 'IRS-JSS', 'Humanities', nigerian_id, 'JSS', school_id_val)
    ON CONFLICT (name, grade_level_category, school_id) DO UPDATE SET curriculum_id = nigerian_id;

    -- Vocational
    INSERT INTO subjects (name, code, category, curriculum_id, grade_level_category, school_id) VALUES
    ('Agricultural Science', 'AGR-JSS', 'Vocational', nigerian_id, 'JSS', school_id_val),
    ('Home Economics', 'HE-JSS', 'Vocational', nigerian_id, 'JSS', school_id_val),
    ('Physical & Health Education', 'PHE-JSS', 'Vocational', nigerian_id, 'JSS', school_id_val)
    ON CONFLICT (name, grade_level_category, school_id) DO UPDATE SET curriculum_id = nigerian_id;

    -- SSS (1-3)
    -- Compulsory
    INSERT INTO subjects (name, code, category, curriculum_id, grade_level_category, school_id) VALUES
    ('English Language', 'ENG-SSS', 'Core', nigerian_id, 'SSS', school_id_val),
    ('Mathematics', 'MATH-SSS', 'Core', nigerian_id, 'SSS', school_id_val),
    ('Civic Education', 'CIV-SSS', 'Core', nigerian_id, 'SSS', school_id_val),
    ('Data Processing', 'DP-SSS', 'Vocational', nigerian_id, 'SSS', school_id_val),
    ('Catering Craft Practice', 'CCP-SSS', 'Vocational', nigerian_id, 'SSS', school_id_val)
    ON CONFLICT (name, grade_level_category, school_id) DO UPDATE SET curriculum_id = nigerian_id;

    -- Science Major
    INSERT INTO subjects (name, code, category, curriculum_id, grade_level_category, school_id) VALUES
    ('Physics', 'PHY-SSS', 'Science', nigerian_id, 'SSS', school_id_val),
    ('Chemistry', 'CHEM-SSS', 'Science', nigerian_id, 'SSS', school_id_val),
    ('Biology', 'BIO-SSS', 'Science', nigerian_id, 'SSS', school_id_val),
    ('Further Mathematics', 'FM-SSS', 'Science', nigerian_id, 'SSS', school_id_val),
    ('Technical Drawing', 'TD-SSS', 'Science', nigerian_id, 'SSS', school_id_val)
    ON CONFLICT (name, grade_level_category, school_id) DO UPDATE SET curriculum_id = nigerian_id;

    -- Arts Major
    INSERT INTO subjects (name, code, category, curriculum_id, grade_level_category, school_id) VALUES
    ('Literature in English', 'LIT-SSS', 'Arts', nigerian_id, 'SSS', school_id_val),
    ('Government', 'GOV-SSS', 'Arts', nigerian_id, 'SSS', school_id_val),
    ('History', 'HIS-SSS', 'Arts', nigerian_id, 'SSS', school_id_val),
    ('Christian Religious Knowledge', 'CRK-SSS', 'Arts', nigerian_id, 'SSS', school_id_val),
    ('Islamic Religious Knowledge', 'IRK-SSS', 'Arts', nigerian_id, 'SSS', school_id_val)
    ON CONFLICT (name, grade_level_category, school_id) DO UPDATE SET curriculum_id = nigerian_id;

    -- Commercial Major
    INSERT INTO subjects (name, code, category, curriculum_id, grade_level_category, school_id) VALUES
    ('Economics', 'ECO-SSS', 'Commercial', nigerian_id, 'SSS', school_id_val),
    ('Financial Accounting', 'ACC-SSS', 'Commercial', nigerian_id, 'SSS', school_id_val),
    ('Commerce', 'COM-SSS', 'Commercial', nigerian_id, 'SSS', school_id_val)
    ON CONFLICT (name, grade_level_category, school_id) DO UPDATE SET curriculum_id = nigerian_id;


    -- ==========================================
    -- 3. Populate British Curriculum Subjects
    -- ==========================================

    -- Primary (KS1 & KS2)
    -- Core
    INSERT INTO subjects (name, code, category, curriculum_id, grade_level_category, school_id) VALUES
    ('English (British)', 'ENG-KS', 'Core', british_id, 'Key Stage 1 & 2', school_id_val),
    ('Mathematics (British)', 'MATH-KS', 'Core', british_id, 'Key Stage 1 & 2', school_id_val),
    ('Science (British)', 'SCI-KS', 'Core', british_id, 'Key Stage 1 & 2', school_id_val)
    ON CONFLICT (name, grade_level_category, school_id) DO UPDATE SET curriculum_id = british_id;

    -- Foundation
    INSERT INTO subjects (name, code, category, curriculum_id, grade_level_category, school_id) VALUES
    ('Art and Design', 'ART-KS', 'Foundation', british_id, 'Key Stage 1 & 2', school_id_val),
    ('Computing', 'COMP-KS', 'Foundation', british_id, 'Key Stage 1 & 2', school_id_val),
    ('Design and Technology', 'DT-KS', 'Foundation', british_id, 'Key Stage 1 & 2', school_id_val),
    ('Geography', 'GEO-KS', 'Foundation', british_id, 'Key Stage 1 & 2', school_id_val),
    ('History', 'HIS-KS', 'Foundation', british_id, 'Key Stage 1 & 2', school_id_val),
    ('Music', 'MUS-KS', 'Foundation', british_id, 'Key Stage 1 & 2', school_id_val),
    ('Physical Education', 'PE-KS', 'Foundation', british_id, 'Key Stage 1 & 2', school_id_val),
    ('Foreign Language (French/Spanish)', 'FL-KS', 'Foundation', british_id, 'Key Stage 1 & 2', school_id_val)
    ON CONFLICT (name, grade_level_category, school_id) DO UPDATE SET curriculum_id = british_id;


    -- Lower Secondary (KS3)
    -- Core
    INSERT INTO subjects (name, code, category, curriculum_id, grade_level_category, school_id) VALUES
    ('English (KS3)', 'ENG-KS3', 'Core', british_id, 'Key Stage 3', school_id_val),
    ('Mathematics (KS3)', 'MATH-KS3', 'Core', british_id, 'Key Stage 3', school_id_val),
    ('Biology (KS3)', 'BIO-KS3', 'Core', british_id, 'Key Stage 3', school_id_val),
    ('Chemistry (KS3)', 'CHEM-KS3', 'Core', british_id, 'Key Stage 3', school_id_val),
    ('Physics (KS3)', 'PHY-KS3', 'Core', british_id, 'Key Stage 3', school_id_val)
    ON CONFLICT (name, grade_level_category, school_id) DO UPDATE SET curriculum_id = british_id;

    -- Foundation
    INSERT INTO subjects (name, code, category, curriculum_id, grade_level_category, school_id) VALUES
    ('History (KS3)', 'HIS-KS3', 'Foundation', british_id, 'Key Stage 3', school_id_val),
    ('Geography (KS3)', 'GEO-KS3', 'Foundation', british_id, 'Key Stage 3', school_id_val),
    ('Modern Foreign Languages', 'MFL-KS3', 'Foundation', british_id, 'Key Stage 3', school_id_val),
    ('Art and Design (KS3)', 'ART-KS3', 'Foundation', british_id, 'Key Stage 3', school_id_val),
    ('Computing (KS3)', 'COMP-KS3', 'Foundation', british_id, 'Key Stage 3', school_id_val),
    ('Design and Technology (KS3)', 'DT-KS3', 'Foundation', british_id, 'Key Stage 3', school_id_val),
    ('Music (KS3)', 'MUS-KS3', 'Foundation', british_id, 'Key Stage 3', school_id_val),
    ('Physical Education (KS3)', 'PE-KS3', 'Foundation', british_id, 'Key Stage 3', school_id_val),
    ('Citizenship', 'CIT-KS3', 'Foundation', british_id, 'Key Stage 3', school_id_val)
    ON CONFLICT (name, grade_level_category, school_id) DO UPDATE SET curriculum_id = british_id;


    -- Upper Secondary (KS4 / IGCSE)
    -- Core
    INSERT INTO subjects (name, code, category, curriculum_id, grade_level_category, school_id) VALUES
    ('English Language (IGCSE)', 'ENG-IGCSE', 'Core', british_id, 'Key Stage 4', school_id_val),
    ('English Literature (IGCSE)', 'LIT-IGCSE', 'Core', british_id, 'Key Stage 4', school_id_val),
    ('Mathematics (IGCSE)', 'MATH-IGCSE', 'Core', british_id, 'Key Stage 4', school_id_val),
    ('Combined Science', 'SCI-IGCSE', 'Core', british_id, 'Key Stage 4', school_id_val)
    ON CONFLICT (name, grade_level_category, school_id) DO UPDATE SET curriculum_id = british_id;

    -- Electives
    INSERT INTO subjects (name, code, category, curriculum_id, grade_level_category, school_id) VALUES
    ('Geography (IGCSE)', 'GEO-IGCSE', 'Elective', british_id, 'Key Stage 4', school_id_val),
    ('History (IGCSE)', 'HIS-IGCSE', 'Elective', british_id, 'Key Stage 4', school_id_val),
    ('Business Studies (IGCSE)', 'BUS-IGCSE', 'Elective', british_id, 'Key Stage 4', school_id_val),
    ('Computer Science (IGCSE)', 'CS-IGCSE', 'Elective', british_id, 'Key Stage 4', school_id_val),
    ('Economics (IGCSE)', 'ECO-IGCSE', 'Elective', british_id, 'Key Stage 4', school_id_val),
    ('Art (IGCSE)', 'ART-IGCSE', 'Elective', british_id, 'Key Stage 4', school_id_val),
    ('Drama (IGCSE)', 'DRA-IGCSE', 'Elective', british_id, 'Key Stage 4', school_id_val)
    ON CONFLICT (name, grade_level_category, school_id) DO UPDATE SET curriculum_id = british_id;


    -- Advanced Level (KS5)
    -- Electives
    INSERT INTO subjects (name, code, category, curriculum_id, grade_level_category, school_id) VALUES
    ('Further Mathematics (A-Level)', 'FM-ALEVEL', 'A-Level', british_id, 'Key Stage 5', school_id_val),
    ('Psychology (A-Level)', 'PSY-ALEVEL', 'A-Level', british_id, 'Key Stage 5', school_id_val),
    ('Sociology (A-Level)', 'SOC-ALEVEL', 'A-Level', british_id, 'Key Stage 5', school_id_val),
    ('Physics (A-Level)', 'PHY-ALEVEL', 'A-Level', british_id, 'Key Stage 5', school_id_val),
    ('Economics (A-Level)', 'ECO-ALEVEL', 'A-Level', british_id, 'Key Stage 5', school_id_val)
    ON CONFLICT (name, grade_level_category, school_id) DO UPDATE SET curriculum_id = british_id;

END $$;
