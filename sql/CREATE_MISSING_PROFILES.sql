-- =================================================================
-- 🔧 CREATE MISSING STUDENT PROFILES
-- =================================================================
-- Creates student profiles for all users with role='Student'
-- =================================================================

-- Check current state
SELECT 'Users with role Student' as what, COUNT(*) as count
FROM public.users WHERE role = 'Student'
UNION ALL
SELECT 'Student profiles', COUNT(*)
FROM public.students;

-- Find students without profiles
SELECT 
    u.id,
    u.email,
    u.name,
    'MISSING PROFILE' as issue
FROM public.users u
LEFT JOIN public.students s ON u.id = s.user_id
WHERE u.role = 'Student'
  AND s.id IS NULL;

-- Create missing student profiles
INSERT INTO public.students (user_id, name, avatar_url, grade, section, attendance_status, created_at)
SELECT 
    u.id,
    u.name,
    COALESCE(u.avatar_url, 'https://i.pravatar.cc/150?u=' || replace(u.name, ' ', '')),
    10, -- Default grade
    'A', -- Default section
    'Present',
    u.created_at
FROM public.users u
LEFT JOIN public.students s ON u.id = s.user_id
WHERE u.role = 'Student'
  AND s.id IS NULL;

-- Do the same for Teachers
INSERT INTO public.teachers (user_id, name, email, avatar_url, status, created_at)
SELECT 
    u.id,
    u.name,
    u.email,
    COALESCE(u.avatar_url, 'https://i.pravatar.cc/150?u=' || replace(u.name, ' ', '')),
    'Active',
    u.created_at
FROM public.users u
LEFT JOIN public.teachers t ON u.id = t.user_id
WHERE u.role IN ('Teacher', 'Admin')
  AND t.id IS NULL;

-- Do the same for Parents
INSERT INTO public.parents (user_id, name, email, avatar_url, created_at)
SELECT 
    u.id,
    u.name,
    u.email,
    COALESCE(u.avatar_url, 'https://i.pravatar.cc/150?u=' || replace(u.name, ' ', '')),
    u.created_at
FROM public.users u
LEFT JOIN public.parents p ON u.id = p.user_id
WHERE u.role = 'Parent'
  AND p.id IS NULL;

-- Verify fix
SELECT 'After creating profiles:' as info, '' as count
UNION ALL
SELECT 'Students', COUNT(*)::TEXT FROM public.students
UNION ALL
SELECT 'Teachers', COUNT(*)::TEXT FROM public.teachers
UNION ALL
SELECT 'Parents', COUNT(*)::TEXT FROM public.parents;

SELECT '✅ Student/Teacher/Parent profiles created!' as status;
