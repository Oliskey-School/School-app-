-- Create Demo Users for Quick Login Feature
-- This script should be run in Supabase SQL Editor to create demo users

-- Note: Supabase Auth users MUST be created via the Dashboard or API
-- This script creates the profiles that will be linked to those auth users

-- Demo User Credentials (Create these in Supabase Dashboard > Authentication > Users):
-- 1. Admin: admin@demo.com / password: Demo123!
-- 2. Teacher: teacher@demo.com / password: Demo123!
-- 3. Parent: parent@demo.com / password: Demo123!
-- 4. Student: student@demo.com / password: Demo123!

-- After creating users in Auth, run this script to create profiles:

-- Ensure schools table has a demo school
INSERT INTO public.schools (id, name, address, state, curriculum_type) 
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Demo School', '123 Demo Street', 'Lagos', 'Nigerian')
ON CONFLICT (id) DO UPDATE SET name = 'Demo School';

-- Create profiles (linked to auth.users by email)
-- Note: The user_id should match the UUID from auth.users

-- You'll need to run this AFTER creating users in Auth Dashboard
-- Replace the UUIDs below with actual auth.users IDs

-- Example structure (you'll update with real UUIDs):
/*
INSERT INTO public.profiles (id, email, role, full_name, phone, school_id, created_at) 
VALUES 
    ('REPLACE-WITH-ADMIN-UUID', 'admin@demo.com', 'admin', 'Demo Admin', '1234567890', '00000000-0000-0000-0000-000000000001', NOW()),
    ('REPLACE-WITH-TEACHER-UUID', 'teacher@demo.com', 'teacher', 'Demo Teacher', '1234567891', '00000000-0000-0000-0000-000000000001', NOW()),
    ('REPLACE-WITH-PARENT-UUID', 'parent@demo.com', 'parent', 'Demo Parent', '1234567892', '00000000-0000-0000-0000-000000000001', NOW()),
    ('REPLACE-WITH-STUDENT-UUID', 'student@demo.com', 'student', 'Demo Student', '1234567893', '00000000-0000-0000-0000-000000000001', NOW())
ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name;
*/

-- Create corresponding teacher/parent/student records
-- (Run after creating profiles with actual UUIDs)

SELECT '✅ Demo school created. Now create Auth users in Dashboard, then update this script with their UUIDs.' as status;
