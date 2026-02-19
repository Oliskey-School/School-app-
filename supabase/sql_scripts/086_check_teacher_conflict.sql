-- Migration: 0123_check_teacher_conflict
-- Purpose: Backend logic to detect if a teacher is double-booked in another class at a specific time.

-- Clean up any ambiguous existing versions
DROP TRIGGER IF EXISTS enforce_teacher_conflict ON public.timetable;
DROP FUNCTION IF EXISTS public.check_teacher_conflict();
DROP FUNCTION IF EXISTS public.check_teacher_conflict(uuid, text, time, time, text);

-- 1. Create the RPC function (Returns JSONB for UI validation)
CREATE OR REPLACE FUNCTION public.check_teacher_conflict(
    p_teacher_id UUID,
    p_day TEXT,
    p_start_time TIME,
    p_end_time TIME,
    p_exclude_class_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_conflict_class TEXT;
    v_conflict_subject TEXT;
BEGIN
    SELECT class_name, subject
    INTO v_conflict_class, v_conflict_subject
    FROM public.timetable
    WHERE teacher_id = p_teacher_id
      AND day = p_day
      AND (p_exclude_class_name IS NULL OR class_name != p_exclude_class_name)
      AND start_time < p_end_time
      AND end_time > p_start_time
    LIMIT 1;

    IF v_conflict_class IS NOT NULL THEN
        RETURN jsonb_build_object(
            'conflict', true,
            'class_name', v_conflict_class,
            'subject', v_conflict_subject,
            'message', format('Conflict: Teacher is already teaching %s in %s at this time.', v_conflict_subject, v_conflict_class)
        );
    ELSE
        RETURN jsonb_build_object('conflict', false);
    END IF;
END;
$$;

-- 2. Create the Trigger Function (Proper Trigger Signature for Database Integrity)
CREATE OR REPLACE FUNCTION public.fn_enforce_teacher_conflict()
RETURNS TRIGGER AS $$
DECLARE
    v_conflict_class TEXT;
    v_conflict_subject TEXT;
BEGIN
    IF NEW.teacher_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT class_name, subject
    INTO v_conflict_class, v_conflict_subject
    FROM public.timetable
    WHERE teacher_id = NEW.teacher_id
      AND day = NEW.day
      AND id != NEW.id
      AND start_time < NEW.end_time
      AND end_time > NEW.start_time
    LIMIT 1;

    IF v_conflict_class IS NOT NULL THEN
        RAISE EXCEPTION 'Teacher Conflict: Teacher is already teaching % in % at this time.', v_conflict_subject, v_conflict_class;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Attach the trigger
CREATE TRIGGER enforce_teacher_conflict
BEFORE INSERT OR UPDATE ON public.timetable
FOR EACH ROW
EXECUTE FUNCTION fn_enforce_teacher_conflict();

COMMENT ON FUNCTION public.check_teacher_conflict IS 'Checks for teacher double-booking overlaps across classes for UI validation.';
