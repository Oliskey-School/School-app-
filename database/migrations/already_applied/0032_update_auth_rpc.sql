-- Update verify_credentials/authenticate_user to search by Email OR Username
-- We must DROP the function first because we are changing the return signature/logic significantly
-- and Postgres doesn't allow changing return types with just REPLACE in some versions.

DROP FUNCTION IF EXISTS authenticate_user(text, text);

CREATE OR REPLACE FUNCTION authenticate_user(
  username_input TEXT,
  password_input TEXT
)
RETURNS TABLE (
  id BIGINT,
  email TEXT,
  role TEXT,
  name TEXT,
  user_id BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.email,
    a.user_type AS role,
    u.name,
    a.user_id
  FROM auth_accounts a
  LEFT JOIN users u ON a.user_id = u.id
  WHERE (
    lower(a.username) = lower(username_input) 
    OR 
    lower(a.email) = lower(username_input)
  )
  AND a.password = password_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
