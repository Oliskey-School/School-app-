-- =================================================================
-- 🔄 USER SYNCHRONIZATION & REPAIR SCRIPT
-- =================================================================
-- This script ensures valid 2-way sync between Supabase Auth and Public Tables.
-- It fixes the "Account Count Mismatch" issue.
-- =================================================================

-- 1. Create a function to delete users from Auth when deleted from Public (if needed)
-- OR: The preferred "Source of Truth" is usually Supabase Auth. 
-- However, for the Admin Dashboard to delete users, we need an RPC.

CREATE OR REPLACE FUNCTION delete_user_by_email(target_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with high privileges to delete from auth.users
SET search_path = public
AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Find the auth user ID
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

    -- Delete from public.users (Cascades to students, teachers, auth_accounts)
    DELETE FROM public.users WHERE email = target_email;

    -- Delete from auth.users (if exists)
    IF target_user_id IS NOT NULL THEN
        DELETE FROM auth.users WHERE id = target_user_id;
    END IF;
END;
$$;

-- 2. Create Trigger Function to Auto-Create Public User from Auth
-- This ensures if a user is created in Supabase Console, they appear in the App.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_user_id INTEGER;
    user_role VARCHAR;
    user_name VARCHAR;
BEGIN
    -- Try to determine metadata (if passed during sign up)
    user_role := COALESCE(new.raw_user_meta_data->>'user_type', 'Student'); -- Default to Student
    user_name := COALESCE(new.raw_user_meta_data->>'full_name', 'Unknown User');

    -- Check if public user already exists (by email) to avoid duplicates
    SELECT id INTO new_user_id FROM public.users WHERE email = new.email;

    IF new_user_id IS NULL THEN
        -- Create public user
        INSERT INTO public.users (email, name, role, avatar_url)
        VALUES (
            new.email, 
            user_name, 
            user_role,
            'https://i.pravatar.cc/150?u=' || replace(user_name, ' ', '')
        )
        RETURNING id INTO new_user_id;
    END IF;

    -- Update or Insert into auth_accounts (The internal directory)
    -- This table seems to map usernames to emails.
    IF NOT EXISTS (SELECT 1 FROM public.auth_accounts WHERE email = new.email) THEN
        INSERT INTO public.auth_accounts (
            username, 
            email, 
            user_type, 
            user_id, 
            is_verified,
            created_at
        )
        VALUES (
            COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)), 
            new.email, 
            user_role, 
            new_user_id, 
            TRUE,
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$;

-- 3. Bind Trigger to auth.users
-- Drop if exists to avoid errors
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 4. REPAIR SCRIPT: Sync existing Auth Users to Public
-- This fixes the "20 vs 7" count issue by creating missing public records.

DO $$
DECLARE
    auth_user RECORD;
    public_id INTEGER;
BEGIN
    FOR auth_user IN SELECT * FROM auth.users LOOP
        -- Check if exists in public.users
        IF NOT EXISTS (SELECT 1 FROM public.users WHERE email = auth_user.email) THEN
            -- Insert missing public user
            INSERT INTO public.users (email, name, role, created_at)
            VALUES (
                auth_user.email,
                COALESCE(auth_user.raw_user_meta_data->>'full_name', 'Recovered User'),
                COALESCE(auth_user.raw_user_meta_data->>'user_type', 'Student'),
                auth_user.created_at
            )
            RETURNING id INTO public_id;
            
            -- Insert missing auth_account
            INSERT INTO public.auth_accounts (username, email, user_type, user_id, is_verified)
            VALUES (
                COALESCE(auth_user.raw_user_meta_data->>'username', split_part(auth_user.email, '@', 1)),
                auth_user.email,
                COALESCE(auth_user.raw_user_meta_data->>'user_type', 'Student'),
                public_id,
                TRUE
            )
            ON CONFLICT (email) DO NOTHING;
            
            RAISE NOTICE 'Restored public user for: %', auth_user.email;
        END IF;
    END LOOP;
END;
$$;

-- 5. Trigger to handle Deletion (Auth -> Public)
-- If a user is deleted in Supabase Console, remove them from app.

CREATE OR REPLACE FUNCTION public.handle_auth_user_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.users WHERE email = old.email;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

CREATE TRIGGER on_auth_user_deleted
AFTER DELETE ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_delete();

-- Success Output
SELECT '✅ Synchronization Triggers & Repair Complete' as status;
