-- ============================================
-- SEED DATA FOR SCHOOL MANAGEMENT SYSTEM
-- ============================================

-- Clean up existing data to prevent duplicate key errors
TRUNCATE TABLE 
  users, 
  classes, 
  assignments, 
  notices, 
  store_products, 
  audit_logs, 
  calendar_events 
  RESTART IDENTITY CASCADE;


-- 1. Users
INSERT INTO users (email, name, role) VALUES
('admin@school.com', 'Admin User', 'Admin'),
('j.adeoye@school.com', 'Mr. John Adeoye', 'Teacher'),
('f.akintola@school.com', 'Mrs. Funke Akintola', 'Teacher'),
('p.okonkwo@gmail.com', 'Mr. Peter Okonkwo', 'Parent'),
('adebayo@student.school.com', 'Adebayo Oluwaseun', 'Student'),
('chidinma@student.school.com', 'Chidinma Okafor', 'Student'),
('musa@student.school.com', 'Musa Ibrahim', 'Student');

-- 2. Teachers
INSERT INTO teachers (user_id, name, email, status) VALUES
((SELECT id FROM users WHERE email='j.adeoye@school.com'), 'Mr. John Adeoye', 'j.adeoye@school.com', 'Active'),
((SELECT id FROM users WHERE email='f.akintola@school.com'), 'Mrs. Funke Akintola', 'f.akintola@school.com', 'Active');

-- 2b. Teacher Classes
INSERT INTO teacher_classes (teacher_id, class_name) VALUES
((SELECT id FROM teachers WHERE email='j.adeoye@school.com'), 'Grade 7 - math'),
((SELECT id FROM teachers WHERE email='j.adeoye@school.com'), 'Grade 8 - math'),
((SELECT id FROM teachers WHERE email='j.adeoye@school.com'), 'Grade 9 - math'),
((SELECT id FROM teachers WHERE email='j.adeoye@school.com'), 'Grade 10 - math'),
((SELECT id FROM teachers WHERE email='j.adeoye@school.com'), 'Grade 11 - math');

-- 3. Students
INSERT INTO students (user_id, name, grade, section, department, attendance_status) VALUES
((SELECT id FROM users WHERE email='adebayo@student.school.com'), 'Adebayo Oluwaseun', 10, 'A', 'Science', 'Present'),
((SELECT id FROM users WHERE email='chidinma@student.school.com'), 'Chidinma Okafor', 10, 'A', 'Science', 'Present'),
((SELECT id FROM users WHERE email='musa@student.school.com'), 'Musa Ibrahim', 9, 'A', NULL, 'Absent');

-- 4. Parents
INSERT INTO parents (user_id, name, email, phone) VALUES
((SELECT id FROM users WHERE email='p.okonkwo@gmail.com'), 'Mr. Peter Okonkwo', 'p.okonkwo@gmail.com', '08012345678');

-- 5. Parent-Child Relationship
INSERT INTO parent_children (parent_id, student_id) VALUES
((SELECT id FROM parents WHERE email='p.okonkwo@gmail.com'), (SELECT id FROM students WHERE name='Adebayo Oluwaseun'));

-- 6. Classes
INSERT INTO classes (id, subject, grade, section, department, student_count) VALUES
-- Early Years
('1', 'Activity Areas', 0, 'A', NULL, 15), -- Pre-Nursery
('2', 'Activity Areas', 1, 'A', NULL, 15), -- Nursery 1
('3', 'Activity Areas', 2, 'A', NULL, 20), -- Nursery 2

-- Primary (Basic 1-6)
('4', 'Core Subjects', 3, 'A', NULL, 25), -- Basic 1
('5', 'Core Subjects', 4, 'A', NULL, 25), -- Basic 2
('6', 'Core Subjects', 5, 'A', NULL, 25), -- Basic 3
('7', 'Core Subjects', 6, 'A', NULL, 25), -- Basic 4
('8', 'Core Subjects', 7, 'A', NULL, 30), -- Basic 5
('9', 'Core Subjects', 8, 'A', NULL, 30), -- Basic 6

-- Junior Secondary (JSS 1-3)
('10', 'Core Subjects', 9, 'A', NULL, 35), -- JSS 1
('11', 'Core Subjects', 10, 'A', NULL, 35), -- JSS 2
('12', 'Core Subjects', 11, 'A', NULL, 35), -- JSS 3

-- Senior Secondary (SSS 1-3)
('13', 'Combined', 12, 'A', 'Science', 40),     -- SSS 1 Science
('14', 'Combined', 12, 'A', 'Arts', 40),        -- SSS 1 Arts
('15', 'Combined', 12, 'A', 'Commercial', 40),  -- SSS 1 Commercial

('16', 'Combined', 13, 'A', 'Science', 40),     -- SSS 2 Science
('17', 'Combined', 13, 'A', 'Arts', 40),        -- SSS 2 Arts
('18', 'Combined', 13, 'A', 'Commercial', 40),  -- SSS 2 Commercial

('19', 'Combined', 14, 'A', 'Science', 40),     -- SSS 3 Science
('20', 'Combined', 14, 'A', 'Arts', 40),        -- SSS 3 Arts
('21', 'Combined', 14, 'A', 'Commercial', 40);  -- SSS 3 Commercial

-- 7. Assignments
INSERT INTO assignments (title, description, class_name, subject, due_date) VALUES
('Algebra Worksheet 1', 'Complete exercises 1-10 on page 45', '10A', 'Mathematics', NOW() + INTERVAL '3 days'),
('Physics Lab Report', 'Write up the results from the pendulum experiment', '10A', 'Physics', NOW() + INTERVAL '5 days');

-- 8. Notices
INSERT INTO notices (title, content, category, is_pinned) VALUES
('Mid-Term Break', 'The school will be on break from Thursday to Friday.', 'Holiday', true),
('Inter-House Sports', 'Sports day is coming up next week! Get ready.', 'Event', false);

-- 9. Store Products
INSERT INTO store_products (name, category, price, stock) VALUES
('School Uniform (Set)', 'Uniform', 15000, 50),
('Mathematics Textbook', 'Book', 4500, 100),
('Scientific Calculator', 'Stationery', 3500, 200);

-- 10. Audit Logs (Sample)
INSERT INTO audit_logs (user_name, user_role, action, type) VALUES
('Admin User', 'Admin', 'Updated school policy', 'update'),
('Mr. John Adeoye', 'Teacher', 'Posted new assignment', 'create');

-- 11. Calendar Events
INSERT INTO calendar_events (title, start_date, type) VALUES
('Staff Meeting', CURRENT_DATE + 1, 'General'),
('PTA Meeting', CURRENT_DATE + 7, 'General');

