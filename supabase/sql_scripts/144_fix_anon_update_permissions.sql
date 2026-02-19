
-- Fix Anon Permissions - Add UPDATE/DELETE
-- Context: Demo user session is lost (anon), so we need to allow anon to Update/Delete as well.

BEGIN;

-- 1. Grant UPDATE/DELETE to anon for relevant tables
GRANT UPDATE, DELETE ON TABLE public.teachers TO anon;
GRANT UPDATE, DELETE ON TABLE public.students TO anon;
GRANT UPDATE, DELETE ON TABLE public.parents TO anon;
GRANT UPDATE, DELETE ON TABLE public.users TO anon; 

-- 2. Update RLS Policies to allow anon for ALL operations 
-- (Already done in previous step, but re-verifying coverage)
-- "teachers_write_policy" was defined as FOR ALL TO authenticated, anon.
-- So the Policy check should pass. The missing link was the Table Grant.

COMMIT;
