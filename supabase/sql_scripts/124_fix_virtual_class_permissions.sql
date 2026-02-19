-- Fix permissions for virtual_class_sessions
GRANT ALL ON TABLE public.virtual_class_sessions TO authenticated;
GRANT ALL ON TABLE public.virtual_class_sessions TO service_role;

-- Re-define INSERT policy to be robust
DROP POLICY IF EXISTS "Teachers can insert sessions" ON public.virtual_class_sessions;

CREATE POLICY "Teachers can insert sessions" ON public.virtual_class_sessions
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = teacher_id
    );

-- Re-define UPDATE policy
DROP POLICY IF EXISTS "Teachers can update own sessions" ON public.virtual_class_sessions;

CREATE POLICY "Teachers can update own sessions" ON public.virtual_class_sessions
    FOR UPDATE TO authenticated
    USING (auth.uid() = teacher_id);

-- Ensure Sequence permissions if any (though UUIDs are used, just in case)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
