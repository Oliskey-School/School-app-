-- =================================================================
-- 🔍 VERIFY TRIGGERS ARE INSTALLED
-- =================================================================

-- Check if our sync triggers exist
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public' 
   OR event_object_schema = 'auth'
ORDER BY event_object_table, trigger_name;

-- Check if our sync functions exist
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%sync%'
  OR routine_name LIKE '%handle%'
  OR routine_name = 'delete_user_by_email';
