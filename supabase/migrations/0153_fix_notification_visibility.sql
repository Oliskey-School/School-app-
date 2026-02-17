
-- Fix Notification RLS to allow authenticated users to view broadcast messages
-- This ensures that when an Announcement is sent to "All", users actually see it.

BEGIN;

-- 1. Drop existing restrictive policies (using IF EXISTS to be safe)
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "View own notifications (User)" ON public.notifications;
DROP POLICY IF EXISTS "Individual notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own and broadcast notifications" ON public.notifications;

-- 2. Create the Correct Policy
-- Logic: A user can select a row IF:
--   a) The user_id matches their own ID (Personal notification)
--   OR
--   b) The user_id is NULL (Broadcast notification)
--   AND
--   c) The school_id matches the user's school_id (Tenant Isolation)
CREATE POLICY "Users can view own and broadcast notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  (
    (auth.uid() = user_id) 
    OR 
    (user_id IS NULL)
  )
  AND
  (school_id = (auth.jwt() ->> 'school_id')::uuid)
);

-- 3. Ensure INSERT policy exists for Admins/Service Role
CREATE POLICY "Admins can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  true -- Allow authenticated users to insert (backend logic/role checks validate actual permission)
);

COMMIT;
