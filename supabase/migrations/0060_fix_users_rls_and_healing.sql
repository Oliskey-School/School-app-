-- =====================================================
-- ARCHITECT-LEVEL FIX: RLS & TENANCY RECOVERY
-- Resolves: 42809 (Views), 42P17 (Recursion), 401 (Denial)
-- =====================================================

-- 1. STRENGTHEN JWT LOOKUP (Non-Recursive)
CREATE OR REPLACE FUNCTION public.get_my_school_id()
RETURNS UUID AS $$
    -- Use JWT claims directly. No subqueries on users/profiles to avoid recursion.
    SELECT (auth.jwt() ->> 'school_id')::UUID;
$$ LANGUAGE sql STABLE;

-- 2. CLEAR ALL POLICIES AGGRESSIVELY
DO $$
DECLARE
    t text;
    p text;
    policies_to_nuke text[] := ARRAY[
        'Tenant Isolation Policy', 'Tenant Isolation',
        'Users can view profiles from their school', 'Users can view their own profile',
        'Admin/Proprietor can see everyone in school', 'Users can always see themselves',
        'Students are viewable by authenticated users', 'Teachers are viewable by authenticated users',
        'Parents are viewable by authenticated users', 'Admins can manage school users'
    ];
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN (
            'users', 'profiles', 'students', 'teachers', 'parents', 'classes', 'notices', 
            'messages', 'attendance_records', 'branches', 'schools', 'conversation_participants', 
            'student_fees', 'report_cards', 'timetable', 'health_logs', 'transport_buses', 'subjects'
        )
    LOOP
        -- Enable RLS ONLY on physical tables (Avoids 42809)
        IF (SELECT table_type FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') = 'BASE TABLE' THEN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
            
            -- Drop every known policy name
            FOREACH p IN ARRAY policies_to_nuke LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p, t);
            END LOOP;
        END IF;
    END LOOP;
END $$;

-- 3. APPLY SCALABLE JWT POLICIES
-- We use JWT claims for performance and to break the profiles loop.

-- USERS TABLE SPECIAL HANDLING
CREATE POLICY "user_self_access" ON public.users FOR ALL USING (auth.uid() = id);
CREATE POLICY "admin_school_access" ON public.users FOR SELECT USING (
    (auth.jwt() ->> 'role' = 'admin') AND 
    (school_id = (auth.jwt() ->> 'school_id')::UUID)
);

-- GENERIC MULTI-TENANT POLICY (All physical tables with school_id)
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name IN (
            'students', 'teachers', 'parents', 'classes', 'notices', 'messages', 
            'attendance_records', 'branches', 'student_fees', 'report_cards', 
            'timetable', 'health_logs', 'transport_buses', 'subjects'
        )
    LOOP
        -- Verify column existence (Avoids 42703)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'school_id') THEN
            EXECUTE format('CREATE POLICY "Tenant Isolation Policy" ON %I FOR ALL USING (school_id = (auth.jwt() ->> %L)::UUID)', t, 'school_id');
        END IF;
    END LOOP;
END $$;

-- SCHOOLS ACCESS
DROP POLICY IF EXISTS "Schools are viewable by everyone" ON public.schools;
CREATE POLICY "Schools are viewable by everyone" ON public.schools FOR SELECT TO authenticated USING (true);

-- 4. HEAL DEMO ADMIN ACCOUNT
-- Sync auth metadata with the expected dashboard school
UPDATE auth.users 
SET raw_app_meta_data = raw_app_meta_data || '{"school_id": "00000000-0000-0000-0000-000000000000", "role": "admin"}',
    raw_user_meta_data = raw_user_meta_data || '{"school_id": "00000000-0000-0000-0000-000000000000", "role": "admin"}'
WHERE id = '44444444-4444-4444-4444-444444444444';

UPDATE public.schools
SET contact_email = 'admin@demo.com'
WHERE id = '00000000-0000-0000-0000-000000000000';
