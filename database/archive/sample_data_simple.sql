-- Sample Data for School Management System
-- Run this in your Supabase SQL Editor to populate the database with test data
-- This script matches your ACTUAL database schema

-- ============================================
-- 1. STUDENTS (without email column)
-- ============================================
INSERT INTO students (name, grade, section, department, birthday, avatar_url, attendance_status) VALUES
('John Doe', 10, 'A', 'Science', '2010-05-15', 'https://i.pravatar.cc/150?img=1', 'Present'),
('Jane Smith', 10, 'A', 'Science', '2010-07-22', 'https://i.pravatar.cc/150?img=2', 'Present'),
('Michael Johnson', 10, 'B', 'Arts', '2010-03-10', 'https://i.pravatar.cc/150?img=3', 'Present'),
('Emily Brown', 11, 'A', 'Science', '2009-09-18', 'https://i.pravatar.cc/150?img=4', 'Present'),
('David Wilson', 11, 'B', 'Commercial', '2009-11-25', 'https://i.pravatar.cc/150?img=5', 'Absent'),
('Sarah Davis', 9, 'A', 'Science', '2011-02-14', 'https://i.pravatar.cc/150?img=6', 'Present'),
('James Taylor', 9, 'B', 'Arts', '2011-06-30', 'https://i.pravatar.cc/150?img=7', 'Present'),
('Lisa Anderson', 12, 'A', 'Science', '2008-12-05', 'https://i.pravatar.cc/150?img=8', 'Present');

-- ============================================
-- 2. TEACHERS
-- ============================================
INSERT INTO teachers (name, email, phone, avatar_url, status) VALUES
('Dr. Robert Smith', 'robert.smith@school.com', '+234-801-234-5678', 'https://i.pravatar.cc/150?img=11', 'Active'),
('Mrs. Jennifer Lee', 'jennifer.lee@school.com', '+234-802-345-6789', 'https://i.pravatar.cc/150?img=12', 'Active'),
('Mr. Thomas Brown', 'thomas.brown@school.com', '+234-803-456-7890', 'https://i.pravatar.cc/150?img=13', 'Active'),
('Ms. Patricia Garcia', 'patricia.garcia@school.com', '+234-804-567-8901', 'https://i.pravatar.cc/150?img=14', 'Active'),
('Dr. Christopher Martinez', 'chris.martinez@school.com', '+234-805-678-9012', 'https://i.pravatar.cc/150?img=15', 'Active');

-- ============================================
-- 3. PARENTS
-- ============================================
INSERT INTO parents (name, email, phone, avatar_url) VALUES
('Mr. William Doe', 'william.doe@parent.com', '+234-806-111-2222', 'https://i.pravatar.cc/150?img=21'),
('Mrs. Mary Smith', 'mary.smith@parent.com', '+234-807-222-3333', 'https://i.pravatar.cc/150?img=22'),
('Mr. Richard Johnson', 'richard.johnson@parent.com', '+234-808-333-4444', 'https://i.pravatar.cc/150?img=23');

-- ============================================
-- 4. NOTICES (audience is JSONB, not ARRAY)
-- ============================================
INSERT INTO notices (title, content, timestamp, category, is_pinned, audience) VALUES
('Welcome to New Term', 'We are excited to welcome all students back for the new academic term. Classes begin on Monday.', NOW(), 'General', true, '["all"]'::jsonb),
('Mid-Term Examination Schedule', 'Mid-term exams will commence on March 15th. Please check your timetable for specific dates.', NOW() - INTERVAL '2 days', 'Test Reminder', true, '["students", "parents"]'::jsonb),
('Sports Day Announcement', 'Annual Sports Day will be held on April 10th. All students are expected to participate.', NOW() - INTERVAL '5 days', 'Event', false, '["all"]'::jsonb),
('Parent-Teacher Meeting', 'Parent-Teacher meetings are scheduled for next Friday. Please confirm your attendance.', NOW() - INTERVAL '1 day', 'Event', false, '["parents"]'::jsonb);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT 'Sample data inserted successfully!' as status,
       (SELECT COUNT(*) FROM students) as total_students,
       (SELECT COUNT(*) FROM teachers) as total_teachers,
       (SELECT COUNT(*) FROM parents) as total_parents,
       (SELECT COUNT(*) FROM notices) as total_notices;
