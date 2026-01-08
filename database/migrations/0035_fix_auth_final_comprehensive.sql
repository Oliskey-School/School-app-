-- COMPREHENSIVE AUTH FIX
-- This script fixes the "Error 42804" (Type Mismatch) by recreating the login function
-- with correct Type Casting (VARCHAR -> TEXT).

-- 1. Drop the broken function signature
DROP FUNCTION IF EXISTS authenticate_user(text, text);

-- 2. Create the robust function
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
  -- We use explicit casting (::text) to ensure PostgreSQL doesn't complain
  RETURN QUERY
  SELECT
    au.id,
    au.email::text,
    (au.raw_user_meta_data->>'role')::text,
    (au.raw_user_meta_data->>'full_name')::text,
    au.id
  FROM auth.users au
  WHERE (
    -- Case-insensitive match for Email
    lower(au.email) = lower(username_input)
    OR 
    -- Case-insensitive match for Username (stored in metadata)
    lower(au.raw_user_meta_data->>'username') = lower(username_input)
  )
  AND (
    -- Secure password check
    au.encrypted_password = crypt(password_input, au.encrypted_password)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure permissions are granted so the Frontend can call it
GRANT EXECUTE ON FUNCTION authenticate_user(text, text) TO anon, authenticated, service_role;

-- 4. Comment to confirm application
COMMENT ON FUNCTION authenticate_user IS 'Fixed version with correct TEXT return types';
