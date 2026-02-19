
-- Fix Attendance Triggers and Users RLS
-- 1. Update force_demo_school_id to use the CORRECT demo school ID
-- 2. Add RLS policy for public.users so it's not invisible

BEGIN;

-- 1. Fix the trigger function
CREATE OR REPLACE FUNCTION public.force_demo_school_id()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF public.is_demo_user(auth.uid()) THEN
    -- Update to the ACTUAL Demo School ID used in this environment
    NEW.school_id := 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'; 
  END IF;
  RETURN NEW;
END;
$function$;

-- 2. Allow SELECT on public.users (Fix opacity)
-- Ensure RLS is enabled (it was true in checks)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing if any (none found earlier, but for safety)
DROP POLICY IF EXISTS "users_select_policy" ON public.users;

-- Create permissive select policy
CREATE POLICY "users_select_policy" ON public.users
FOR SELECT
TO authenticated, anon
USING (true); -- Allow reading all users (directory view), or restrict to school_id if strictness required.
-- For demo portal, open is safer to avoid visibility lags.

-- 3. Grant permissions just in case
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;

COMMIT;
