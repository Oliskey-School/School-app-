-- ============================================
-- MIGRATION: Enable RLS and Create Policies
-- Purpose: Secure data access based on user roles
-- ============================================

-- ============================================
-- 1. PROFILES TABLE RLS
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Service role can do everything (for admin operations)
CREATE POLICY "Service role full access"
  ON profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 2. STUDENTS TABLE RLS
-- ============================================

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Policy: Students can view their own data
CREATE POLICY "Students can view own data"
  ON students FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.student_id = students.id
    )
  );

-- Policy: Teachers can view students in their classes
CREATE POLICY "Teachers can view their students"
  ON students FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      INNER JOIN teacher_classes tc ON p.teacher_id = tc.teacher_id
      WHERE p.id = auth.uid()
      AND p.role = 'teacher'
      -- Match students by grade and section to teacher's classes
      AND EXISTS (
        SELECT 1 FROM teacher_classes tc2
        WHERE tc2.teacher_id = p.teacher_id
        AND tc2.class_name ILIKE '%' || students.grade || students.section || '%'
      )
    )
  );

-- Policy: Parents can view their children
CREATE POLICY "Parents can view their children"
  ON students FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      INNER JOIN parent_children pc ON p.parent_id = pc.parent_id
      WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND pc.student_id = students.id
    )
  );

-- Policy: Admins can view all students
CREATE POLICY "Admins can view all students"
  ON students FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Admins can modify students
CREATE POLICY "Admins can modify students"
  ON students FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- 3. TEACHERS TABLE RLS
-- ============================================

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

-- Policy: Teachers can view their own data
CREATE POLICY "Teachers can view own data"
  ON teachers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.teacher_id = teachers.id
    )
  );

-- Policy: Admins can view all teachers
CREATE POLICY "Admins can view all teachers"
  ON teachers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Admins can modify teachers
CREATE POLICY "Admins can modify teachers"
  ON teachers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- 4. PARENTS TABLE RLS
-- ============================================

ALTER TABLE parents ENABLE ROW LEVEL SECURITY;

-- Policy: Parents can view their own data
CREATE POLICY "Parents can view own data"
  ON parents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.parent_id = parents.id
    )
  );

-- Policy: Admins can view all parents
CREATE POLICY "Admins can view all parents"
  ON parents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- 5. ASSIGNMENTS TABLE RLS
-- ============================================

ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view published assignments for their classes
CREATE POLICY "Students can view their assignments"
  ON assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      INNER JOIN students s ON p.student_id = s.id
      WHERE p.id = auth.uid()
      AND assignments.class_name ILIKE '%' || s.grade || s.section || '%'
    )
  );

-- Policy: Teachers can view and manage assignments
CREATE POLICY "Teachers can manage assignments"
  ON assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    )
  );

-- ============================================
-- 6. SUBMISSIONS TABLE RLS
-- ============================================

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Policy: Students can view their own submissions
CREATE POLICY "Students can view own submissions"
  ON submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.student_id = submissions.student_id
    )
  );

-- Policy: Students can create their own submissions
CREATE POLICY "Students can create submissions"
  ON submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.student_id = submissions.student_id
    )
  );

-- Policy: Teachers can view and grade all submissions
CREATE POLICY "Teachers can view all submissions"
  ON submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    )
  );

-- Policy: Teachers can update submissions (for grading)
CREATE POLICY "Teachers can grade submissions"
  ON submissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    )
  );

-- ============================================
-- 7. NOTIFICATIONS TABLE RLS
-- ============================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT user_id FROM profiles WHERE id = auth.uid())
  );

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT user_id FROM profiles WHERE id = auth.uid())
  );

-- Policy: System can create notifications for anyone
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- 8. STUDENT_ATTENDANCE TABLE RLS
-- ============================================

ALTER TABLE student_attendance ENABLE ROW LEVEL SECURITY;

-- Policy: Students can view their own attendance
CREATE POLICY "Students can view own attendance"
  ON student_attendance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.student_id = student_attendance.student_id
    )
  );

-- Policy: Parents can view their children's attendance
CREATE POLICY "Parents can view children attendance"
  ON student_attendance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      INNER JOIN parent_children pc ON p.parent_id = pc.parent_id
      WHERE p.id = auth.uid()
      AND pc.student_id = student_attendance.student_id
    )
  );

-- Policy: Teachers and admins can manage attendance
CREATE POLICY "Teachers can manage attendance"
  ON student_attendance FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    )
  );

-- ============================================
-- 9. ACADEMIC_PERFORMANCE TABLE RLS
-- ============================================

ALTER TABLE academic_performance ENABLE ROW LEVEL SECURITY;

-- Policy: Students can view their own grades
CREATE POLICY "Students can view own grades"
  ON academic_performance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.student_id = academic_performance.student_id
    )
  );

-- Policy: Parents can view their children's grades
CREATE POLICY "Parents can view children grades"
  ON academic_performance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      INNER JOIN parent_children pc ON p.parent_id = pc.parent_id
      WHERE p.id = auth.uid()
      AND pc.student_id = academic_performance.student_id
    )
  );

-- Policy: Teachers and admins can manage grades
CREATE POLICY "Teachers can manage grades"
  ON academic_performance FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    )
  );

-- ============================================
-- NOTES
-- ============================================
-- Additional tables (messages, forum_posts, etc.) can follow similar patterns
-- Service role always has full access for backend operations
-- Policies are additive - users get access if ANY policy matches
