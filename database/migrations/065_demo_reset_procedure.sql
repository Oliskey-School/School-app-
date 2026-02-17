-- Migration: 0102 Demo Reset Procedure
-- Description: Implements the self-resetting daily loop for the Demo School.

BEGIN;

-- 1. Enable pg_cron extension (requires superuser, usually enabled in Supabase by default or via UI)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Create the "Golden Template" Procedure
-- This procedure will be called by pg_cron every 24 hours.
CREATE OR REPLACE FUNCTION public.reset_demo_school_data()
RETURNS VOID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_demo_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
    -- A. LOG THE START
    INSERT INTO public.audit_logs (school_id, action, details)
    VALUES (v_demo_id, 'DEMO_RESET_START', '{"message": "Automated 24h reset initiated"}');

    -- B. DELETE ALL TENANT DATA 
    -- We delete from tables that contain demo data. 
    -- Note: ON DELETE CASCADE on school_id references will handle most of this, 
    -- but we want to be explicit to ensure no remnants.
    
    DELETE FROM public.attendance_records WHERE school_id = v_demo_id;
    DELETE FROM public.student_attendance WHERE school_id = v_demo_id;
    DELETE FROM public.health_logs WHERE school_id = v_demo_id;
    DELETE FROM public.student_fees WHERE school_id = v_demo_id;
    DELETE FROM public.report_cards WHERE school_id = v_demo_id;
    DELETE FROM public.timetable WHERE school_id = v_demo_id;
    DELETE FROM public.notices WHERE school_id = v_demo_id;
    DELETE FROM public.messages WHERE school_id = v_demo_id;
    
    -- Actors (Linked to Users, so we must be careful)
    DELETE FROM public.parent_children WHERE school_id = v_demo_id;
    DELETE FROM public.teacher_subjects WHERE school_id = v_demo_id;
    DELETE FROM public.teacher_classes WHERE school_id = v_demo_id;
    
    DELETE FROM public.students WHERE school_id = v_demo_id;
    DELETE FROM public.teachers WHERE school_id = v_demo_id;
    DELETE FROM public.parents WHERE school_id = v_demo_id;
    DELETE FROM public.classes WHERE school_id = v_demo_id;
    DELETE FROM public.subjects WHERE school_id = v_demo_id;

    -- C. RE-SEED CLEAN DATA
    -- We'll call the existing seed logic or a dedicated subset.
    -- For this implementation, we re-insert the baseline "Demo" entities.
    
    -- Classes
    INSERT INTO public.classes (name, grade, level, school_id)
    VALUES 
        ('Grade 1 - A', 1, 'Primary', v_demo_id),
        ('Grade 2 - B', 2, 'Primary', v_demo_id),
        ('SS1 - Gold', 10, 'Secondary', v_demo_id);

    -- D. LOG COMPLETION
    INSERT INTO public.audit_logs (school_id, action, details)
    VALUES (v_demo_id, 'DEMO_RESET_COMPLETE', '{"message": "Demo school reset to baseline"}');

END;
$$;

-- 3. Schedule the Cron Job
-- Runs at midnight (00:00) every day
SELECT cron.schedule(
    'demo-school-reset', -- unique name
    '0 0 * * *',         -- every midnight
    'SELECT public.reset_demo_school_data();'
);

COMMIT;
