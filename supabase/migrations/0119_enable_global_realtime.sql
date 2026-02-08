-- Enable Global Real-time Subscriptions
-- Migration: 0119_enable_global_realtime
-- Purpose: Enable Supabase Realtime on all critical tables for end-to-end real-time architecture

-- Add all critical tables to the Realtime publication (only if not already added)
DO $$
BEGIN
    -- Only add tables if they exist and aren't already in the publication
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'assignments') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'assignments') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.assignments;
        END IF;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'students') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'students') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
        END IF;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'teachers') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'teachers') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.teachers;
        END IF;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'classes') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'classes') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.classes;
        END IF;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'attendance') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
        END IF;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
        END IF;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversations') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'conversations') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
        END IF;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notices') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notices') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.notices;
        END IF;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'exams') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'exams') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.exams;
        END IF;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'academic_performance') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'academic_performance') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.academic_performance;
        END IF;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fee_payments') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'fee_payments') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.fee_payments;
        END IF;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'leave_requests') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'leave_requests') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_requests;
        END IF;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lesson_plans') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'lesson_plans') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.lesson_plans;
        END IF;
    END IF;
    
    -- Skip virtual_class_sessions - already added in migration 0117
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'parents') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'parents') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.parents;
        END IF;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'teacher_attendance') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'teacher_attendance') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_attendance;
        END IF;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'announcements') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'announcements') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
        END IF;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'events') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'events') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
        END IF;
    END IF;
END $$;

-- Enable replica identity FULL for efficient Change Data Capture (only for existing tables)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'assignments') THEN
        ALTER TABLE public.assignments REPLICA IDENTITY FULL;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'students') THEN
        ALTER TABLE public.students REPLICA IDENTITY FULL;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'teachers') THEN
        ALTER TABLE public.teachers REPLICA IDENTITY FULL;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'classes') THEN
        ALTER TABLE public.classes REPLICA IDENTITY FULL;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance') THEN
        ALTER TABLE public.attendance REPLICA IDENTITY FULL;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
        ALTER TABLE public.messages REPLICA IDENTITY FULL;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversations') THEN
        ALTER TABLE public.conversations REPLICA IDENTITY FULL;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notices') THEN
        ALTER TABLE public.notices REPLICA IDENTITY FULL;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'exams') THEN
        ALTER TABLE public.exams REPLICA IDENTITY FULL;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'academic_performance') THEN
        ALTER TABLE public.academic_performance REPLICA IDENTITY FULL;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fee_payments') THEN
        ALTER TABLE public.fee_payments REPLICA IDENTITY FULL;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'leave_requests') THEN
        ALTER TABLE public.leave_requests REPLICA IDENTITY FULL;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lesson_plans') THEN
        ALTER TABLE public.lesson_plans REPLICA IDENTITY FULL;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'virtual_class_sessions') THEN
        ALTER TABLE public.virtual_class_sessions REPLICA IDENTITY FULL;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'parents') THEN
        ALTER TABLE public.parents REPLICA IDENTITY FULL;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'teacher_attendance') THEN
        ALTER TABLE public.teacher_attendance REPLICA IDENTITY FULL;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'announcements') THEN
        ALTER TABLE public.announcements REPLICA IDENTITY FULL;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'events') THEN
        ALTER TABLE public.events REPLICA IDENTITY FULL;
    END IF;
END $$;

-- Add comments for debugging (only if tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'assignments') THEN
        COMMENT ON TABLE public.assignments IS 'Realtime enabled for instant assignment updates';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
        COMMENT ON TABLE public.messages IS 'Realtime enabled for instant messaging';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance') THEN
        COMMENT ON TABLE public.attendance IS 'Realtime enabled for live attendance tracking';
    END IF;
END $$;
