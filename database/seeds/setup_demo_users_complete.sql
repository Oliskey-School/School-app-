-- ============================================================================
-- DEMO USERS SETUP FOR QUICK LOGIN
-- ============================================================================
-- This script creates demo users in auth.users and corresponding profiles
-- Run this in Supabase SQL Editor

BEGIN;

-- ============================================================================
-- 1. CREATE DEMO SCHOOL
-- ============================================================================
INSERT INTO public.schools (id, name, address, state, curriculum_type, created_at) 
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Demo School',
    '123 Demo Street',
    'Lagos',
    'Nigerian',
    NOW()
)
ON CONFLICT (id) DO UPDATE SET 
    name = 'Demo School',
    address = '123 Demo Street',
    state = 'Lagos';

-- ============================================================================
-- 2. CREATE AUTH USERS (Using Supabase Auth Admin Functions)
-- ============================================================================
-- Note: Direct insertion into auth.users requires superuser privileges
-- Instead, we'll use auth.users table if accessible, or guide manual creation

-- Check if we can access auth schema
DO $$
DECLARE
    admin_id UUID;
    teacher_id UUID;
    parent_id UUID;
    student_id UUID;
BEGIN
    -- Try to create users using auth functions if available
    -- Otherwise, these will need to be created via Dashboard

    -- Generate UUIDs for demo users
    admin_id := 'a0000000-0000-0000-0000-000000000001'::UUID;
    teacher_id := 'b0000000-0000-0000-0000-000000000002'::UUID;
    parent_id := 'c0000000-0000-0000-0000-000000000003'::UUID;
    student_id := 'd0000000-0000-0000-0000-000000000004'::UUID;

    -- Insert into auth.users (requires elevated privileges)
    -- This may fail if you don't have permission
    BEGIN
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            role,
            aud
        ) VALUES
        (
            admin_id,
            '00000000-0000-0000-0000-000000000000',
            'admin@demo.com',
            crypt('Demo123!', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}',
            '{"role":"admin","full_name":"Demo Admin"}',
            NOW(),
            NOW(),
            'authenticated',
            'authenticated'
        ),
        (
            teacher_id,
            '00000000-0000-0000-0000-000000000000',
            'teacher@demo.com',
            crypt('Demo123!', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}',
            '{"role":"teacher","full_name":"Demo Teacher"}',
            NOW(),
            NOW(),
            'authenticated',
            'authenticated'
        ),
        (
            parent_id,
            '00000000-0000-0000-0000-000000000000',
            'parent@demo.com',
            crypt('Demo123!', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}',
            '{"role":"parent","full_name":"Demo Parent"}',
            NOW(),
            NOW(),
            'authenticated',
            'authenticated'
        ),
        (
            student_id,
            '00000000-0000-0000-0000-000000000000',
            'student@demo.com',
            crypt('Demo123!', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}',
            '{"role":"student","full_name":"Demo Student"}',
            NOW(),
            NOW(),
            'authenticated',
            'authenticated'
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            raw_user_meta_data = EXCLUDED.raw_user_meta_data,
            updated_at = NOW();

        RAISE NOTICE 'Auth users created successfully!';

    EXCEPTION
        WHEN insufficient_privilege THEN
            RAISE NOTICE 'Cannot create auth users via SQL - insufficient privileges';
            RAISE NOTICE 'Please create users manually in Supabase Dashboard > Authentication > Users';
            RAISE NOTICE 'Use emails: admin@demo.com, teacher@demo.com, parent@demo.com, student@demo.com';
            RAISE NOTICE 'Password for all: Demo123!';
    END;

    -- ============================================================================
    -- 3. CREATE PROFILES (These will work with or without auth user creation)
    -- ============================================================================
    INSERT INTO public.profiles (id, email, role, full_name, phone, school_id, created_at)
    VALUES
        (admin_id, 'admin@demo.com', 'admin', 'Demo Admin', '1234567890', '00000000-0000-0000-0000-000000000001', NOW()),
        (teacher_id, 'teacher@demo.com', 'teacher', 'Demo Teacher', '1234567891', '00000000-0000-0000-0000-000000000001', NOW()),
        (parent_id, 'parent@demo.com', 'parent', 'Demo Parent', '1234567892', '00000000-0000-0000-0000-000000000001', NOW()),
        (student_id, 'student@demo.com', 'student', 'Demo Student', '1234567893', '00000000-0000-0000-0000-000000000001', NOW())
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        full_name = EXCLUDED.full_name,
        school_id = EXCLUDED.school_id;

    RAISE NOTICE 'Profiles created successfully!';
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT '✅ Demo school and profiles created!' as status;
SELECT 'Check Supabase Dashboard > Authentication > Users to verify auth users' as next_step;
SELECT 'If auth users failed, create them manually with emails ending in @demo.com' as note;
