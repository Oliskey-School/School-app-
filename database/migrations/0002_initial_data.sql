-- ============================================================================
-- 🚀 PART 2: SAMPLE DATA (Insert Demo Accounts)
-- ============================================================================
-- Run this script SECOND to populate your app with data.
-- ============================================================================

-- Clear existing data to prevent duplicates during setup
TRUNCATE TABLE student_fees, student_attendance, parent_children, teacher_subjects, teacher_classes, students, teachers, parents, notices, assignments CASCADE;

-- 1. DEMO ACCOUNTS (The most important part for you!)
-- Student: student@school.com
INSERT INTO students (name, email, grade, section, department, birthday, avatar_url, attendance_status) 
VALUES ('Demo Student', 'student@school.com', 10, 'A', 'Science', '2010-01-15', 'https://i.pravatar.cc/150?img=1', 'Present');

-- Teacher: teacher@school.com
INSERT INTO teachers (name, email, phone, avatar_url, status) 
VALUES ('Mrs. Demo Teacher', 'teacher@school.com', '+234-800-000-0000', 'https://i.pravatar.cc/150?img=11', 'Active');

-- Parent: parent@school.com
INSERT INTO parents (name, email, phone, avatar_url) 
VALUES ('Mr. Demo Parent', 'parent@school.com', '+234-800-000-0000', 'https://i.pravatar.cc/150?img=21');

-- Link Demo Parent -> Demo Student
DO $$
DECLARE
    p_id INTEGER;
    s_id INTEGER;
BEGIN
    SELECT id INTO p_id FROM parents WHERE email = 'parent@school.com';
    SELECT id INTO s_id FROM students WHERE email = 'student@school.com';
    IF p_id IS NOT NULL AND s_id IS NOT NULL THEN
        INSERT INTO parent_children (parent_id, student_id) VALUES (p_id, s_id);
    END IF;
END $$;

-- 2. DEMO FEE RECORD (Uses correct columns: total_fee, paid_amount)
DO $$
DECLARE
    s_id INTEGER;
BEGIN
    SELECT id INTO s_id FROM students WHERE email = 'student@school.com';
    IF s_id IS NOT NULL THEN
        INSERT INTO student_fees (student_id, total_fee, paid_amount, status, due_date, term) 
        VALUES (s_id, 150000, 75000, 'Unpaid', CURRENT_DATE + INTERVAL '10 days', 'Term 1 2024');
    END IF;
END $$;

-- ============================================
-- PART 3: EXTENDED PARTICIPATION SAMPLE DATA
-- ============================================

-- 1. Insert More Students (Total 8)
INSERT INTO students (name, email, grade, section, department, birthday, avatar_url, attendance_status) VALUES
('John Doe', 'john.doe@student.school.com', 10, 'A', 'Science', '2008-05-15', 'https://i.pravatar.cc/150?img=11', 'Present'),
('Jane Smith', 'jane.smith@student.school.com', 10, 'A', 'Science', '2008-08-20', 'https://i.pravatar.cc/150?img=5', 'Absent'),
('Michael Johnson', 'michael.j@student.school.com', 11, 'B', 'Arts', '2007-03-10', 'https://i.pravatar.cc/150?img=3', 'Present'),
('Emily Davis', 'emily.d@student.school.com', 11, 'B', 'Arts', '2007-11-05', 'https://i.pravatar.cc/150?img=9', 'Late'),
('David Wilson', 'david.w@student.school.com', 12, 'C', 'Commercial', '2006-01-25', 'https://i.pravatar.cc/150?img=13', 'Present'),
('Sarah Brown', 'sarah.b@student.school.com', 12, 'C', 'Commercial', '2006-07-14', 'https://i.pravatar.cc/150?img=20', 'Present'),
('James Taylor', 'james.t@student.school.com', 9, 'A', 'Junior', '2009-09-09', 'https://i.pravatar.cc/150?img=53', 'Present'),
('Jessica Miller', 'jessica.m@student.school.com', 9, 'B', 'Junior', '2009-12-30', 'https://i.pravatar.cc/150?img=49', 'Present');

-- 2. Insert More Teachers (Total 5)
INSERT INTO teachers (name, email, phone, avatar_url, status) VALUES
('Mr. Robert Smith', 'robert.smith@school.com', '+234-800-000-0001', 'https://i.pravatar.cc/150?img=12', 'Active'),
('Ms. Jennifer Lee', 'jennifer.lee@school.com', '+234-800-000-0002', 'https://i.pravatar.cc/150?img=32', 'Active'),
('Mr. William Brown', 'william.brown@school.com', '+234-800-000-0003', 'https://i.pravatar.cc/150?img=59', 'On Leave'),
('Mrs. Elizabeth Wilson', 'elizabeth.wilson@school.com', '+234-800-000-0004', 'https://i.pravatar.cc/150?img=40', 'Active');
-- (Mrs. Demo Teacher was inserted in Part 2)

-- 3. Insert More Parents
INSERT INTO parents (name, email, phone, avatar_url) VALUES
('Dr. Thomas Doe', 'thomas.doe@parent.school.com', '+234-900-111-2222', 'https://i.pravatar.cc/150?img=68'),
('Mrs. Susan Smith', 'susan.smith@parent.school.com', '+234-900-333-4444', 'https://i.pravatar.cc/150?img=44'),
('Mr. Charles Johnson', 'charles.johnson@parent.school.com', '+234-900-555-6666', 'https://i.pravatar.cc/150?img=14');

-- 4. Create Classes
INSERT INTO classes (grade, section, department, subject, student_count) VALUES
(10, 'A', 'Science', 'Physics', 25),
(11, 'B', 'Arts', 'Literature', 20),
(12, 'C', 'Commercial', 'Accounting', 22),
(9, 'A', 'Junior', 'Basic Science', 30),
(9, 'B', 'Junior', 'Social Studies', 28);

-- 5. Link Parents to Students
DO $$
DECLARE
    p1_id BIGINT; p2_id BIGINT; p3_id BIGINT;
    s1_id BIGINT; s2_id BIGINT; s3_id BIGINT;
BEGIN
    SELECT id INTO p1_id FROM parents WHERE email = 'thomas.doe@parent.school.com';
    SELECT id INTO s1_id FROM students WHERE email = 'john.doe@student.school.com';
    IF p1_id IS NOT NULL AND s1_id IS NOT NULL THEN INSERT INTO parent_children (parent_id, student_id) VALUES (p1_id, s1_id); END IF;

    SELECT id INTO p2_id FROM parents WHERE email = 'susan.smith@parent.school.com';
    SELECT id INTO s2_id FROM students WHERE email = 'jane.smith@student.school.com';
    IF p2_id IS NOT NULL AND s2_id IS NOT NULL THEN INSERT INTO parent_children (parent_id, student_id) VALUES (p2_id, s2_id); END IF;

    SELECT id INTO p3_id FROM parents WHERE email = 'charles.johnson@parent.school.com';
    SELECT id INTO s3_id FROM students WHERE email = 'michael.j@student.school.com';
    IF p3_id IS NOT NULL AND s3_id IS NOT NULL THEN INSERT INTO parent_children (parent_id, student_id) VALUES (p3_id, s3_id); END IF;
END $$;

-- 6. Insert Fees for All Students
DO $$
DECLARE
    s RECORD;
BEGIN
    FOR s IN SELECT id, grade FROM students LOOP
        -- Term 1 Fee
        INSERT INTO student_fees (student_id, total_fee, paid_amount, status, due_date, term, title)
        VALUES 
        (s.id, 150000, 
         CASE 
            WHEN s.id % 3 = 0 THEN 150000 -- Fully Paid
            WHEN s.id % 3 = 1 THEN 75000  -- Partial
            ELSE 0                        -- Unpaid
         END,
         CASE 
            WHEN s.id % 3 = 0 THEN 'Paid'
            WHEN s.id % 3 = 1 THEN 'Unpaid' -- Technically partial, but status logic might be simple
            ELSE 'Overdue'
         END,
         CURRENT_DATE + INTERVAL '14 days',
         'Term 1 2024',
         'Tuition Fee'
        );
    END LOOP;
END $$;

-- 7. Insert More Notices
INSERT INTO notices (title, content, category, is_pinned, audience) VALUES
('Mathematics Competition', 'Sign up for the upcoming regional math olympiad.', 'Academic', false, to_jsonb(ARRAY['students'])),
('PTA Meeting Postponed', 'The meeting scheduled for Friday is moved to next week.', 'General', true, to_jsonb(ARRAY['parents'])),
('Staff Training Workshop', 'Mandatory attendance for all science teachers on Saturday.', 'Work', false, to_jsonb(ARRAY['teachers'])),
('Holiday Reminder', 'School closed for Mid-Term Break next Thursday and Friday.', 'Holiday', false, to_jsonb(ARRAY['all']));

-- 8. Insert Assignments
INSERT INTO assignments (title, description, class_name, subject, due_date, total_students, submissions_count) VALUES
('Algebra Problem Set 1', 'Complete exercises 1-10 on page 42.', '10A', 'Mathematics', CURRENT_TIMESTAMP + INTERVAL '2 days', 25, 12),
('Essay: The Great Gatsby', 'Write a 1000 word essay on the american dream.', '11B', 'Literature', CURRENT_TIMESTAMP + INTERVAL '5 days', 20, 5),
('Physics Lab Report', 'Submit your findings from the pendulum experiment.', '10A', 'Physics', CURRENT_TIMESTAMP + INTERVAL '1 day', 25, 20);

SELECT '✅ Sample Data Loaded Successfully!' as status;
SELECT COUNT(*) as total_students FROM students;
