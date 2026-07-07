
export const GEMINI_MODEL_NAME = "gemini-2.0-flash";
export const AI_MODEL_NAME = GEMINI_MODEL_NAME;

// ── AI plan gate ─────────────────────────────────────────────────────────────
// AI tools are an ADVANCED-plan feature (demo schools count as Advanced). The app
// sets this from useSubscriptionGate. It defaults to FALSE so AI can never run for a
// Free/Basic school — every AI call funnels through GeminiClient.generateContent below,
// which short-circuits when AI isn't allowed.
let __aiAllowed = false;
export const setAIAllowed = (allowed: boolean) => { __aiAllowed = !!allowed; };
export const isAIAllowedClient = () => __aiAllowed;
export const AI_LOCKED_MESSAGE = 'AI tools are on the Advanced plan. Upgrade to Advanced to use this feature.';

export const AI_GENERATION_CONFIG = {
    responseMimeType: "application/json"
};

export enum SchemaType {
    STRING = "STRING",
    NUMBER = "NUMBER",
    INTEGER = "INTEGER",
    BOOLEAN = "BOOLEAN",
    ARRAY = "ARRAY",
    OBJECT = "OBJECT"
}

/**
 * Google Gemini AI Client (Fetch Implementation)
 */
export class GeminiClient {
    private apiKey: string;
    private defaultModelName: string;

    constructor(apiKey: string, options: { model?: string } = {}) {
        this.apiKey = apiKey;
        this.defaultModelName = options.model || GEMINI_MODEL_NAME;
    }

    /**
     * Unified generate content method supporting:
     * - params.config (legacy/component specific)
     * - params.generationConfig (SDK standard)
     * - params.systemInstruction (SDK standard)
     * - Automatic content normalization
     */
    async generateContent(params: { model?: string; contents: any; config?: any; generationConfig?: any; systemInstruction?: any } | any) {
        // Plan gate: AI is Advanced-only. Block every AI call for Free/Basic schools.
        if (!__aiAllowed) {
            return { text: AI_LOCKED_MESSAGE, blocked: true, error: new Error('AI_NOT_ALLOWED') };
        }
        if (!this.apiKey) {
            return { text: "Error: AI API Key is missing. Please check your settings." };
        }

        // Handle both object params and direct content pass (legacy support if any)
        let model = this.defaultModelName;
        let contents = params;
        let generationConfig: any = {};
        let systemInstruction: any = undefined;

        if (params && typeof params === 'object' && !Array.isArray(params) && params.contents) {
            // It's the params object
            model = params.model || this.defaultModelName;
            contents = params.contents;
            // Extract generationConfig
            generationConfig = params.generationConfig || params.config || {};

            // Extract systemInstruction - check top level first, then inside config
            if (params.systemInstruction) {
                systemInstruction = params.systemInstruction;
            } else if (generationConfig && generationConfig.systemInstruction) {
                // Fix: Move systemInstruction out of generationConfig if incorrectly placed there
                systemInstruction = generationConfig.systemInstruction;
                delete generationConfig.systemInstruction;
            }
        }

        // Normalize contents to Gemini API format
        let finalContents: any[] = [];
        if (typeof contents === 'string') {
            finalContents = [{ role: 'user', parts: [{ text: contents }] }];
        } else if (contents.parts) {
            finalContents = [{ role: 'user', parts: contents.parts }];
        } else if (Array.isArray(contents)) {
            finalContents = contents;
        } else {
            finalContents = [contents]; // Fallback
        }

        // Ensure parts structure is correct
        finalContents = finalContents.map(c => {
            // If c has role and parts, it's good.
            if (c.role && c.parts) return c;
            // If c is just { text: ... } or string, structure it.
            if (typeof c === 'string') return { role: 'user', parts: [{ text: c }] };
            return { role: 'user', parts: [{ text: JSON.stringify(c) }] }; // Last resort fallback
        });


        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

        const requestBody: any = {
            contents: finalContents,
            generationConfig: generationConfig
        };

        if (systemInstruction) {
            requestBody.systemInstruction = systemInstruction;
        }

        const makeRequest = async (retries = 3, delay = 2000): Promise<any> => {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                });

                if (response.status === 429) {
                    if (retries > 0) {
                        console.warn(`Gemini Rate Limit Exceeded. Retrying in ${delay}ms... (${retries} retries left)`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        return makeRequest(retries - 1, delay * 2); // Exponential backoff
                    } else {
                        throw new Error("AI Busy: Too many requests. Please wait a minute and try again.");
                    }
                }

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`Gemini API Error ${response.status}: ${errorText}`);
                    throw new Error(`Gemini API Error: ${response.statusText}`);
                }

                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

                return {
                    text: text,
                    candidates: data.candidates,
                    promptFeedback: data.promptFeedback,
                    // Mocking response object for compatibility
                    response: {
                        text: () => text,
                        candidates: data.candidates
                    }
                };

            } catch (error: any) {
                // If it's a network error or other fetch error, we might want to retry too, 
                // but for now let's focus on the explicit recursion for 429.
                // If the error was thrown from the 429 block, rethrow it.
                if (error.message.includes("AI Busy")) throw error;

                throw error;
            }
        };

        try {
            return await makeRequest();
        } catch (error: any) {
            console.error("Gemini Request Failed:", error);
            // Return safe error object
            return {
                text: `AI Error: ${error.message || "Connection failed"}`,
                error: error
            };
        }
    }

    // --- Feature Stubs ---

    get models() {
        return {
            generateContent: this.generateContent.bind(this),
            generateVideos: async (params: { prompt: string; subject?: string; grade?: string }) => {
                console.log("Generating AI Video Plan for:", params.prompt);
                const systemPrompt = `You are an AI Video Producer for an educational app. 
                Create a detailed storyboard/script for a 30-second educational video.
                Return a JSON object with:
                {
                  "title": "Video Title",
                  "scenes": [
                    { "timestamp": "0:00", "description": "Visual scene description", "script": "Narrator voiceover text" }
                  ],
                  "summary": "Educational takeaway"
                }`;

                const result = await this.generateContent({
                    contents: `Create a video about: ${params.prompt} for ${params.subject || 'General'} (Grade ${params.grade || 'Any'})`,
                    generationConfig: { responseMimeType: "application/json" },
                    systemInstruction: { parts: [{ text: systemPrompt }] }
                });

                try {
                    return JSON.parse(result.text);
                } catch (e) {
                    return { error: "Failed to parse video plan", raw: result.text };
                }
            }
        };
    }

    get operations() {
        return {
            getVideosOperation: async (params: any) => {
                console.warn("getVideosOperation stub called.");
                return { done: true, response: { generatedVideos: [] } };
            }
        };
    }

    get live() {
        return {
            connect: async (options: { onMessage?: (text: string) => void } = {}) => {
                console.log("Connecting to Live Voice AI (Simulated Bridge)");

                // Return a mock WebSocket-like interface that uses Gemini generateContent
                return {
                    send: async (text: string) => {
                        const res = await this.generateContent({
                            contents: text,
                            systemInstruction: {
                                parts: [{ text: "You are a friendly Live Voice Coach. Keep responses very short (1-2 sentences) and encouraging, as if speaking in real-time." }]
                            }
                        });
                        if (options.onMessage) options.onMessage(res.text);
                        return res.text;
                    },
                    disconnect: () => console.log("Live Voice Disconnected")
                };
            }
        };
    }

    // Legacy Chat Support - redirects to generateContent but manages history manually in UI usually
    async chat(params: { model: string; messages: any[]; config?: any }) {
        // We just return a helper that has sendMessage
        const history = params.messages || [];
        const model = params.model || this.defaultModelName;
        const config = params.config;

        return {
            sendMessage: async (msg: string | any) => {
                const userMsg = typeof msg === 'string' ? { role: 'user', parts: [{ text: msg }] } : msg;
                const newHistory = [...history, userMsg];
                const result = await this.generateContent({
                    model: model,
                    contents: newHistory,
                    config: config
                });
                return result;
            },
            // Streaming stub
            sendMessageStream: async (msg: string | any) => {
                console.warn("Streaming not implemented in basic fetch client.");
                const result = await this.generateContent({
                    model: model,
                    contents: [...history, typeof msg === 'string' ? { role: 'user', parts: [{ text: msg }] } : msg],
                    config: config
                });
                // Mock stream response
                return {
                    stream: (async function* () {
                        yield { text: () => result.text };
                    })(),
                    response: Promise.resolve(result)
                };
            }
        };
    }

    // Legacy startChat for backward compatibility
    startChat(config: any) {
        return {
            sendMessage: async (msg: string) => this.generateContent({
                model: this.defaultModelName,
                contents: [...(config.history || []), { role: 'user', parts: [{ text: msg }] }]
            }),
            sendMessageStream: async (msg: string) => {
                const res = await this.generateContent({
                    model: this.defaultModelName,
                    contents: [...(config.history || []), { role: 'user', parts: [{ text: msg }] }]
                });
                return {
                    stream: (async function* () { yield { text: () => res.text }; })(),
                    response: Promise.resolve(res)
                };
            }
        };
    }
}

/**
 * NVIDIA AI Client — same public surface as GeminiClient, but every request goes
 * through the app's server-side proxy (`/api/ai/chat`), so the NVIDIA key never
 * reaches the browser. It ONLY overrides generateContent(); models / chat /
 * startChat / live all funnel through that override, so every existing AI
 * feature keeps working unchanged, now powered by NVIDIA (Llama / DeepSeek /
 * Qwen / Nemotron).
 */
export class NvidiaClient extends GeminiClient {
    constructor(options: { model?: string } = {}) {
        // The real key lives on the server; this placeholder just satisfies the base.
        super('nvidia-proxy', options);
    }

    private static stripJsonFences(text: string): string {
        const t = (text || '').trim();
        // Models sometimes wrap JSON in ```json … ``` — unwrap so JSON.parse works.
        const fence = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
        return fence ? fence[1].trim() : t;
    }

    // Convert Gemini-shaped { role, parts:[{text}|{inlineData}] } content into
    // OpenAI-shaped messages the NVIDIA endpoint expects. Text-only collapses to
    // a string; images produce multimodal content for vision models.
    private static partsToContent(parts: any): any {
        if (typeof parts === 'string') return parts;
        const arr = Array.isArray(parts) ? parts : [parts];
        const out: any[] = [];
        let textOnly = '';
        let hasImage = false;
        for (const p of arr) {
            if (p == null) continue;
            if (typeof p === 'string') { textOnly += p; out.push({ type: 'text', text: p }); continue; }
            if (p.text != null) { textOnly += p.text; out.push({ type: 'text', text: p.text }); continue; }
            const inline = p.inlineData || p.inline_data;
            if (inline?.data) {
                hasImage = true;
                const mime = inline.mimeType || inline.mime_type || 'image/png';
                const url = String(inline.data).startsWith('data:') ? inline.data : `data:${mime};base64,${inline.data}`;
                out.push({ type: 'image_url', image_url: { url } });
                continue;
            }
            if (p.image_url) { hasImage = true; out.push({ type: 'image_url', image_url: p.image_url }); continue; }
        }
        return hasImage ? out : textOnly;
    }

    async generateContent(params: any) {
        if (!__aiAllowed) {
            return { text: AI_LOCKED_MESSAGE, blocked: true, error: new Error('AI_NOT_ALLOWED') };
        }

        // Parse the same param shapes GeminiClient accepts.
        let model: string | undefined;
        let contents: any = params;
        let generationConfig: any = {};
        let systemInstruction: any;
        if (params && typeof params === 'object' && !Array.isArray(params) && params.contents) {
            model = params.model;
            contents = params.contents;
            generationConfig = params.generationConfig || params.config || {};
            systemInstruction = params.systemInstruction || generationConfig.systemInstruction;
        }

        const messages: any[] = [];
        const sysText = typeof systemInstruction === 'string'
            ? systemInstruction
            : systemInstruction?.parts?.map((p: any) => p.text).filter(Boolean).join('\n');
        const wantJson = generationConfig?.responseMimeType === 'application/json';
        const sysParts = [sysText, wantJson ? 'Respond ONLY with valid minified JSON. No markdown, no code fences, no commentary.' : '']
            .filter(Boolean).join('\n');
        if (sysParts) messages.push({ role: 'system', content: sysParts });

        // Normalize contents → array of {role, parts}
        let arr: any[];
        if (typeof contents === 'string') arr = [{ role: 'user', parts: [{ text: contents }] }];
        else if (contents?.parts) arr = [{ role: 'user', parts: contents.parts }];
        else if (Array.isArray(contents)) arr = contents;
        else arr = [contents];

        for (const c of arr) {
            if (typeof c === 'string') { messages.push({ role: 'user', content: c }); continue; }
            const role = c.role === 'model' ? 'assistant' : (c.role || 'user');
            messages.push({ role, content: NvidiaClient.partsToContent(c.parts ?? c) });
        }

        try {
            const { api } = await import('./api');
            const res: any = await api.aiChat({
                messages,
                model,
                temperature: generationConfig?.temperature,
                max_tokens: generationConfig?.maxOutputTokens || generationConfig?.max_tokens,
            });
            let text = res?.text || '';
            if (wantJson) text = NvidiaClient.stripJsonFences(text);
            return {
                text,
                usage: res?.usage,
                candidates: [{ content: { parts: [{ text }] } }],
                response: { text: () => text, candidates: [{ content: { parts: [{ text }] } }] },
            };
        } catch (error: any) {
            console.error('NVIDIA AI request failed:', error);
            return { text: `AI Error: ${error?.message || 'Connection failed'}`, error };
        }
    }
}

// Which provider powers the app's AI. Non-secret; the real key is server-side.
const getAIProvider = (): 'nvidia' | 'gemini' => {
    try {
        if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
            return ((import.meta as any).env.VITE_AI_PROVIDER || 'nvidia').toLowerCase() === 'gemini' ? 'gemini' : 'nvidia';
        }
        if (typeof process !== 'undefined' && process.env) {
            return (process.env.VITE_AI_PROVIDER || 'nvidia').toLowerCase() === 'gemini' ? 'gemini' : 'nvidia';
        }
    } catch { /* default below */ }
    return 'nvidia';
};

// Singleton Management
let aiClientInstance: GeminiClient | null = null;
let aiClientInstanceKey: string | null = null;

export const getAIClient = (apiKey?: string) => {
    // NVIDIA is the default provider — powered by the server-side proxy, so no
    // browser key is needed. Every AI feature routes here.
    if (getAIProvider() === 'nvidia') {
        if (!aiClientInstance || aiClientInstanceKey !== 'nvidia') {
            aiClientInstance = new NvidiaClient();
            aiClientInstanceKey = 'nvidia';
        }
        return aiClientInstance;
    }

    // Legacy Gemini path (VITE_AI_PROVIDER=gemini).
    let envKey = '';
    try {
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            envKey = import.meta.env.VITE_GEMINI_API_KEY;
        } else if (typeof process !== 'undefined' && process.env) {
            envKey = process.env.VITE_GEMINI_API_KEY || '';
        }
    } catch (e) {
        console.warn("Error accessing environment variables:", e);
    }

    const finalKey = apiKey || envKey;

    if (!finalKey) {
        console.warn("Gemini API Key missing. Ensure VITE_GEMINI_API_KEY is set.");
    }

    if (!aiClientInstance || aiClientInstanceKey === 'nvidia' || (finalKey && aiClientInstanceKey !== finalKey)) {
        aiClientInstance = new GeminiClient(finalKey || 'dummy-key-for-test');
        aiClientInstanceKey = finalKey;
    }

    return aiClientInstance; // Returns the class instance directly
};
