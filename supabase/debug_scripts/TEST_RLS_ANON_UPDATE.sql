
-- Test RLS Update (ANON)
BEGIN;

-- 1. Set Role to anon
SET ROLE anon;
SELECT set_config('request.jwt.claims', '{}', true);

-- 2. Attempt UPDATE (Teacher)
-- We need a valid ID. Let's pick one from the previous insert or just any.
-- Since this is a test transaction, it won't commit.
UPDATE public.teachers 
SET name = 'Anon Updated Name'
WHERE school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'
RETURNING id, name;

ROLLBACK;
