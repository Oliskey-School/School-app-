-- =====================================================
-- MULTI-TENANCY SYNC & ROBUSTNESS FIX
-- Resolves: Missing school_id in session/metadata
-- =====================================================

BEGIN;

-- 1. ENHANCED SCHOOL ID HELPER
-- Prioritizes JWT metadata (Session), then falls back to physical user record (DB)
CREATE OR REPLACE FUNCTION public.get_school_id()
RETURNS UUID AS $$
DECLARE
    _school_id UUID;
    _memoized_id UUID;
BEGIN
    -- Check JWT metadata first (Most efficient)
    _school_id := (NULLIF(auth.jwt() -> 'user_metadata' ->> 'school_id', ''))::UUID;
    
    IF _school_id IS NOT NULL THEN
        RETURN _school_id;
    END IF;

    -- Check JWT app_metadata fallback
    _school_id := (NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''))::UUID;
    
    IF _school_id IS NOT NULL THEN
        RETURN _school_id;
    END IF;

    -- Search Database as last resort (Bypasses RLS to avoid circularity)
    -- We use a limited selection to minimize performance impact
    SELECT u.school_id INTO _school_id
    FROM public.users u
    WHERE u.id = auth.uid()
    LIMIT 1;

    RETURN COALESCE(_school_id, '00000000-0000-0000-0000-000000000000'::UUID);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. METADATA SYNC RPC
-- Allows the frontend to force a "healing" update of its own metadata
-- This is useful if a user was created without a school_id initially
CREATE OR REPLACE FUNCTION public.sync_user_metadata(p_school_id UUID)
RETURNS JSONB AS $$
DECLARE
    _updated_meta JSONB;
BEGIN
    -- Ensure user is updating their own record or is a Super Admin
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Update Public Table
    UPDATE public.users 
    SET school_id = p_school_id 
    WHERE id = auth.uid() AND (school_id IS NULL OR school_id = '00000000-0000-0000-0000-000000000000');

    -- Update Auth Metadata (Requires service role or specialized trigger, 
    -- but usually signUp metadata handles this. This is for recovery)
    -- Note: In Supabase, users cannot update their own raw_user_meta_data directly via SQL
    -- easily without a trigger or being a superuser. We rely on the trigger below.
    
    RETURN jsonb_build_object('success', true, 'school_id', p_school_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. SYNC TRIGGER (DB -> Auth)
-- Ensures that if the school_id changes in the users table, it flows to the JWT
CREATE OR REPLACE FUNCTION public.on_school_id_change_sync()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.school_id IS DISTINCT FROM NEW.school_id) THEN
        UPDATE auth.users 
        SET raw_user_meta_data = jsonb_set(
            COALESCE(raw_user_meta_data, '{}'::jsonb), 
            '{school_id}', 
            concat('"', NEW.school_id::text, '"')::jsonb
        )
        WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_school_id ON public.users;
CREATE TRIGGER tr_sync_school_id
AFTER UPDATE OF school_id ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.on_school_id_change_sync();

-- 4. PERMISSIVE INITIAL ACCESS (Allow Setup)
-- Relax RLS for users table just enough to allow the first-time setup
DROP POLICY IF EXISTS "Allow initial setup" ON public.users;
CREATE POLICY "Allow initial setup" ON public.users
FOR UPDATE
USING (auth.uid() = id AND (school_id IS NULL OR school_id = '00000000-0000-0000-0000-000000000000'));

COMMIT;
