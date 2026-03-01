-- ==========================================
-- HIGH PERFORMANCE DATABASE INDEXES
-- ==========================================
-- This migration ensures ultra-fast database reads 
-- by indexing the most commonly queried foreign keys
-- and filter columns.

DO $$
DECLARE
    t_name text;
    col_name text;
    idx_name text;
    tables_to_index jsonb := '{
        "profiles": ["user_id", "school_id", "role"],
        "students": ["user_id", "school_id", "branch_id", "current_class_id"],
        "teachers": ["user_id", "school_id"],
        "parents": ["user_id", "school_id"],
        "classes": ["school_id", "branch_id"],
        "subjects": ["school_id"],
        "quizzes": ["school_id", "teacher_id", "class_id"],
        "quiz_submissions": ["quiz_id", "student_id", "school_id"],
        "assignments": ["school_id", "class_id"],
        "cbt_exams": ["school_id", "class_id"],
        "cbt_results": ["exam_id", "student_id"],
        "student_attendance": ["student_id", "date"],
        "academic_performance": ["student_id", "school_id"]
    }';
    t_key text;
    cols text[];
BEGIN
    FOR t_key, cols IN SELECT key, value FROM jsonb_each(tables_to_index)
    LOOP
        -- Check if table exists
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = t_key) THEN
            FOR i IN 0 .. jsonb_array_length(to_jsonb(cols)) - 1 LOOP
                col_name := cols->>i;
                
                -- Check if column exists
                IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t_key AND column_name = col_name) THEN
                    idx_name := 'idx_' || t_key || '_' || col_name;
                    
                    -- Create index if it does not exist
                    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = idx_name AND n.nspname = 'public') THEN
                        EXECUTE format('CREATE INDEX %I ON public.%I (%I)', idx_name, t_key, col_name);
                        RAISE NOTICE 'Created index % on %.%', idx_name, t_key, col_name;
                    END IF;
                END IF;
            END LOOP;
        END IF;
    END LOOP;
END $$;