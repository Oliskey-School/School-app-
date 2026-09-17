import { config } from '../config/env';

/**
 * Google Gemini — the FALLBACK chat provider behind aiGateway.service.ts.
 * Same input/output shape as NvidiaAIService.chat so callers cannot tell which
 * provider answered. Server-side only: the key comes from GEMINI_API_KEY and
 * never reaches a bundle. One attempt, no retries — the gateway decides.
 */
export const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash-lite';
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const ATTEMPT_TIMEOUT_MS = 45_000;

type Message = { role: string; content: any };

/** OpenAI-style messages → Gemini contents (+ systemInstruction). Text and
 *  base64 data-URL images are carried over; anything else is dropped. */
function toGemini(messages: Message[]) {
    const system: string[] = [];
    const contents: Array<{ role: 'user' | 'model'; parts: any[] }> = [];
    for (const m of messages) {
        const parts: any[] = [];
        if (typeof m.content === 'string') {
            if (m.content) parts.push({ text: m.content });
        } else if (Array.isArray(m.content)) {
            for (const part of m.content) {
                if (part?.type === 'text' && part.text) parts.push({ text: part.text });
                const url: string | undefined = part?.image_url?.url || part?.url;
                const dataUrl = url && /^data:([^;]+);base64,(.+)$/.exec(url);
                if (dataUrl) parts.push({ inlineData: { mimeType: dataUrl[1], data: dataUrl[2] } });
            }
        }
        if (m.role === 'system') {
            system.push(...parts.filter((p) => p.text).map((p) => p.text));
            continue;
        }
        if (parts.length === 0) continue;
        const role = m.role === 'assistant' ? 'model' : 'user';
        // Gemini requires alternating roles; merge consecutive same-role turns.
        const last = contents[contents.length - 1];
        if (last && last.role === role) last.parts.push(...parts);
        else contents.push({ role, parts });
    }
    return { system: system.join('\n\n'), contents };
}

export class GeminiAIService {
    static isConfigured(): boolean {
        return Boolean(config.geminiApiKey);
    }

    static async chat(body: { messages: Message[]; temperature?: number; max_tokens?: number; top_p?: number; response_format?: any }) {
        if (!this.isConfigured()) {
            throw Object.assign(new Error('Gemini is not configured'), { status: 503, provider: 'gemini' });
        }
        const { system, contents } = toGemini(body.messages);
        if (contents.length === 0) throw Object.assign(new Error('messages[] contained no usable content'), { status: 400 });

        const generationConfig: Record<string, unknown> = {
            temperature: body.temperature ?? 0.7,
            maxOutputTokens: body.max_tokens ?? 1024,
            topP: body.top_p ?? 1,
        };
        if (body.response_format?.type === 'json_object' || body.response_format?.type === 'json_schema') {
            generationConfig.responseMimeType = 'application/json';
        }

        const res = await fetch(`${ENDPOINT}/${GEMINI_FALLBACK_MODEL}:generateContent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.geminiApiKey },
            body: JSON.stringify({
                ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
                contents,
                generationConfig,
            }),
            signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
        });
        if (!res.ok) {
            const detail = await res.text().catch(() => '');
            throw Object.assign(new Error(`Gemini chat error ${res.status}`), { status: res.status, detail, provider: 'gemini' });
        }
        const data: any = await res.json();
        const text = (data?.candidates?.[0]?.content?.parts || [])
            .map((p: any) => p?.text || '')
            .join('');
        const usage = data?.usageMetadata
            ? { prompt_tokens: data.usageMetadata.promptTokenCount, completion_tokens: data.usageMetadata.candidatesTokenCount, total_tokens: data.usageMetadata.totalTokenCount }
            : undefined;
        return { text, model: GEMINI_FALLBACK_MODEL, usage, raw: data, provider: 'gemini' as const };
    }
}
