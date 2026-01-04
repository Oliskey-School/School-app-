-- SIMPLIFIED DEMO USERS SETUP
-- Copy this entire script and paste into Supabase SQL Editor

-- This creates the demo school and profiles
-- Auth users MUST be created manually in Dashboard > Authentication > Users

BEGIN;

-- Create demo school
INSERT INTO public.schools (id, name, address, state, curriculum_type) 
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Demo School',
    '123 Demo Street',
    'Lagos',
    'Nigerian'
)
ON CONFLICT (id) DO UPDATE SET name = 'Demo School';

-- Create profiles with predefined UUIDs
-- These UUIDs are consistent and can be used when creating auth users
INSERT INTO public.profiles (id, email, role, full_name, phone, school_id)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'admin@demo.com', 'admin', 'Demo Admin', '1234567890', '00000000-0000-0000-0000-000000000001'),
    ('b0000000-0000-0000-0000-000000000002', 'teacher@demo.com', 'teacher', 'Demo Teacher', '1234567891', '00000000-0000-0000-0000-000000000001'),
    ('c0000000-0000-0000-0000-000000000003', 'parent@demo.com', 'parent', 'Demo Parent', '1234567892', '00000000-0000-0000-0000-000000000001'),
    ('d0000000-0000-0000-0000-000000000004', 'student@demo.com', 'student', 'Demo Student', '1234567893', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name;

COMMIT;

SELECT '✅ Profiles created!' as status;
SELECT '⚠️ NOW GO TO: Authentication > Users > Add user' as action_required;
SELECT 'Create 4 users with @demo.com emails, password: Demo123!' as instructions;
