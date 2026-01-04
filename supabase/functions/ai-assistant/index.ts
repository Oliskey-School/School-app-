import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Verify authentication
        const authHeader = req.headers.get('Authorization')!
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Parse request body
        const { prompt, model, systemPrompt, maxTokens = 1000 } = await req.json()

        if (!prompt) {
            return new Response(
                JSON.stringify({ error: 'Prompt is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Get API keys from environment (secure server-side)
        const openaiKey = Deno.env.get('OPENAI_API_KEY')
        const geminiKey = Deno.env.get('GEMINI_API_KEY')

        let response

        // Use OpenAI if available and requested
        if ((model === 'gpt-4' || model === 'gpt-3.5-turbo' || !model) && openaiKey) {
            const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openaiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: model || 'gpt-3.5-turbo',
                    messages: [
                        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: maxTokens,
                    temperature: 0.7,
                }),
            })

            const data = await openaiResponse.json()

            if (data.error) {
                throw new Error(data.error.message)
            }

            response = data.choices[0]?.message?.content || 'No response generated'
        }
        // Use Gemini if available
        else if (geminiKey) {
            const geminiResponse = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt
                            }]
                        }],
                        generationConfig: {
                            maxOutputTokens: maxTokens,
                            temperature: 0.7,
                        }
                    }),
                }
            )

            const data = await geminiResponse.json()

            if (data.error) {
                throw new Error(data.error.message)
            }

            response = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated'
        }
        else {
            throw new Error('No AI API keys configured. Please set OPENAI_API_KEY or GEMINI_API_KEY in Supabase Edge Function secrets.')
        }

        return new Response(
            JSON.stringify({ response }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Edge Function Error:', error)
        return new Response(
            JSON.stringify({ error: error.message || 'An error occurred' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
