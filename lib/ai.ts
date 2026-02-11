
export const GEMINI_MODEL_NAME = "gemini-2.5-flash";
export const AI_MODEL_NAME = GEMINI_MODEL_NAME;

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
            generateVideos: async (params: any) => {
                console.warn("Video generation stub called.");
                throw new Error("Video generation is currently unavailable.");
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
            connect: async () => {
                console.warn("Live stub called.");
                throw new Error("Live voice features are currently unavailable.");
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

// Singleton Management
let aiClientInstance: GeminiClient | null = null;
let aiClientInstanceKey: string | null = null;

export const getAIClient = (apiKey?: string) => {
    let envKey = '';
    // Safe environment variable access for both Vite (Browser) and Node (Test)
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

    if (!aiClientInstance || (finalKey && aiClientInstanceKey !== finalKey)) {
        aiClientInstance = new GeminiClient(finalKey || 'dummy-key-for-test');
        aiClientInstanceKey = finalKey;
    }

    return aiClientInstance; // Returns the class instance directly
};
