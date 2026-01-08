-- 1. DROP the broken function (signatures might vary, so we drop potential variants)
DROP FUNCTION IF EXISTS authenticate_user(text, text);

-- 2. CREATE a robust version that queries auth.users directly
-- This works for both Email and Username login
-- It verifies the password against Supabase's encrypted storage

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
    au.email,
    (au.raw_user_meta_data->>'role')::text as role,
    (au.raw_user_meta_data->>'full_name')::text as name,
    au.id as user_id
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

-- 3. Grant access to public (so the API can call it)
GRANT EXECUTE ON FUNCTION authenticate_user(text, text) TO anon, authenticated, service_role;
