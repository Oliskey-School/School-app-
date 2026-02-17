-- Enable REPLICA IDENTITY FULL for tables involved in Realtime Sync
-- This allows Supabase to include the previous values for UPDATE and DELETE events,
-- which is critical for delta syncing and conflict resolution.

BEGIN;

ALTER TABLE public.students REPLICA IDENTITY FULL;
ALTER TABLE public.teachers REPLICA IDENTITY FULL;
ALTER TABLE public.parents REPLICA IDENTITY FULL;
ALTER TABLE public.classes REPLICA IDENTITY FULL;
ALTER TABLE public.subjects REPLICA IDENTITY FULL;
ALTER TABLE public.timetable REPLICA IDENTITY FULL;
ALTER TABLE public.assignments REPLICA IDENTITY FULL;
ALTER TABLE public.grades REPLICA IDENTITY FULL;
ALTER TABLE public.attendance_records REPLICA IDENTITY FULL;
ALTER TABLE public.notices REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.users REPLICA IDENTITY FULL;
ALTER TABLE public.schools REPLICA IDENTITY FULL;
ALTER TABLE public.branches REPLICA IDENTITY FULL;

COMMIT;
