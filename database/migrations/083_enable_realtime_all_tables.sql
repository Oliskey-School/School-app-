-- Enable Real-time on ALL Remaining Tables
-- Migration: 0120_enable_realtime_all_tables
-- Purpose: Enable Supabase Realtime on all remaining database tables for comprehensive real-time architecture

-- Add all remaining tables to the Realtime publication
DO $$
DECLARE
    table_record RECORD;
BEGIN
    -- Get all public tables NOT already in the publication
    FOR table_record IN 
        SELECT tablename
        FROM pg_tables t
        WHERE t.schemaname = 'public'
        AND NOT EXISTS (
            SELECT 1 FROM pg_publication_tables pt
            WHERE pt.pubname = 'supabase_realtime'
            AND pt.tablename = t.tablename
        )
        ORDER BY tablename
    LOOP
        -- Add each table to the publication
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_record.tablename);
        
        -- Set replica identity FULL for efficient Change Data Capture
        EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', table_record.tablename);
        
        RAISE NOTICE 'Added table %% to real-time publication', table_record.tablename;
    END LOOP;
    
    RAISE NOTICE 'Real-time enabled on all remaining tables';
END $$;

-- Verify the count
DO $$
DECLARE
    v_total_count integer;
BEGIN
    SELECT COUNT(*) INTO v_total_count
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime';
    
    RAISE NOTICE 'Total tables in real-time publication: %', v_total_count;
END $$;
