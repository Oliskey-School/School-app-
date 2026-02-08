-- Create table for tracking active virtual class sessions
CREATE TABLE IF NOT EXISTS public.virtual_class_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID NOT NULL REFERENCES auth.users(id),
    class_id UUID, -- Can be nullable if it's a general meeting, or link to classes table if strictly academic
    subject TEXT NOT NULL,
    topic TEXT,
    start_time TIMESTAMPTZ DEFAULT now(),
    end_time TIMESTAMPTZ,
    status TEXT DEFAULT 'active', -- active, ended
    meeting_link TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Realtime (only if not already added)
DO $$
BEGIN
    -- Check if virtual_class_sessions is already in the publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'virtual_class_sessions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.virtual_class_sessions;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.virtual_class_sessions ENABLE ROW LEVEL SECURITY;

-- Policies
-- Teachers can insert their own sessions
DROP POLICY IF EXISTS "Teachers can insert sessions" ON public.virtual_class_sessions;
CREATE POLICY "Teachers can insert sessions" ON public.virtual_class_sessions
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = teacher_id);

-- Teachers can update their own sessions (to end them)
DROP POLICY IF EXISTS "Teachers can update own sessions" ON public.virtual_class_sessions;
CREATE POLICY "Teachers can update own sessions" ON public.virtual_class_sessions
    FOR UPDATE TO authenticated
    USING (auth.uid() = teacher_id);

-- Everyone (Students) can read active sessions
DROP POLICY IF EXISTS "Everyone can read active sessions" ON public.virtual_class_sessions;
CREATE POLICY "Everyone can read active sessions" ON public.virtual_class_sessions
    FOR SELECT TO authenticated
    USING (status = 'active');
