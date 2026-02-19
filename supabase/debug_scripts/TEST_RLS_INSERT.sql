
-- Test RLS Insert
-- Mimic the Demo Admin User
-- ID: 014811ea-281f-484e-b039-e37beb8d92b2
-- School ID: d0ff3e95-9b4c-4c12-989c-e5640d3cacd1

BEGIN;

-- 1. Set Role
SET ROLE authenticated;

-- 2. Set JWT Claims (simulating login)
-- Note: we need to properly form the JSON
SELECT set_config('request.jwt.claims', '{"sub": "014811ea-281f-484e-b039-e37beb8d92b2", "role": "authenticated", "user_metadata": {"school_id": "d0ff3e95-9b4c-4c12-989c-e5640d3cacd1"}}', true);

-- 3. Debug: Check get_school_id() result
SELECT get_school_id() as resolved_school_id;

-- 4. Attempt Insert (Teacher)
-- We use a known user_id (the demo admin himself for testing, or a random UUID)
INSERT INTO public.teachers (
    name, 
    email, 
    status, 
    school_id, 
    branch_id,
    school_generated_id -- Trigger should handle this, or we verify if permission denied on trigger
) VALUES (
    'Test Teacher Agent',
    'agent_test@school.com',
    'Active',
    'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1',
    NULL,
    NULL
) RETURNING id;

ROLLBACK;
