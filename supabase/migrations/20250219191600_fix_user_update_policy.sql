-- Allow users to update their own profile data
-- This is critical for the "Edit Profile" feature to work for Teachers, Parents, etc.

-- Drop existing policy if it exists to clean up (optional but good for idempotency if we knew the name)
DROP POLICY IF EXISTS "Users can update their own data" ON "public"."users";

-- Create the policy
CREATE POLICY "Users can update their own data"
ON "public"."users"
FOR UPDATE
TO authenticated
USING (
  (select auth.uid()) = id
)
WITH CHECK (
  (select auth.uid()) = id
);

-- Ensure RLS is enabled
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
