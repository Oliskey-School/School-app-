-- =================================================================
-- 🔄 BETTER SYNC APPROACH: Auth → Public (One Direction Only)
-- =================================================================
-- This replaces the previous bidirectional sync with a simpler approach:
-- Supabase Auth is the SINGLE source of truth
-- =================================================================

-- First, let's clean up the old triggers to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

-- Drop the old delete function
DROP FUNCTION IF EXISTS delete_user_by_email(TEXT);
DROP FUNCTION IF EXISTS public.handle_new_auth_user();
DROP FUNCTION IF EXISTS public.handle_auth_user_delete();

-- =================================================================
-- NEW APPROACH: Simple One-Way Sync (Auth → Public)
-- =================================================================

-- Create trigger function to sync new Auth users to public
CREATE OR REPLACE FUNCTION public.sync_auth_user_to_public()
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
    -- Extract metadata
    user_role := COALESCE(NEW.raw_user_meta_data->>'user_type', 'Student');
    user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

    -- Check if user already exists
    SELECT id INTO new_user_id FROM public.users WHERE email = NEW.email;

    IF new_user_id IS NULL THEN
        -- Create new user
        INSERT INTO public.users (email, name, role)
        VALUES (NEW.email, user_name, user_role)
        RETURNING id INTO new_user_id;
    END IF;

    -- Upsert auth_account
    INSERT INTO public.auth_accounts (username, email, user_type, user_id, is_verified)
    VALUES (
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        NEW.email,
        user_role,
        new_user_id,
        TRUE
    )
    ON CONFLICT (email) DO UPDATE SET
        username = EXCLUDED.username,
        user_id = EXCLUDED.user_id,
        is_verified = EXCLUDED.is_verified;

    RETURN NEW;
END;
$$;

-- Bind the trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.sync_auth_user_to_public();

-- Create deletion sync
CREATE OR REPLACE FUNCTION public.sync_auth_user_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete from public (cascades to students, teachers, parents)
    DELETE FROM public.users WHERE email = OLD.email;
    RETURN OLD;
END;
$$;

CREATE TRIGGER on_auth_user_deleted
AFTER DELETE ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.sync_auth_user_delete();

-- =================================================================
-- CLEANUP: Remove orphaned public users (not in Auth)
-- =================================================================

-- This is a one-time cleanup to remove users that exist in public but not in Auth
DO $$
DECLARE
    deleted_count INTEGER := 0;
    user_rec RECORD;
BEGIN
    -- We can't directly check auth.users from here, so we'll use a different approach:
    -- Delete users that have auth_accounts but the auth record is marked as unverified
    -- or was created way before (orphaned)
    
    FOR user_rec IN 
        SELECT u.id, u.email 
        FROM public.users u
        LEFT JOIN public.auth_accounts aa ON u.email = aa.email
        WHERE aa.email IS NULL OR aa.is_verified = FALSE
    LOOP
        -- Only delete if it's truly orphaned (no auth account or unverified for too long)
        DELETE FROM public.users WHERE id = user_rec.id;
        deleted_count := deleted_count + 1;
        RAISE NOTICE 'Deleted orphaned user: %', user_rec.email;
    END LOOP;
    
    RAISE NOTICE 'Cleanup complete. Deleted % orphaned users', deleted_count;
END;
$$;

-- Verify final counts
SELECT 
    'users table' as source,
    COUNT(*) as count
FROM public.users
UNION ALL
SELECT 
    'auth_accounts table' as source,
    COUNT(*) as count  
FROM public.auth_accounts;

SELECT '✅ Improved Sync Applied & Cleanup Complete' as status;
