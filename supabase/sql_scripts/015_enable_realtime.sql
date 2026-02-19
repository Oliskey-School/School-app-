-- Enable Realtime for all tables safely
-- This script checks if tables are already in the publication to avoid "already member" errors.

DO $$
DECLARE
    -- List of tables to enable realtime for
    tables text[] := ARRAY[
        'classes', 
        'students', 
        'teachers', 
        'parents', 
        'subjects', 
        'timetable', 
        'student_attendance', 
        'assignments'
    ];
    tbl text;
BEGIN
    -- Loop through each table
    FOREACH tbl IN ARRAY tables
    LOOP
        -- Check if table exists in public schema first
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            
            -- Check if NOT already in the publication
            IF NOT EXISTS (
                SELECT 1 
                FROM pg_publication_rel pr
                JOIN pg_class c ON pr.prrelid = c.oid
                JOIN pg_namespace n ON c.relnamespace = n.oid
                JOIN pg_publication p ON pr.prpubid = p.oid
                WHERE p.pubname = 'supabase_realtime' 
                AND n.nspname = 'public' 
                AND c.relname = tbl
            ) THEN
                -- Add to publication
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
                RAISE NOTICE 'Added % to supabase_realtime', tbl;
            ELSE
                RAISE NOTICE '% is already in supabase_realtime', tbl;
            END IF;
            
        else
             RAISE NOTICE 'Table % does not exist, skipping realtime setup', tbl;
        END IF;
    END LOOP;
END $$;
