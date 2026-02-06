-- Ensure Demo Teacher exists in teachers table
INSERT INTO public.teachers (id, user_id, school_id, email, name, subject_specialization, status)
SELECT
    gen_random_uuid(),
    id,
    school_id,
    email,
    full_name,
    'General',
    'Active'
FROM public.profiles
WHERE email = 'teacher@demo.com'
AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE email = 'teacher@demo.com');

-- Force sync Demo Teacher's School ID to match Demo Admin's School ID
-- This ensures they appear in the Admin's list
UPDATE public.teachers
SET school_id = (
    SELECT school_id 
    FROM public.profiles 
    WHERE email = 'admin@demo.com' 
    LIMIT 1
)
WHERE email = 'teacher@demo.com';

-- Also ensure the profile itself is synced if needed (optional but good for consistency)
UPDATE public.profiles
SET school_id = (
    SELECT school_id 
    FROM public.profiles 
    WHERE email = 'admin@demo.com' 
    LIMIT 1
)
WHERE email = 'teacher@demo.com';
