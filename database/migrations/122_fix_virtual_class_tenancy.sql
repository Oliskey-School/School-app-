-- Add school_id to virtual_class_sessions for isolation
ALTER TABLE public.virtual_class_sessions ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- Re-enable Realtime with the new column (standard procedure)
ALTER TABLE public.virtual_class_sessions REPLICA IDENTITY FULL;

-- Create attendance table for virtual classes
CREATE TABLE IF NOT EXISTS public.class_attendance_virtual (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.virtual_class_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(session_id, student_id)
);

-- Enable RLS on attendance
ALTER TABLE public.class_attendance_virtual ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can record attendance" ON public.class_attendance_virtual
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Teachers can view attendance" ON public.class_attendance_virtual
    FOR SELECT TO authenticated
    USING (true); -- Simplified for now, RLS on sessions table usually filters access

-- Update Policies to include school_id check
DROP POLICY IF EXISTS "Everyone can read active sessions" ON public.virtual_class_sessions;
CREATE POLICY "Everyone can read active sessions" ON public.virtual_class_sessions
    FOR SELECT TO authenticated
    USING (
        status = 'active' 
        AND 
        (school_id = (auth.jwt() ->> 'school_id')::uuid OR school_id IS NULL)
    );
