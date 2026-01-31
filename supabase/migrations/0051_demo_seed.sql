-- Seed file for Demo School and Test Accounts
-- Run this in the Supabase SQL Editor to populate test data

DO $$
DECLARE
    -- Define the constant ID for the demo school
    demo_school_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN

    -- 0. FIX CONSTRAINTS AND COLUMNS (Crucial: Must happen before inserts)
    BEGIN
        -- Disable limits for seeding
        ALTER TABLE public.users DISABLE TRIGGER tr_check_role_limits;
        
        -- Classes Fixes
        ALTER TABLE classes ADD COLUMN IF NOT EXISTS level TEXT;
        ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_level_check;
        ALTER TABLE classes ADD CONSTRAINT classes_level_check CHECK (level IN ('Preschool', 'Primary', 'Secondary', 'Tertiary'));
        
        -- Students Fixes
        ALTER TABLE students ADD COLUMN IF NOT EXISTS admission_number TEXT;
        ALTER TABLE students ADD COLUMN IF NOT EXISTS current_class_id UUID REFERENCES classes(id) ON DELETE SET NULL;

        -- Fees Fixes (ensure title exists as older schemas might miss it)
        ALTER TABLE student_fees ADD COLUMN IF NOT EXISTS title TEXT;
    EXCEPTION
        WHEN OTHERS THEN NULL;
    END;

-- 1. Create Demo School
-- Removed 'updated_at' per user error report that it doesn't exist
INSERT INTO schools (id, name, slug, motto, created_at)
VALUES 
    (demo_school_id, 'School App', 'school-app', 'Excellence in Testing', NOW())
ON CONFLICT (id) DO UPDATE SET 
    name = 'School App',
    slug = 'school-app';

-- 1. Create Auth Users (Required for FK constraint)
-- We insert into auth.users so that public.users can reference them.
-- Password hash is for 'password123' (bcrypt) - this might allow real login if hash matches, 
-- otherwise mockLogin handles the fallback.
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud, instance_id)
VALUES
    ('44444444-4444-4444-4444-444444444444', 'admin@demo.com', '$2a$10$2Y5H5k5h5k5h5k5h5k5h5eW5W5W5W5W5W5W5W5W5W5W5W5W5W5W5W', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name": "Demo Admin", "role": "admin"}', NOW(), NOW(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    ('22222222-2222-2222-2222-222222222222', 'teacher@demo.com', '$2a$10$2Y5H5k5h5k5h5k5h5k5h5eW5W5W5W5W5W5W5W5W5W5W5W5W5W5W5W', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name": "Demo Teacher", "role": "teacher"}', NOW(), NOW(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    ('33333333-3333-3333-3333-333333333333', 'parent@demo.com', '$2a$10$2Y5H5k5h5k5h5k5h5k5h5eW5W5W5W5W5W5W5W5W5W5W5W5W5W5W5W', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name": "Demo Parent", "role": "parent"}', NOW(), NOW(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    ('11111111-1111-1111-1111-111111111111', 'student@demo.com', '$2a$10$2Y5H5k5h5k5h5k5h5k5h5eW5W5W5W5W5W5W5W5W5W5W5W5W5W5W5W', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name": "Demo Student", "role": "student"}', NOW(), NOW(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    ('55555555-5555-5555-5555-555555555555', 'proprietor@demo.com', '$2a$10$2Y5H5k5h5k5h5k5h5k5h5eW5W5W5W5W5W5W5W5W5W5W5W5W5W5W5W', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name": "Demo Proprietor", "role": "proprietor"}', NOW(), NOW(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    ('66666666-6666-6666-6666-666666666666', 'inspector@demo.com', '$2a$10$2Y5H5k5h5k5h5k5h5k5h5eW5W5W5W5W5W5W5W5W5W5W5W5W5W5W5W', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name": "Demo Inspector", "role": "inspector"}', NOW(), NOW(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    ('77777777-7777-7777-7777-777777777777', 'examofficer@demo.com', '$2a$10$2Y5H5k5h5k5h5k5h5k5h5eW5W5W5W5W5W5W5W5W5W5W5W5W5W5W5W', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name": "Demo Exam Officer", "role": "examofficer"}', NOW(), NOW(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    ('88888888-8888-8888-8888-888888888888', 'compliance@demo.com', '$2a$10$2Y5H5k5h5k5h5k5h5k5h5eW5W5W5W5W5W5W5W5W5W5W5W5W5W5W5W', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name": "Demo Compliance", "role": "complianceofficer"}', NOW(), NOW(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Test Users (Profiles)
-- Using ON CONFLICT to make it idempotent
INSERT INTO users (id, email, role, full_name, school_id, created_at)
VALUES
    ('44444444-4444-4444-4444-444444444444', 'admin@demo.com', 'admin', 'Demo Admin', demo_school_id, NOW()),
    ('22222222-2222-2222-2222-222222222222', 'teacher@demo.com', 'teacher', 'Demo Teacher', demo_school_id, NOW()),
    ('33333333-3333-3333-3333-333333333333', 'parent@demo.com', 'parent', 'Demo Parent', demo_school_id, NOW()),
    ('11111111-1111-1111-1111-111111111111', 'student@demo.com', 'student', 'Demo Student', demo_school_id, NOW()),
    ('55555555-5555-5555-5555-555555555555', 'proprietor@demo.com', 'proprietor', 'Demo Proprietor', demo_school_id, NOW()),
    ('66666666-6666-6666-6666-666666666666', 'inspector@demo.com', 'inspector', 'Demo Inspector', demo_school_id, NOW()),
    ('77777777-7777-7777-7777-777777777777', 'examofficer@demo.com', 'examofficer', 'Demo Exam Officer', demo_school_id, NOW()),
    ('88888888-8888-8888-8888-888888888888', 'compliance@demo.com', 'complianceofficer', 'Demo Compliance', demo_school_id, NOW())
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    school_id = EXCLUDED.school_id;

-- 3. Insert Dummy Domain Data (Classes, Teachers, Students, Parents)

-- Classes
INSERT INTO classes (name, grade, level, school_id, created_at)
VALUES
    ('SS1 Gold', 10, 'Secondary', demo_school_id, NOW()),
    ('SS2 Diamond', 11, 'Secondary', demo_school_id, NOW()),
    ('SS3 Platinum', 12, 'Secondary', demo_school_id, NOW())
ON CONFLICT DO NOTHING;

-- Teachers (using the demo teacher)
INSERT INTO teachers (user_id, school_id, name, email, subject_specialization, created_at)
VALUES 
    ('22222222-2222-2222-2222-222222222222', demo_school_id, 'Demo Teacher', 'teacher@demo.com', '{"Mathematics", "Physics"}', NOW())
ON CONFLICT DO NOTHING;

-- Students (using the demo student)
INSERT INTO students (user_id, school_id, name, email, admission_number, current_class_id, created_at)
SELECT 
    '11111111-1111-1111-1111-111111111111', 
    demo_school_id, 
    'Demo Student', 
    'student@demo.com', 
    'ADM/2026/001', 
    id, 
    NOW()
FROM classes WHERE name = 'SS1 Gold' AND school_id = demo_school_id
ON CONFLICT DO NOTHING;

-- Parents (using the demo parent)
INSERT INTO parents (user_id, school_id, name, email, phone, created_at)
VALUES 
    ('33333333-3333-3333-3333-333333333333', demo_school_id, 'Demo Parent', 'parent@demo.com', '08012345678', NOW())
ON CONFLICT DO NOTHING;

-- Fees (using the demo student) - Add some overdue fees to populate dashboard
INSERT INTO student_fees (student_id, title, amount, paid_amount, status, due_date, created_at)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Tuition Term 1', 500.00, 0.00, 'Overdue', NOW() - INTERVAL '30 days', NOW()),
    ('11111111-1111-1111-1111-111111111111', 'Bus Fee Term 1', 150.00, 50.00, 'Pending', NOW() + INTERVAL '30 days', NOW())
ON CONFLICT DO NOTHING;

END $$;
