-- =====================================================
-- MULTI-TENANT SCHOOL ONBOARDING FLOW
-- Enhanced RLS-based multi-tenancy with proper onboarding
-- Date: 2026-01-28
-- =====================================================

-- =====================================================
-- 1. Enhanced School Creation Function
-- =====================================================

-- Drop existing function and recreate with enhanced functionality
DROP FUNCTION IF EXISTS create_school_and_admin(text, text, text, uuid, text);

CREATE OR REPLACE FUNCTION create_school_and_admin(
    p_school_name TEXT,
    p_admin_email TEXT,
    p_admin_name TEXT,
    p_admin_auth_user_id UUID,
    p_logo_url TEXT DEFAULT NULL,
    p_motto TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_school_id UUID;
    v_slug TEXT;
    v_user_exists BOOLEAN;
BEGIN
    -- Generate unique slug
    v_slug := lower(regexp_replace(p_school_name, '[^a-zA-Z0-9]', '-', 'g'));
    v_slug := v_slug || '-' || substring(md5(random()::text), 1, 4);

    -- Create school with all details
    INSERT INTO public.schools (name, slug, subscription_status, logo_url, motto, address, contact_email)
    VALUES (
        p_school_name, 
        v_slug, 
        'active', 
        COALESCE(p_logo_url, 'https://api.dicebear.com/7.x/initials/svg?seed=' || substring(p_school_name, 1, 1)),
        p_motto,
        p_address,
        p_admin_email
    )
    RETURNING id INTO v_school_id;

    RAISE NOTICE 'Created school: % with ID: %', p_school_name, v_school_id;

    -- Create main branch for school
    INSERT INTO public.branches (school_id, name, is_main, location)
    VALUES (v_school_id, 'Main Campus', true, COALESCE(p_address, 'Primary Location'))
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created main branch for school: %', v_school_id;

    -- Check if user already exists (from trigger)
    SELECT EXISTS(SELECT 1 FROM public.users WHERE id = p_admin_auth_user_id) INTO v_user_exists;

    IF v_user_exists THEN
        -- Update existing user with school_id and admin role
        RAISE NOTICE 'Updating existing user % with school_id %', p_admin_email, v_school_id;
        UPDATE public.users
        SET school_id = v_school_id,
            email = p_admin_email,
            full_name = p_admin_name,
            name = p_admin_name,
            role = 'admin',
            avatar_url = COALESCE(avatar_url, 'https://api.dicebear.com/7.x/initials/svg?seed=' || replace(p_admin_name, ' ', ''))
        WHERE id = p_admin_auth_user_id;
    ELSE
        -- Create new user
        RAISE NOTICE 'Creating new user % with school_id %', p_admin_email, v_school_id;
        INSERT INTO public.users (id, school_id, email, full_name, role, name, avatar_url)
        VALUES (
            p_admin_auth_user_id,
            v_school_id,
            p_admin_email,
            p_admin_name,
            'admin',
            p_admin_name,
            'https://api.dicebear.com/7.x/initials/svg?seed=' || replace(p_admin_name, ' ', '')
        );
    END IF;

    -- Update auth.users metadata to include role and school_id
    -- This ensures the role is available in JWT claims
    UPDATE auth.users
    SET raw_app_meta_data = jsonb_set(
        jsonb_set(
            COALESCE(raw_app_meta_data, '{}'::jsonb),
            '{role}',
            to_jsonb('admin'::text)
        ),
        '{school_id}',
        to_jsonb(v_school_id::text)
    ),
    raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{full_name}',
        to_jsonb(p_admin_name)
    )
    WHERE id = p_admin_auth_user_id;

    RAISE NOTICE 'Updated auth metadata for admin user';
    RAISE NOTICE 'Successfully created school and admin user';

    RETURN jsonb_build_object(
        'success', true,
        'school_id', v_school_id,
        'school_name', p_school_name,
        'slug', v_slug,
        'admin_id', p_admin_auth_user_id
    );
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'School creation failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_school_and_admin TO authenticated;
GRANT EXECUTE ON FUNCTION create_school_and_admin TO anon;

-- =====================================================
-- 2. Staff Invitation Helper Function
-- =====================================================

CREATE OR REPLACE FUNCTION invite_staff_member(
    p_school_id UUID,
    p_email TEXT,
    p_role TEXT,
    p_full_name TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_valid_roles TEXT[] := ARRAY['admin', 'teacher', 'parent', 'student', 'proprietor', 'inspector', 'examofficer', 'complianceofficer'];
    v_caller_is_admin BOOLEAN;
    v_caller_school_id UUID;
BEGIN
    -- Validate role
    IF NOT (p_role = ANY(v_valid_roles)) THEN
        RAISE EXCEPTION 'Invalid role: %. Must be one of: %', p_role, array_to_string(v_valid_roles, ', ');
    END IF;

    -- Check if caller is admin of the specified school
    SELECT 
        (role IN ('admin', 'proprietor')),
        school_id
    INTO v_caller_is_admin, v_caller_school_id
    FROM public.users
    WHERE id = auth.uid();

    IF NOT v_caller_is_admin THEN
        RAISE EXCEPTION 'Only administrators and proprietors can invite staff members';
    END IF;

    IF v_caller_school_id != p_school_id THEN
        RAISE EXCEPTION 'You can only invite staff to your own school';
    END IF;

    -- Return metadata for invitation
    -- The actual invitation should be sent via Supabase Auth Admin API from the application
    RETURN jsonb_build_object(
        'success', true,
        'school_id', p_school_id,
        'email', p_email,
        'role', p_role,
        'full_name', p_full_name,
        'metadata', jsonb_build_object(
            'school_id', p_school_id,
            'role', p_role,
            'full_name', p_full_name
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION invite_staff_member TO authenticated;

-- =====================================================
-- 3. Handle Invited User Signup
-- =====================================================

-- Function to process invited users when they accept invitation
CREATE OR REPLACE FUNCTION handle_invited_user()
RETURNS TRIGGER AS $$
DECLARE
    v_school_id UUID;
    v_role TEXT;
    v_full_name TEXT;
BEGIN
    -- Extract metadata from invitation
    v_school_id := (new.raw_user_meta_data->>'school_id')::uuid;
    v_role := new.raw_user_meta_data->>'role';
    v_full_name := new.raw_user_meta_data->>'full_name';

    -- If this is an invited user (has school_id and role in metadata)
    IF v_school_id IS NOT NULL AND v_role IS NOT NULL THEN
        -- Create user profile
        INSERT INTO public.users (id, school_id, email, full_name, name, role)
        VALUES (
            new.id,
            v_school_id,
            new.email,
            COALESCE(v_full_name, new.email),
            COALESCE(v_full_name, new.email),
            v_role
        )
        ON CONFLICT (id) DO UPDATE SET
            school_id = EXCLUDED.school_id,
            role = EXCLUDED.role,
            full_name = EXCLUDED.full_name;

        -- Update app_metadata for JWT claims
        UPDATE auth.users
        SET raw_app_meta_data = jsonb_set(
            jsonb_set(
                COALESCE(raw_app_meta_data, '{}'::jsonb),
                '{role}',
                to_jsonb(v_role)
            ),
            '{school_id}',
            to_jsonb(v_school_id::text)
        )
        WHERE id = new.id;

        RAISE NOTICE 'Created profile for invited user: % with role: %', new.email, v_role;
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for invited users (runs after handle_new_user)
DROP TRIGGER IF EXISTS on_invited_user_signup ON auth.users;
CREATE TRIGGER on_invited_user_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    WHEN (new.raw_user_meta_data ? 'school_id')
    EXECUTE FUNCTION handle_invited_user();

-- =====================================================
-- 4. Enhanced RLS Policies for Multi-Role System
-- =====================================================

-- Ensure all 8 roles are properly supported in users table
DO $$
BEGIN
    -- Update role check constraint to include all roles
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE public.users ADD CONSTRAINT users_role_check 
        CHECK (role IN ('admin', 'teacher', 'parent', 'student', 'proprietor', 'inspector', 'examofficer', 'complianceofficer', 'super_admin', 'bursar'));
END $$;

-- Policy: Allow admins and proprietors to insert new users in their school
DROP POLICY IF EXISTS "Admins can create users in their school" ON public.users;
CREATE POLICY "Admins can create users in their school" ON public.users
    FOR INSERT
    WITH CHECK (
        school_id IN (
            SELECT school_id FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'proprietor')
        )
    );

-- Policy: Allow users to view all users in their school (needed for cross-role functionality)
DROP POLICY IF EXISTS "Users can view all profiles in same school" ON public.users;
CREATE POLICY "Users can view all profiles in same school" ON public.users
    FOR SELECT
    USING (
        school_id = (SELECT school_id FROM public.users WHERE id = auth.uid())
        OR id = auth.uid()
    );

-- =====================================================
-- 5. Create Initial School Settings Template
-- =====================================================

CREATE OR REPLACE FUNCTION initialize_school_settings(p_school_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Insert default settings if they don't exist
    -- This can be called after school creation to set up defaults
    
    -- You can add default settings tables here as needed
    -- For example: default fee structures, academic year settings, etc.
    
    RAISE NOTICE 'Initialized settings for school: %', p_school_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION initialize_school_settings TO authenticated;

-- =====================================================
-- 6. Helper Function to Get User's Dashboard Route
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_dashboard_route(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role FROM public.users WHERE id = p_user_id;
    
    RETURN CASE v_role
        WHEN 'admin' THEN '/dashboard/admin'
        WHEN 'teacher' THEN '/dashboard/teacher'
        WHEN 'parent' THEN '/dashboard/parent'
        WHEN 'student' THEN '/dashboard/student'
        WHEN 'proprietor' THEN '/dashboard/proprietor'
        WHEN 'inspector' THEN '/dashboard/inspector'
        WHEN 'examofficer' THEN '/dashboard/examofficer'
        WHEN 'complianceofficer' THEN '/dashboard/compliance'
        WHEN 'super_admin' THEN '/dashboard/super-admin'
        WHEN 'bursar' THEN '/dashboard/bursar'
        ELSE '/dashboard'
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_user_dashboard_route TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_dashboard_route TO anon;

-- =====================================================
-- 7. Verification Queries
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Multi-Tenant Onboarding Migration Complete';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Created/Updated Functions:';
    RAISE NOTICE '  - create_school_and_admin (enhanced)';
    RAISE NOTICE '  - invite_staff_member (new)';
    RAISE NOTICE '  - handle_invited_user (new)';
    RAISE NOTICE '  - initialize_school_settings (new)';
    RAISE NOTICE '  - get_user_dashboard_route (new)';
    RAISE NOTICE 'Updated RLS Policies for 8-role system';
    RAISE NOTICE '===========================================';
END $$;
