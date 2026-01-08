-- Fix for Error 42804: structure of query does not match function result type
-- Specifically, auth.users.email is VARCHAR(255) but we promised TEXT.

DROP FUNCTION IF EXISTS authenticate_user(text, text);

CREATE OR REPLACE FUNCTION authenticate_user(
  username_input TEXT,
  password_input TEXT
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  role TEXT,
  name TEXT,
  user_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    au.id,
    au.email::text, -- Explicit cast to TEXT to avoid type mismatch
    (au.raw_user_meta_data->>'role')::text,
    (au.raw_user_meta_data->>'full_name')::text,
    au.id
  FROM auth.users au
  WHERE (
    lower(au.email) = lower(username_input)
    OR 
    lower(au.raw_user_meta_data->>'username') = lower(username_input)
  )
  AND (
    au.encrypted_password = crypt(password_input, au.encrypted_password)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION authenticate_user(text, text) TO anon, authenticated, service_role;
