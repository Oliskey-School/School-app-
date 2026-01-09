
-- Create AI Cache Table for storing question/answer pairs
CREATE TABLE IF NOT EXISTS public.ai_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    query_hash TEXT NOT NULL,          -- Hashed question + context for quick lookup
    query_text TEXT,                   -- Original question text (for debugging)
    response_json JSONB NOT NULL,      -- The full JSON response from AI
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'), -- configurable TTL
    UNIQUE(query_hash)
);

-- Enable RLS on cache (though backend usually uses service role)
ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users (so they can hit cache if needed directly, though API proxy is preferred)
CREATE POLICY "Authenticated users can read cache" 
ON public.ai_cache FOR SELECT 
USING (auth.role() = 'authenticated');

-- Create School Docs table for RAG
CREATE TABLE IF NOT EXISTS public.school_docs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    keywords TEXT[], -- simple keyword array for basic matching
    category TEXT,   -- e.g., 'curriculum', 'policy', 'schedule'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on docs
ALTER TABLE public.school_docs ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "Authenticated users can read docs" 
ON public.school_docs FOR SELECT 
USING (auth.role() = 'authenticated');

-- Insert some initial dummy RAG data
INSERT INTO public.school_docs (title, content, keywords, category)
VALUES 
('School Policy', 'School starts at 8:00 AM and ends at 3:00 PM. Uniforms are mandatory.', ARRAY['time', 'uniform', 'policy'], 'policy'),
('Grading System', 'A is 70-100, B is 60-69, C is 50-59, F is below 50.', ARRAY['grade', 'score', 'exam'], 'curriculum'),
('JSS1 Curriculum', 'JSS1 students learn Basic Science, Math, and English.', ARRAY['jss1', 'science', 'math'], 'curriculum');
