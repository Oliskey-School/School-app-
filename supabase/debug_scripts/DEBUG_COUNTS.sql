
-- Debug Script: Check counts and IDs for Demo School

-- 1. Check what the "Demo" school ID actually is in the schools table
SELECT id, name FROM schools WHERE name ILIKE '%Demo%';

-- 2. Check the counts for the hardcoded demo school ID 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'
SELECT 
    'Students' as table_name, count(*) as count 
FROM students 
WHERE school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';

SELECT 
    'Teachers' as table_name, count(*) as count 
FROM teachers 
WHERE school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';

SELECT 
    'Parents' as table_name, count(*) as count 
FROM parents 
WHERE school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';

-- 3. Check what school_id the "visible" users actually have
-- We'll check a few students to see their school_id and branch_id
SELECT id, name, school_id, branch_id FROM students LIMIT 5;

-- 4. Check branches for the demo school
SELECT id, name, school_id FROM branches WHERE school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';

-- 5. Test the RPC call directly with the demo ID
SELECT * FROM get_dashboard_stats('d0ff3e95-9b4c-4c12-989c-e5640d3cacd1', NULL);
