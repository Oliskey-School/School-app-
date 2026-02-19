-- Relax check_student_grade constraint to allow Nursery/Preschool grades (0 and negative)

BEGIN;

ALTER TABLE students DROP CONSTRAINT IF EXISTS check_student_grade;

-- Allow grades from -5 (Creche/Pre-Nursery) to 13 (A-Levels/Post-Secondary)
ALTER TABLE students ADD CONSTRAINT check_student_grade CHECK (grade >= -5 AND grade <= 13);

COMMIT;
