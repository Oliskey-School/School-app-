-- Fix "Failed to book appointment" error by ensuring the parent is a school member
-- RLS policy 'appointments_unified' requires 'is_school_member(school_id)'
-- We need to add "Demo Parent" (33333333-3333-3333-3333-333333333333) to 'school_memberships' for school 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'
-- Constraint 'member_public_id_format': ^[A-Z]{3}[A-Z]{3}[0-9]{8}$ (e.g., SCHPAR12345678)

INSERT INTO public.school_memberships (
    school_id,
    user_id,
    base_role,
    is_active,
    member_public_id
)
VALUES (
    'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1', -- School ID
    '33333333-3333-3333-3333-333333333333', -- Demo Parent User ID
    'parent',
    true,
    'SCHPAR99999999' -- Format: 3 chars (SCH) + 3 chars (PAR) + 8 digits
)
ON CONFLICT (school_id, user_id) DO UPDATE
SET is_active = true, base_role = 'parent', member_public_id = 'SCHPAR99999999';
