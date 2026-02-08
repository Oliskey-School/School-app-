-- Migration: 0125 Sync Missing Parents
-- Description: Inserts parent profiles into the parents table if they are missing.
-- This fixes the issue where "Demo Parent" and other users exist in profiles but not in the parents table,
-- causing them to be missing from the Manage Parents screen and Dashboard counts.

BEGIN;

INSERT INTO public.parents (
    school_id,
    user_id,
    name,
    email,
    phone,
    created_at,
    updated_at,
    avatar_url
)
SELECT
    p.school_id,
    p.id, -- user_id in parents table links to profiles.id
    p.full_name,
    p.email,
    p.phone_number,
    p.created_at,
    p.updated_at,
    p.avatar_url
FROM public.profiles p
WHERE p.role = 'parent'
AND p.school_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM public.parents par
    WHERE par.user_id = p.id
);

-- Log the operation
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Synced % missing parents from profiles to parents table.', v_count;
END $$;

COMMIT;
