-- ============================================================================
-- 🔐 SYNC DEMO USERS TO SUPABASE AUTH
-- ============================================================================
-- This script creates valid Login Users in Supabase Auth for your demo accounts.
--
-- ACCOUNTS CREATED:
-- 1. Student: student@school.com   (Password: password123)
-- 2. Teacher: teacher@school.com   (Password: password123)
-- 3. Parent:  parent@school.com    (Password: password123)
-- 4. Admin:   admin@school.com     (Password: password123)
--
-- INSTRUCTIONS:
-- 1. Open Supabase SQL Editor
-- 2. Paste this entire script
-- 3. Run it
-- ============================================================================

-- Function to create a user if they don't exist
CREATE OR REPLACE FUNCTION create_demo_user(
    param_email TEXT, 
    param_id UUID, 
    param_role TEXT
) RETURNS VOID AS $$
BEGIN
    -- Check if user exists in auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = param_email) THEN
        -- Insert into auth.users (Correct columns for Supabase Auth)
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            recovery_token,
            is_super_admin
        ) VALUES (
            '00000000-0000-0000-0000-000000000000', 
            param_id, 
            'authenticated',
            'authenticated',
            param_email,
            crypt('password123', gen_salt('bf')), -- Default Password: password123
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            jsonb_build_object('role', param_role), -- Store role in metadata
            NOW(),
            NOW(),
            '',
            '',
            FALSE
        );
        
        -- Insert into auth.identities
        INSERT INTO auth.identities (
            id, -- Identity ID (usually same as user ID or random UUID)
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            param_id, -- Using param_id as identity ID for simplicity
            param_id,
            jsonb_build_object('sub', param_id, 'email', param_email),
            'email',
            param_id, -- Using UUID as text for provider_id
            NOW(),
            NOW(),
            NOW()
        );
    ELSE
        -- Update existing user metadata/password if needed
        UPDATE auth.users 
        SET raw_user_meta_data = jsonb_build_object('role', param_role),
            encrypted_password = crypt('password123', gen_salt('bf'))
        WHERE email = param_email;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Execute for each demo user
-- We use fixed UUIDs for demo users to prevent mismatch
-- You can change these UUIDs if you want, but keep them consistent.

-- 1. STUDENT
SELECT create_demo_user(
    'student@school.com', 
    '11111111-1111-1111-1111-111111111111', 
    'student'
);

-- 2. TEACHER
SELECT create_demo_user(
    'teacher@school.com', 
    '22222222-2222-2222-2222-222222222222', 
    'teacher'
);

-- 3. PARENT
SELECT create_demo_user(
    'parent@school.com', 
    '33333333-3333-3333-3333-333333333333', 
    'parent'
);

-- 4. ADMIN
SELECT create_demo_user(
    'admin@school.com', 
    '44444444-4444-4444-4444-444444444444', 
    'admin'
);

-- ============================================
-- VERIFICATION
-- ============================================
SELECT email, raw_user_meta_data->>'role' as role FROM auth.users 
WHERE email IN ('student@school.com', 'teacher@school.com', 'parent@school.com', 'admin@school.com');
