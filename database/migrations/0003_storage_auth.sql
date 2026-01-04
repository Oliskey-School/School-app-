-- ============================================================================
-- 🚀 PART 3: AUTHENTICATION SETUP (Views & Sync)
-- ============================================================================
-- Run this script LAST. It links Supabase Auth with your Data.
-- ============================================================================

-- 1. Create 'auth_accounts' View
-- Robust Cleanup: Checks if it's a TABLE or VIEW to avoid Type Errors (42809)
DO $$ 
BEGIN 
  -- Check if it is a Table and drop it
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'auth_accounts') THEN
    EXECUTE 'DROP TABLE public.auth_accounts CASCADE';
  END IF;
  
  -- Check if it is a View and drop it
  IF EXISTS (SELECT FROM pg_views WHERE schemaname = 'public' AND viewname = 'auth_accounts') THEN
    EXECUTE 'DROP VIEW public.auth_accounts CASCADE';
  END IF;
END $$;

-- This allows the Admin Panel to see who is registered in Supabase Auth
-- and maps their role/name from the public tables.
CREATE OR REPLACE VIEW auth_accounts AS
SELECT
    au.id,
    au.email as username,
    au.email,
    (au.raw_user_meta_data->>'role')::text as user_type,
    au.created_at,
    TRUE as is_active, -- Default to true
    -- Try to find name in any table
    COALESCE(s.name, t.name, p.name, 'Admin User') as name,
    -- Try to find ID in any table
    COALESCE(s.id, t.id, p.id) as user_id
FROM auth.users au
LEFT JOIN students s ON s.email = au.email
LEFT JOIN teachers t ON t.email = au.email
LEFT JOIN parents p ON p.email = au.email;

-- 2. DYNAMIC USER SYNC FUNCTION
-- This function loops through your Students/Teachers/Parents and creates
-- Login Accounts for them in Supabase Auth (auth.users).
CREATE OR REPLACE FUNCTION sync_all_public_users_to_auth()
RETURNS void AS $$
DECLARE
    r RECORD;
    new_id UUID;
BEGIN
    -- 1. Sync Students (Role: 'student')
    FOR r IN SELECT * FROM students WHERE email IS NOT NULL LOOP
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = r.email) THEN
            new_id := gen_random_uuid();
            -- Generate Password: surname + 1234 (must match UI logic)
            -- Logic: Lowercase of last part of name + '1234'
            -- e.g. "John Doe" -> "doe1234"
            INSERT INTO auth.users (
                instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                raw_app_meta_data, raw_user_meta_data, created_at, updated_at
            ) VALUES (
                '00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated', 
                r.email, 
                crypt(lower(split_part(r.name, ' ', array_length(regexp_split_to_array(r.name, ' '), 1))) || '1234', gen_salt('bf')), 
                NOW(),
                '{"provider": "email", "providers": ["email"]}',
                jsonb_build_object('role', 'student'),
                NOW(), NOW()
            );
            INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
            VALUES (new_id, new_id, jsonb_build_object('sub', new_id, 'email', r.email), 'email', new_id, NOW(), NOW(), NOW());
        END IF;
    END LOOP;

    -- 2. Sync Teachers (Role: 'teacher')
    FOR r IN SELECT * FROM teachers WHERE email IS NOT NULL LOOP
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = r.email) THEN
            new_id := gen_random_uuid();
            INSERT INTO auth.users (
                instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                raw_app_meta_data, raw_user_meta_data, created_at, updated_at
            ) VALUES (
                '00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated', 
                r.email, 
                crypt(lower(split_part(r.name, ' ', array_length(regexp_split_to_array(r.name, ' '), 1))) || '1234', gen_salt('bf')),
                NOW(),
                '{"provider": "email", "providers": ["email"]}',
                jsonb_build_object('role', 'teacher'),
                NOW(), NOW()
            );
            INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
            VALUES (new_id, new_id, jsonb_build_object('sub', new_id, 'email', r.email), 'email', new_id, NOW(), NOW(), NOW());
        END IF;
    END LOOP;

    -- 3. Sync Parents (Role: 'parent')
    FOR r IN SELECT * FROM parents WHERE email IS NOT NULL LOOP
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = r.email) THEN
            new_id := gen_random_uuid();
            INSERT INTO auth.users (
                instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                raw_app_meta_data, raw_user_meta_data, created_at, updated_at
            ) VALUES (
                '00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated', 
                r.email, 
                crypt(lower(split_part(r.name, ' ', array_length(regexp_split_to_array(r.name, ' '), 1))) || '1234', gen_salt('bf')),
                NOW(),
                '{"provider": "email", "providers": ["email"]}',
                jsonb_build_object('role', 'parent'),
                NOW(), NOW()
            );
            INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
            VALUES (new_id, new_id, jsonb_build_object('sub', new_id, 'email', r.email), 'email', new_id, NOW(), NOW(), NOW());
        END IF;
    END LOOP;

    -- 4. Ensure Admin Exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@school.com') THEN
         new_id := gen_random_uuid();
         INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated', 
            'admin@school.com', crypt('password123', gen_salt('bf')), NOW(),
            '{"provider": "email", "providers": ["email"]}',
            jsonb_build_object('role', 'admin'),
            NOW(), NOW()
        );
        INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
        VALUES (new_id, new_id, jsonb_build_object('sub', new_id, 'email', 'admin@school.com'), 'email', new_id, NOW(), NOW(), NOW());
    END IF;

END;
$$ LANGUAGE plpgsql;

-- 3. Run the Sync Function Immediately
SELECT sync_all_public_users_to_auth();

-- 4. Verification
SELECT count(*) as auth_users_count FROM auth.users;
SELECT * FROM auth_accounts;
