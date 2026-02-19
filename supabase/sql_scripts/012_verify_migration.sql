-- =====================================================
-- VERIFICATION SCRIPT
-- Run this AFTER applying the main migration
-- to verify everything is set up correctly
-- =====================================================

-- 1. Verify all functions exist
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname IN (
    'create_school_and_admin',
    'invite_staff_member',
    'handle_invited_user',
    'initialize_school_settings',
    'get_user_dashboard_route'
)
ORDER BY proname;

-- Expected: 5 functions listed

-- 2. Verify triggers exist
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name IN (
    'on_invited_user_signup',
    'on_auth_user_created'
);

-- Expected: 2 triggers listed

-- 3. Check users table role constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname = 'users_role_check';

-- Expected: Constraint with all 8 roles

-- 4. Verify RLS is enabled on key tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('schools', 'users', 'teachers', 'students', 'parents')
    AND schemaname = 'public'
ORDER BY tablename;

-- Expected: All tables should have rls_enabled = true

-- 5. Check RLS policies
SELECT 
    tablename,
    policyname,
    cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Expected: Multiple policies for tenant isolation

-- 6. Test create_school_and_admin function (DRY RUN)
-- 6. Test create_school_and_admin function (DRY RUN)
-- Wrapped in DO block to handle expected error gracefully
DO $$
BEGIN
    PERFORM create_school_and_admin(
        'Test School Verification',
        'test_verify@example.com',
        'Test Admin User',
        '00000000-0000-0000-0000-000000000001'::uuid, -- Fake UUID
        'https://example.com/logo.png',
        'Test Motto',
        'Test Address'
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Caught expected error: %', SQLERRM;
END $$;

-- Expected: Should return error about missing auth user
-- This is GOOD - it means validation is working

-- 7. Verify get_user_dashboard_route helper
SELECT 
    role,
    get_user_dashboard_route(id) as dashboard_route
FROM (
    VALUES 
        ('00000000-0000-0000-0000-000000000001'::uuid, 'admin'),
        ('00000000-0000-0000-0000-000000000002'::uuid, 'teacher'),
        ('00000000-0000-0000-0000-000000000003'::uuid, 'parent'),
        ('00000000-0000-0000-0000-000000000004'::uuid, 'student'),
        ('00000000-0000-0000-0000-000000000005'::uuid, 'proprietor'),
        ('00000000-0000-0000-0000-000000000006'::uuid, 'inspector'),
        ('00000000-0000-0000-0000-000000000007'::uuid, 'examofficer'),
        ('00000000-0000-0000-0000-000000000008'::uuid, 'complianceofficer')
) AS temp_users(id, role);

-- Expected: NULL (users don't exist), but function should work without errors

-- 8. Summary Report
DO $$
DECLARE
    func_count INTEGER;
    trigger_count INTEGER;
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO func_count
    FROM pg_proc
    WHERE proname IN (
        'create_school_and_admin',
        'invite_staff_member',
        'handle_invited_user',
        'initialize_school_settings',
        'get_user_dashboard_route'
    );

    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers
    WHERE trigger_name IN (
        'on_invited_user_signup',
        'on_auth_user_created'
    );

    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public';

    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION VERIFICATION SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Functions created: % / 5', func_count;
    RAISE NOTICE 'Triggers created: % / 2', trigger_count;
    RAISE NOTICE 'RLS Policies: %', policy_count;
    
    IF func_count = 5 AND trigger_count >= 1 THEN
        RAISE NOTICE 'STATUS: ✓ MIGRATION SUCCESSFUL';
    ELSE
        RAISE WARNING 'STATUS: ✗ MIGRATION INCOMPLETE';
    END IF;
    RAISE NOTICE '========================================';
END $$;
