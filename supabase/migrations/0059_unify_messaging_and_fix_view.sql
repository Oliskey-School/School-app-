-- 0059_unify_messaging_and_fix_view.sql
-- Goal: Unify messaging tables and fix auth_accounts permissions for demo

BEGIN;

-- 1. FIX AUTH_ACCOUNTS PERMISSIONS
-- Grant select to authenticated users so the list loads in the Admin Dashboard
GRANT SELECT ON public.auth_accounts TO authenticated;
GRANT SELECT ON public.auth_accounts TO anon;

-- 2. UNIFY MESSAGING SCHEMA
-- We have some parts using 'chat_messages' and some using 'messages'.
-- Let's ensure 'messages' is the source of truth and has all required columns.

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID, -- Standardized name
    sender_id UUID REFERENCES auth.users(id),
    content TEXT,
    type TEXT DEFAULT 'text',
    media_url TEXT,
    file_name TEXT,
    file_size INTEGER,
    reply_to_id UUID,
    is_deleted BOOLEAN DEFAULT false,
    is_edited BOOLEAN DEFAULT false,
    school_id UUID REFERENCES public.schools(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see messages from their school
DROP POLICY IF EXISTS "Tenant Isolation Policy" ON public.messages;
CREATE POLICY "Tenant Isolation Policy" ON public.messages 
    FOR ALL 
    USING (school_id = (auth.jwt() ->> 'school_id')::UUID);

-- 3. ENABLE REALTIME FOR MESSAGING
-- Add messages and conversations to publication if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_rel pr 
            JOIN pg_class c ON pr.prrelid = c.oid 
            JOIN pg_publication p ON pr.prpubid = p.oid 
            WHERE p.pubname = 'supabase_realtime' AND c.relname = 'messages'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
        END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_rel pr 
            JOIN pg_class c ON pr.prrelid = c.oid 
            JOIN pg_publication p ON pr.prpubid = p.oid 
            WHERE p.pubname = 'supabase_realtime' AND c.relname = 'conversations'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
        END IF;
    END IF;
END $$;

-- 4. FIX get_my_school_id() 
-- Ensure it's robust and used consistently
CREATE OR REPLACE FUNCTION get_my_school_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        (auth.jwt() ->> 'school_id')::UUID,
        (SELECT school_id FROM public.users WHERE id = auth.uid())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMIT;
