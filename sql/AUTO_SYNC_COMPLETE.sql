-- =================================================================
-- ✅ COMPLETE AUTO-SYNC SOLUTION
-- =================================================================
-- This ensures EVERYTHING syncs automatically:
-- 1. Creating a user → Appears everywhere instantly
-- 2. Deleting a user → Removes from everywhere instantly
-- =================================================================

-- Clean up any old/broken triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_auth_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_auth_user_delete() CASCADE;
DROP FUNCTION IF EXISTS public.sync_auth_user_to_public() CASCADE;
DROP FUNCTION IF EXISTS public.sync_auth_user_delete() CASCADE;
DROP FUNCTION IF EXISTS delete_user_by_email(TEXT);

-- =================================================================
-- 1. AUTO-SYNC: Auth User Created → Public Tables
-- =================================================================
CREATE OR REPLACE FUNCTION public.auto_sync_new_user()
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
    -- Extract metadata from signup
    user_role := COALESCE(NEW.raw_user_meta_data->>'user_type', 'Student');
    user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

    -- Create or update public.users
    INSERT INTO public.users (email, name, role, created_at)
    VALUES (NEW.email, user_name, user_role, NEW.created_at)
    ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role
    RETURNING id INTO new_user_id;

    -- Create or update auth_accounts
    INSERT INTO public.auth_accounts (username, email, user_type, user_id, is_verified, created_at)
    VALUES (
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        NEW.email,
        user_role,
        new_user_id,
        true,
        NEW.created_at
    )
    ON CONFLICT (email) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        is_verified = true;

    RAISE NOTICE 'Auto-synced new user: % (ID: %)', NEW.email, new_user_id;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.auto_sync_new_user();

-- =================================================================
-- 2. AUTO-DELETE: Auth User Deleted → Public Tables
-- =================================================================
CREATE OR REPLACE FUNCTION public.auto_delete_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete from public.users (cascades to students, teachers, parents, auth_accounts)
    DELETE FROM public.users WHERE email = OLD.email;
    RAISE NOTICE 'Auto-deleted user: %', OLD.email;
    RETURN OLD;
END;
$$;

CREATE TRIGGER on_auth_user_deleted
AFTER DELETE ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.auto_delete_user();

-- =================================================================
-- 3. ADMIN DELETE FUNCTION (for Delete button in User Accounts)
-- =================================================================
CREATE OR REPLACE FUNCTION delete_user_by_email(target_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Delete from public first (triggers will handle auth)
    DELETE FROM public.users WHERE email = target_email;
    DELETE FROM public.auth_accounts WHERE email = target_email;
    
    -- Delete from auth.users
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;
    IF target_user_id IS NOT NULL THEN
        DELETE FROM auth.users WHERE id = target_user_id;
    END IF;
    
    RAISE NOTICE 'Completely deleted user: %', target_email;
END;
$$;

-- =================================================================
-- 4. VERIFY INSTALLATION
-- =================================================================
SELECT '✅ Auto-Sync Triggers Installed Successfully!' as status;

-- Show installed triggers
SELECT 
    trigger_name,
    event_object_table as "on_table",
    action_timing || ' ' || event_manipulation as "when"
FROM information_schema.triggers
WHERE trigger_name IN ('on_auth_user_created', 'on_auth_user_deleted')
ORDER BY trigger_name;
