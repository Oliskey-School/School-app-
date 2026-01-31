-- Fix RLS on schools table to allow connection checking
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Schools are viewable by everyone" ON schools;
CREATE POLICY "Schools are viewable by everyone" ON schools FOR SELECT USING (true);

-- Ensure Students/Teachers/Parents are viewable
DROP POLICY IF EXISTS "Students are viewable by authenticated users" ON students;
CREATE POLICY "Students are viewable by authenticated users" ON students FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Teachers are viewable by authenticated users" ON teachers;
CREATE POLICY "Teachers are viewable by authenticated users" ON teachers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Parents are viewable by authenticated users" ON parents;
CREATE POLICY "Parents are viewable by authenticated users" ON parents FOR SELECT TO authenticated USING (true);

-- Ensure Subjects/Classes are viewable
DROP POLICY IF EXISTS "Subjects are viewable by authenticated users" ON subjects;
CREATE POLICY "Subjects are viewable by authenticated users" ON subjects FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Classes are viewable by authenticated users" ON classes;
CREATE POLICY "Classes are viewable by authenticated users" ON classes FOR SELECT TO authenticated USING (true);
