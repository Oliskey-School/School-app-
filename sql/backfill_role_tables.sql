-- Backfill Script: Add Users to Role-Specific Tables
-- This script ensures all users in the 'users' table are properly added to their role tables
-- (students, teachers, or parents based on their role)

-- 1. Add Students to students table (if not already there)
INSERT INTO students (user_id, name, avatar_url, grade, section, department, attendance_status, created_at, updated_at)
SELECT 
    u.id as user_id,
    u.name,
    u.avatar_url,
    10 as grade,  -- Default grade
    'A' as section,  -- Default section
    'General' as department,  -- Default department
    'Present' as attendance_status,
    u.created_at,
    NOW() as updated_at
FROM users u
LEFT JOIN students s ON s.user_id = u.id
WHERE u.role = 'Student' 
  AND s.id IS NULL;  -- Only add if not already in students table

-- 2. Add Teachers to teachers table (if not already there)
INSERT INTO teachers (user_id, name, avatar_url, email, phone, status, created_at)
SELECT 
    u.id as user_id,
    u.name,
    u.avatar_url,
    u.email,
    NULL as phone,  -- Will be updated later if needed
    'Active' as status,
    u.created_at
FROM users u
LEFT JOIN teachers t ON t.user_id = u.id
WHERE u.role = 'Teacher' 
  AND t.id IS NULL;  -- Only add if not already in teachers table

-- 3. Add Parents to parents table (if not already there)
INSERT INTO parents (user_id, name, email, phone, avatar_url, created_at)
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    NULL as phone,  -- Will be updated later if needed
    u.avatar_url,
    u.created_at
FROM users u
LEFT JOIN parents p ON p.user_id = u.id
WHERE u.role = 'Parent' 
  AND p.id IS NULL;  -- Only add if not already in parents table

-- 4. Verify the results
SELECT 
    'Students' as table_name,
    COUNT(*) as count
FROM students

UNION ALL

SELECT 
    'Teachers' as table_name,
    COUNT(*) as count
FROM teachers

UNION ALL

SELECT 
    'Parents' as table_name,
    COUNT(*) as count
FROM parents

UNION ALL

SELECT 
    'Total Users' as table_name,
    COUNT(*) as count
FROM users;

-- 5. Show which users were added
SELECT 
    u.id,
    u.name,
    u.email,
    u.role,
    CASE 
        WHEN s.id IS NOT NULL THEN '✅ In students table'
        WHEN t.id IS NOT NULL THEN '✅ In teachers table'
        WHEN p.id IS NOT NULL THEN '✅ In parents table'
        WHEN u.role = 'Admin' THEN '✅ Admin (no role table)'
        ELSE '❌ Missing from role table'
    END as status
FROM users u
LEFT JOIN students s ON s.user_id = u.id
LEFT JOIN teachers t ON t.user_id = u.id
LEFT JOIN parents p ON p.user_id = u.id
ORDER BY u.id;
