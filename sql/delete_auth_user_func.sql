
-- Function to delete a user from Supabase Auth by email
-- This allows the Admin client to clean up the Auth list when deleting a student/parent.

CREATE OR REPLACE FUNCTION delete_auth_user_by_email(email_input TEXT)
RETURNS VOID AS $$
BEGIN
  -- Delete from auth.users. This usually cascades to other auth tables.
  DELETE FROM auth.users WHERE email = email_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant functionality to authenticated users (so the Admin logged in can use it)
GRANT EXECUTE ON FUNCTION delete_auth_user_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_auth_user_by_email(TEXT) TO service_role;
