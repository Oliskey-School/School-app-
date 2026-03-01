-- Create Forum Topics and Posts Tables
-- Migration: 20260227180000_create_forum_tables.sql

-- 1. Create forum_topics table
CREATE TABLE IF NOT EXISTS public.forum_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.school_branches(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    author_name TEXT,
    category TEXT,
    post_count INTEGER DEFAULT 0,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create forum_posts table
CREATE TABLE IF NOT EXISTS public.forum_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.school_branches(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES public.forum_topics(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    author_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create RPC to increment post count
CREATE OR REPLACE FUNCTION public.increment_forum_post_count(p_topic_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.forum_topics
    SET post_count = post_count + 1,
        last_activity = NOW()
    WHERE id = p_topic_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Enable RLS
ALTER TABLE public.forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;

-- 5. Policies for forum_topics
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "School isolation for forum_topics" ON public.forum_topics;
    CREATE POLICY "School isolation for forum_topics" ON public.forum_topics
        FOR ALL USING (
            school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())
            OR 
            school_id = (auth.jwt() -> 'user_metadata' ->> 'school_id')::uuid
        );
EXCEPTION
    WHEN undefined_column THEN
        -- Handle cases where auth.uid() or jwt() is not available in some contexts
        NULL;
END $$;

-- 6. Policies for forum_posts
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "School isolation for forum_posts" ON public.forum_posts;
    CREATE POLICY "School isolation for forum_posts" ON public.forum_posts
        FOR ALL USING (
            school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())
            OR 
            school_id = (auth.jwt() -> 'user_metadata' ->> 'school_id')::uuid
        );
EXCEPTION
    WHEN undefined_column THEN
        NULL;
END $$;
