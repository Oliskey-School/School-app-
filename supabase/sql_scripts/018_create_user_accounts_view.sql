BEGIN;

-- 1. Add is_active column to users if not exists first
-- This must exist before the view can reference it
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Create View for User Accounts
-- This view maps the internal 'users' table to the frontend 'auth_accounts' expectation
-- and relies on the underlying RLS of the 'users' table for security.

CREATE OR REPLACE VIEW auth_accounts AS
SELECT
    u.id,
    u.email as username, -- Mapping email to username for display
    u.role as user_type,
    u.email,
    u.id as user_id,
    u.created_at,
    u.is_active, 
    u.full_name as name,
    u.school_id
FROM
    public.users u;

-- 3. Ensure RLS is active on this view (Inherited from users)

COMMIT;
