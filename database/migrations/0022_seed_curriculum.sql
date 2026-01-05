DO $$
DECLARE
    nigerian_id UUID;
    british_id UUID;
BEGIN
    -- 1. Insert Curricula
    -- Using ON CONFLICT logic for idempotency based on the UNIQUE constraint on 'code' or 'name'
    INSERT INTO curricula (name, code, description) 
    VALUES ('Nigerian', 'NIGERIAN', 'Standard Nigerian Curriculum (NERDC)')
    ON CONFLICT (code) DO NOTHING;

    INSERT INTO curricula (name, code, description) 
    VALUES ('British', 'BRITISH', 'National Curriculum for England')
    ON CONFLICT (code) DO NOTHING;

    -- Get IDs
    SELECT id INTO nigerian_id FROM curricula WHERE code = 'NIGERIAN';
    SELECT id INTO british_id FROM curricula WHERE code = 'BRITISH';

    -- 2. Insert Subjects - Nigerian Curriculum
    
    -- Early Years / Preschool
    INSERT INTO subjects (name, category, curriculum_id, grade_level) VALUES
    ('Pre-Literacy', 'Foundational', nigerian_id, 'Early Years'),
    ('Pre-Numeracy', 'Foundational', nigerian_id, 'Early Years'),
    ('Phonics', 'Foundational', nigerian_id, 'Early Years'),
    ('Creative Arts & Crafts', 'Foundational', nigerian_id, 'Early Years'),
    ('Social Skills', 'Foundational', nigerian_id, 'Early Years'),
    ('Religious Instruction', 'Foundational', nigerian_id, 'Early Years');

    -- Primary 1-3 (Lower Basic)
    INSERT INTO subjects (name, category, curriculum_id, grade_level) VALUES
    ('English Language', 'Core', nigerian_id, 'Primary 1-3'),
    ('Mathematics', 'Core', nigerian_id, 'Primary 1-3'),
    ('Basic Science', 'Core', nigerian_id, 'Primary 1-3'),
    ('Social Studies', 'Core', nigerian_id, 'Primary 1-3'),
    ('Civic Education', 'Core', nigerian_id, 'Primary 1-3'),
    ('Cultural & Creative Arts', 'Core', nigerian_id, 'Primary 1-3'),
    ('Computer Studies', 'Core', nigerian_id, 'Primary 1-3'),
    ('PHE', 'Core', nigerian_id, 'Primary 1-3'),
    ('Agricultural Science', 'Core', nigerian_id, 'Primary 1-3'),
    ('French', 'Core', nigerian_id, 'Primary 1-3');

    -- Primary 4-6 (Upper Basic)
    INSERT INTO subjects (name, category, curriculum_id, grade_level) VALUES
    ('English Language', 'Core', nigerian_id, 'Primary 4-6'),
    ('Mathematics', 'Core', nigerian_id, 'Primary 4-6'),
    ('Basic Science & Technology', 'Core', nigerian_id, 'Primary 4-6'),
    ('Social Studies', 'Core', nigerian_id, 'Primary 4-6'),
    ('Civic Education', 'Core', nigerian_id, 'Primary 4-6'),
    ('Cultural & Creative Arts', 'Core', nigerian_id, 'Primary 4-6'),
    ('Computer Studies', 'Core', nigerian_id, 'Primary 4-6'),
    ('PHE', 'Core', nigerian_id, 'Primary 4-6'),
    ('Agricultural Science', 'Core', nigerian_id, 'Primary 4-6'),
    ('Home Economics', 'Vocational', nigerian_id, 'Primary 4-6'),
    ('French', 'Core', nigerian_id, 'Primary 4-6');

    -- JSS 1-3
    INSERT INTO subjects (name, category, curriculum_id, grade_level) VALUES
    ('English Language', 'Core', nigerian_id, 'JSS 1-3'),
    ('Mathematics', 'Core', nigerian_id, 'JSS 1-3'),
    ('Basic Science', 'Core', nigerian_id, 'JSS 1-3'),
    ('Basic Technology', 'Core', nigerian_id, 'JSS 1-3'),
    ('Social Studies', 'Core', nigerian_id, 'JSS 1-3'),
    ('Civic Education', 'Core', nigerian_id, 'JSS 1-3'),
    ('Computer Studies', 'Core', nigerian_id, 'JSS 1-3'),
    ('PHE', 'Core', nigerian_id, 'JSS 1-3'),
    ('Business Studies', 'Vocational', nigerian_id, 'JSS 1-3'),
    ('Home Economics', 'Vocational', nigerian_id, 'JSS 1-3'),
    ('Agricultural Science', 'Vocational', nigerian_id, 'JSS 1-3'),
    ('French', 'Elective', nigerian_id, 'JSS 1-3');

    -- SSS 1-3
    INSERT INTO subjects (name, category, curriculum_id, grade_level) VALUES
    -- General Core
    ('English Language', 'Core', nigerian_id, 'SSS 1-3'),
    ('Mathematics', 'Core', nigerian_id, 'SSS 1-3'),
    ('Civic Education', 'Core', nigerian_id, 'SSS 1-3'),
    ('Computer Studies', 'Core', nigerian_id, 'SSS 1-3'),
    -- Science
    ('Physics', 'Science', nigerian_id, 'SSS 1-3'),
    ('Chemistry', 'Science', nigerian_id, 'SSS 1-3'),
    ('Biology', 'Science', nigerian_id, 'SSS 1-3'),
    ('Further Mathematics', 'Science', nigerian_id, 'SSS 1-3'),
    ('Technical Drawing', 'Science', nigerian_id, 'SSS 1-3'),
    -- Commercial
    ('Economics', 'Commercial', nigerian_id, 'SSS 1-3'),
    ('Commerce', 'Commercial', nigerian_id, 'SSS 1-3'),
    ('Financial Accounting', 'Commercial', nigerian_id, 'SSS 1-3'),
    ('Government', 'Commercial', nigerian_id, 'SSS 1-3'),
    ('Marketing', 'Commercial', nigerian_id, 'SSS 1-3'),
    -- Arts
    ('Literature in English', 'Arts', nigerian_id, 'SSS 1-3'),
    ('CRS', 'Arts', nigerian_id, 'SSS 1-3'),
    ('IRS', 'Arts', nigerian_id, 'SSS 1-3'),
    ('History', 'Arts', nigerian_id, 'SSS 1-3');


    -- 3. Insert Subjects - British Curriculum

    -- EYFS
    INSERT INTO subjects (name, category, curriculum_id, grade_level) VALUES
    ('communication & Language', 'Prime', british_id, 'EYFS'),
    ('Physical Development', 'Prime', british_id, 'EYFS'),
    ('PSED', 'Prime', british_id, 'EYFS'),
    ('Literacy', 'Specific', british_id, 'EYFS'),
    ('Mathematics', 'Specific', british_id, 'EYFS'),
    ('Understanding the World', 'Specific', british_id, 'EYFS'),
    ('Expressive Arts & Design', 'Specific', british_id, 'EYFS');

    -- KS1 (Year 1-2)
    INSERT INTO subjects (name, category, curriculum_id, grade_level) VALUES
    ('English', 'Core', british_id, 'KS1'),
    ('Mathematics', 'Core', british_id, 'KS1'),
    ('Science', 'Core', british_id, 'KS1'),
    ('Design & Technology', 'Foundation', british_id, 'KS1'),
    ('History', 'Foundation', british_id, 'KS1'),
    ('Geography', 'Foundation', british_id, 'KS1'),
    ('Art & Design', 'Foundation', british_id, 'KS1'),
    ('Music', 'Foundation', british_id, 'KS1'),
    ('PE', 'Foundation', british_id, 'KS1'),
    ('Computing', 'Foundation', british_id, 'KS1');

    -- KS2 (Year 3-6)
    INSERT INTO subjects (name, category, curriculum_id, grade_level) VALUES
    ('English', 'Core', british_id, 'KS2'),
    ('Mathematics', 'Core', british_id, 'KS2'),
    ('Science', 'Core', british_id, 'KS2'),
    ('Design & Technology', 'Foundation', british_id, 'KS2'),
    ('History', 'Foundation', british_id, 'KS2'),
    ('Geography', 'Foundation', british_id, 'KS2'),
    ('Art & Design', 'Foundation', british_id, 'KS2'),
    ('Music', 'Foundation', british_id, 'KS2'),
    ('PE', 'Foundation', british_id, 'KS2'),
    ('Computing', 'Foundation', british_id, 'KS2'),
    ('Foreign Language', 'Foundation', british_id, 'KS2');

    -- KS3 (Year 7-9)
    INSERT INTO subjects (name, category, curriculum_id, grade_level) VALUES
    ('English', 'Core', british_id, 'KS3'),
    ('Mathematics', 'Core', british_id, 'KS3'),
    ('Science', 'Core', british_id, 'KS3'),
    ('History', 'Foundation', british_id, 'KS3'),
    ('Geography', 'Foundation', british_id, 'KS3'),
    ('Modern Languages', 'Foundation', british_id, 'KS3'),
    ('Design & Technology', 'Foundation', british_id, 'KS3'),
    ('Art & Design', 'Foundation', british_id, 'KS3'),
    ('Music', 'Foundation', british_id, 'KS3'),
    ('PE', 'Foundation', british_id, 'KS3'),
    ('Computing', 'Foundation', british_id, 'KS3');

    -- KS4 (GCSE, Year 10-11)
    INSERT INTO subjects (name, category, curriculum_id, grade_level) VALUES
    ('English Language', 'Core', british_id, 'KS4'),
    ('English Literature', 'Core', british_id, 'KS4'),
    ('Mathematics', 'Core', british_id, 'KS4'),
    ('Science (Combined/Triple)', 'Core', british_id, 'KS4'),
    ('History', 'Option', british_id, 'KS4'),
    ('Geography', 'Option', british_id, 'KS4'),
    ('French/Spanish', 'Option', british_id, 'KS4'),
    ('Computer Science', 'Option', british_id, 'KS4'),
    ('Business Studies', 'Option', british_id, 'KS4'),
    ('Art & Design', 'Option', british_id, 'KS4'),
    ('Economics', 'Option', british_id, 'KS4');

    -- A-Levels (Post-16)
    INSERT INTO subjects (name, category, curriculum_id, grade_level) VALUES
    ('Mathematics', 'Core', british_id, 'A-Level'),
    ('Further Mathematics', 'Core', british_id, 'A-Level'),
    ('Physics', 'Science', british_id, 'A-Level'),
    ('Chemistry', 'Science', british_id, 'A-Level'),
    ('Biology', 'Science', british_id, 'A-Level'),
    ('Economics', 'Social Science', british_id, 'A-Level'),
    ('Business Studies', 'Social Science', british_id, 'A-Level'),
    ('Psychology', 'Social Science', british_id, 'A-Level'),
    ('Sociology', 'Social Science', british_id, 'A-Level'),
    ('Law', 'Social Science', british_id, 'A-Level'),
    ('Computer Science', 'Tech', british_id, 'A-Level'),
    ('English Literature', 'Arts', british_id, 'A-Level'),
    ('History', 'Arts', british_id, 'A-Level'),
    ('Politics', 'Arts', british_id, 'A-Level');

END $$;
