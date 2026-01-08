
import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { AIService } from '../../services/ai.service';
import crypto from 'crypto';

// Use process env which will be loaded in server.ts
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || '';

const aiService = new AIService(GEMINI_API_KEY);

// System Prompt Template
const SYSTEM_PROMPT = `You are a helpful, concise school assistant designed to minimize token usage while giving accurate, grade-appropriate answers. Follow these rules exactly:

1. Brevity first. Default to a one-paragraph answer (≤ 120 words) or ≤ 150 tokens.
2. Structured JSON output. Always respond in this exact JSON structure:
{
  "answer": "<short, direct answer>",
  "summary": "<2-sentence summary if needed or empty string>",
  "sources": ["<id1>", "<id2>"], 
  "tokens_estimate": <integer>, 
  "cached": <true|false>,
  "image_needed": <true|false>,
  "image_instructions": "<if image_needed true, 1-line description else empty>"
}
3. Stop early. Respect the stop sequence ###END###.
4. Be concise with context. Use provided snippets.
5. Image policy: Never generate an image unless image_needed is true.
6. Model tone: Low creativity (temp <= 0.3).
`;

export const generateResponse = async (req: Request, res: Response) => {
    try {
        const { question, options } = req.body;
        const userAuthToken = req.headers.authorization;

        if (!question) {
            return res.status(400).json({ message: 'Question is required' });
        }

        // 1. Create Supabase Client with User Context (for RLS)
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: userAuthToken || '' } }
        });

        // 2. Check Cache
        // Create a hash of the question + options
        const queryHash = crypto.createHash('sha256').update(question + JSON.stringify(options || {})).digest('hex');

        // Allow ignoring cache error if table doesn't exist
        const { data: cachedData, error: cacheError } = await supabase
            .from('ai_cache')
            .select('*')
            .eq('query_hash', queryHash)
            .maybeSingle();

        if (cachedData && !cacheError) {
            // Return Cached Response
            // cachedData.response_json is likely already an object if column is JSONB
            const response = cachedData.response_json;
            response.cached = true;
            return res.json(response);
        }

        // 3. Simple RAG (Retrieve Context)
        // Split question into keywords
        const keywords = question.toLowerCase().split(' ').filter((w: string) => w.length > 3);
        let contextSnippets = "";
        let docIds: string[] = [];

        if (keywords.length > 0) {
            // This is a naive keyword search. ideally use pgvector or textSearch
            const { data: docs } = await supabase
                .from('school_docs')
                .select('id, title, content')
                .textSearch('content', keywords.join(' | ')) // Or simple ilike if textSearch not enabled
                .limit(3);

            if (docs && docs.length > 0) {
                contextSnippets = docs.map((d: any, i: number) => `${i + 1}) ${d.title}::${d.content.substring(0, 200)}...`).join('\n');
                docIds = docs.map((d: any) => d.id);
            }
        }

        // 4. Construct Prompt
        const finalPrompt = `
QUESTION: ${question}

CONTEXT_SNIPPETS:
${contextSnippets || "No specific school context found."}

USER_PREFERENCES:
- image_needed: ${options?.image_needed || false}
`;

        // 5. Generate with AI
        const aiResponseText = await aiService.generateContent(finalPrompt, SYSTEM_PROMPT);

        let aiResponseJson;
        try {
            // Clean markdown code blocks if present
            const cleanedText = aiResponseText.replace(/```json/g, '').replace(/```/g, '').trim();
            aiResponseJson = JSON.parse(cleanedText);
        } catch (e) {
            console.error("AI returned invalid JSON:", aiResponseText);
            // Fallback
            aiResponseJson = {
                answer: aiResponseText,
                summary: "Standard text response",
                sources: [],
                tokens_estimate: 0,
                cached: false,
                image_needed: false,
                image_instructions: ""
            };
        }

        // Add metadata
        aiResponseJson.sources = [...(aiResponseJson.sources || []), ...docIds];
        aiResponseJson.cached = false;

        // 6. Save to Cache (Fire and forget to avoid delaying response)
        // If table doesn't exist, this will fail silently in catch block usually, we should handle it
        supabase.from('ai_cache').insert({
            query_hash: queryHash,
            query_text: question,
            response_json: aiResponseJson
        }).then(({ error }) => {
            if (error) console.warn("Failed to cache AI response:", error.message);
        });

        return res.json(aiResponseJson);

    } catch (error: any) {
        console.error("Controller Error:", error);
        return res.status(500).json({ message: 'Internal AI Error', error: error.message });
    }
};
