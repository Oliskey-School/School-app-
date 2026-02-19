-- Migration: Update User Role Constraint
-- Description: Adds 'inspector', 'examofficer', and 'complianceofficer' to the allowed roles.

BEGIN;

-- 1. Drop existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- 2. Re-create constraint with new roles allowed
ALTER TABLE users ADD CONSTRAINT users_role_check
CHECK (role IN (
    'super_admin', 
    'proprietor', 
    'admin', 
    'teacher', 
    'student', 
    'parent', 
    'bursar',
    'inspector', 
    'examofficer', 
    'complianceofficer'
));

COMMIT;
