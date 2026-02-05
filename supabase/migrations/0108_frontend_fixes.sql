BEGIN;

-- 1. Schools Table RLS
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own school
DROP POLICY IF EXISTS "Users can read own school" ON public.schools;
CREATE POLICY "Users can read own school" ON public.schools
    FOR SELECT
    USING (
        id = (auth.jwt() ->> 'school_id')::uuid
        OR
        id = '00000000-0000-0000-0000-000000000000' -- Always allow reading Demo School
        OR
        auth.role() = 'service_role'
    );

-- 2. Update authenticate_user RPC to return school_generated_id
DROP FUNCTION IF EXISTS public.authenticate_user(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.authenticate_user(username_input TEXT, password_input TEXT)
RETURNS TABLE (
    id UUID,
    email TEXT,
    role TEXT,
    school_id UUID,
    user_id UUID,
    school_generated_id TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.user_id as id,
        a.email,
        lower(a.user_type) as role,
        a.school_id,
        a.user_id,
        p.school_generated_id
    FROM public.auth_accounts a
    LEFT JOIN public.profiles p ON p.id = a.user_id
    WHERE lower(a.username) = lower(username_input)
      AND a.password = password_input
      AND a.is_active = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.authenticate_user(TEXT, TEXT) TO anon, authenticated, service_role;

COMMIT;