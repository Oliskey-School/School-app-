-- Migration: Fix Demo Data and UUID Links
-- Description: Deletes duplicate demo profiles and ensures teachers, students, and parents are linked to the correct Supabase Auth UUIDs.

BEGIN;

-- 1. Fix Teacher: john.smith@demo.com
-- Auth UUID: 6f90901e-4119-457d-8d73-745b17831a30
-- We have a record in 'teachers' with email 'john.smith@demo.com'
UPDATE public.teachers 
SET user_id = '6f90901e-4119-457d-8d73-745b17831a30' 
WHERE email = 'john.smith@demo.com';

-- Delete the duplicate profile that isn't linked to auth if it exists
DELETE FROM public.profiles 
WHERE email = 'john.smith@demo.com' 
AND id != '6f90901e-4119-457d-8d73-745b17831a30';

-- 2. Fix Student: student1@demo.com
-- Auth UUID: 404d70d9-451c-4ba5-be3a-9a8929c0f2e8
UPDATE public.students 
SET user_id = '404d70d9-451c-4ba5-be3a-9a8929c0f2e8' 
WHERE email = 'student1@demo.com';

DELETE FROM public.profiles 
WHERE email = 'student1@demo.com' 
AND id != '404d70d9-451c-4ba5-be3a-9a8929c0f2e8';

-- 3. Fix Parent: parent1@demo.com
-- Auth UUID: 3deca03a-6ebd-4732-98fa-5fd2a278d498
UPDATE public.parents 
SET user_id = '3deca03a-6ebd-4732-98fa-5fd2a278d498' 
WHERE email = 'parent1@demo.com';

DELETE FROM public.profiles 
WHERE email = 'parent1@demo.com' 
AND id != '3deca03a-6ebd-4732-98fa-5fd2a278d498';

-- 4. Fix Admin: user@school.com
-- Auth UUID: 014811ea-281f-484e-b039-e37beb8d92b2
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'user@school.com' 
AND id = '014811ea-281f-484e-b039-e37beb8d92b2';

-- 5. Final pass: Ensure all entities have school_generated_id matching their profile
-- This handles synchronization if they were updated separately
UPDATE public.teachers t
SET school_generated_id = p.school_generated_id
FROM public.profiles p
WHERE t.user_id = p.id AND (t.school_generated_id IS NULL OR t.school_generated_id != p.school_generated_id);

UPDATE public.students s
SET school_generated_id = p.school_generated_id
FROM public.profiles p
WHERE s.user_id = p.id AND (s.school_generated_id IS NULL OR s.school_generated_id != p.school_generated_id);

UPDATE public.parents pr
SET school_generated_id = p.school_generated_id
FROM public.profiles p
WHERE pr.user_id = p.id AND (pr.school_generated_id IS NULL OR pr.school_generated_id != p.school_generated_id);

COMMIT;
