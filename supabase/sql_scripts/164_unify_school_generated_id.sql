-- Migration 164: Unify school_generated_id as the single standard ID field
-- Phase 1 of Oliskey vision: SCHOOL_BRANCH_ROLE_NUMBER format
-- Applied: 2026-03-09

-- 1. Add school_generated_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS school_generated_id TEXT;

-- 2. Migrate custom_id → school_generated_id on users (fixing STD→STU)
UPDATE users
SET school_generated_id = REGEXP_REPLACE(custom_id, '_STD_', '_STU_')
WHERE custom_id IS NOT NULL AND school_generated_id IS NULL;

-- 3. Normalize 3-digit numbers to 4-digit in users.school_generated_id
UPDATE users
SET school_generated_id = REGEXP_REPLACE(
  school_generated_id,
  '^([A-Z0-9]+_[A-Z0-9]+_[A-Z]+_)(\d{3})$',
  '\10\2'
)
WHERE school_generated_id ~ '^[A-Z0-9]+_[A-Z0-9]+_[A-Z]+_\d{3}$';

-- 4. Fix corrupted teachers records: STU role code → TCH
UPDATE teachers
SET school_generated_id = REGEXP_REPLACE(school_generated_id, '_STU_', '_TCH_')
WHERE school_generated_id LIKE '%_STU_%';

-- 5-7. Normalize 3-digit to 4-digit in students, teachers, parents
UPDATE students
SET school_generated_id = REGEXP_REPLACE(school_generated_id, '^([A-Z0-9]+_[A-Z0-9]+_[A-Z]+_)(\d{3})$', '\10\2')
WHERE school_generated_id ~ '^[A-Z0-9]+_[A-Z0-9]+_[A-Z]+_\d{3}$';

UPDATE teachers
SET school_generated_id = REGEXP_REPLACE(school_generated_id, '^([A-Z0-9]+_[A-Z0-9]+_[A-Z]+_)(\d{3})$', '\10\2')
WHERE school_generated_id ~ '^[A-Z0-9]+_[A-Z0-9]+_[A-Z]+_\d{3}$';

UPDATE parents
SET school_generated_id = REGEXP_REPLACE(school_generated_id, '^([A-Z0-9]+_[A-Z0-9]+_[A-Z]+_)(\d{3})$', '\10\2')
WHERE school_generated_id ~ '^[A-Z0-9]+_[A-Z0-9]+_[A-Z]+_\d{3}$';

-- 8. Helper function: get next sequence number for school/branch/role
CREATE OR REPLACE FUNCTION get_next_id_sequence(
  p_school_id UUID,
  p_branch_id UUID,
  p_role_code TEXT
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  CASE p_role_code
    WHEN 'STU' THEN
      SELECT COUNT(*) INTO v_count FROM students WHERE school_id = p_school_id AND branch_id = p_branch_id;
    WHEN 'TCH' THEN
      SELECT COUNT(*) INTO v_count FROM teachers WHERE school_id = p_school_id AND branch_id = p_branch_id;
    WHEN 'PAR' THEN
      SELECT COUNT(*) INTO v_count FROM parents WHERE school_id = p_school_id AND branch_id = p_branch_id;
    ELSE
      SELECT COUNT(*) INTO v_count FROM users WHERE school_id = p_school_id AND branch_id = p_branch_id AND role = LOWER(p_role_code);
  END CASE;
  RETURN v_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Indexes for fast ID lookups
CREATE INDEX IF NOT EXISTS idx_users_school_generated_id ON users(school_generated_id);
CREATE INDEX IF NOT EXISTS idx_students_school_generated_id ON students(school_generated_id);
CREATE INDEX IF NOT EXISTS idx_teachers_school_generated_id ON teachers(school_generated_id);
CREATE INDEX IF NOT EXISTS idx_parents_school_generated_id ON parents(school_generated_id);
