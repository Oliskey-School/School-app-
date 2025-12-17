-- Enable Realtime for key tables safely
-- This allows the frontend to receive instant updates when data changes

DO $$
DECLARE
    -- List of tables to enable realtime for
    tables_to_enable text[] := ARRAY[
        'students', 
        'teachers', 
        'classes', 
        'notices', 
        'assignments', 
        'student_attendance', 
        'report_cards',
        'timetable'
    ];
    tbl text;
BEGIN
    FOR tbl IN SELECT unnest(tables_to_enable) LOOP
        BEGIN
            EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE ' || quote_ident(tbl);
            RAISE NOTICE 'Added % to supabase_realtime', tbl;
        EXCEPTION WHEN duplicate_object THEN
            -- SQL State 42710: relation is already member of publication
            RAISE NOTICE '% is already in supabase_realtime', tbl;
        END;
    END LOOP;
END $$;
