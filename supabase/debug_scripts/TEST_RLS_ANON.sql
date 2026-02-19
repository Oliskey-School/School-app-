
-- Test RLS Insert (ANON)
-- Simulating the case where the user is not authenticated properly

BEGIN;

-- 1. Set Role to anon
SET ROLE anon;

-- 2. Clear JWT Claims
SELECT set_config('request.jwt.claims', '', true);

-- 3. Attempt Insert (Teacher)
INSERT INTO public.teachers (
    name, 
    email, 
    status, 
    school_id,
    branch_id,
    school_generated_id
) VALUES (
    'Test Anon Teacher',
    'anon_teacher@school.com',
    'Active',
    'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1',
    NULL,
    NULL
) RETURNING id;

ROLLBACK;
