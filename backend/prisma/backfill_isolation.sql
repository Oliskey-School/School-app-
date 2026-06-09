
-- Backfill script for Multi-Tenant Isolation
-- Sets missing school_id and branch_id to defaults where they are NULL

DO $$
DECLARE
    r RECORD;
    demo_school_id CONSTANT text := 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
BEGIN
    FOR r IN (
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'school_id' 
        AND table_schema = 'public'
    ) LOOP
        EXECUTE format('UPDATE %I SET school_id = %L WHERE school_id IS NULL', r.table_name, demo_school_id);
    END LOOP;
END $$;
