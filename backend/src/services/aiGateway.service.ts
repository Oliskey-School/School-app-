import crypto from 'crypto';
import { NvidiaAIService } from './nvidiaAI.service';
import { GeminiAIService } from './geminiAI.service';

/**
 * The ONE entry point for chat/completion-style AI in the app.
 *
 *   caller → AIGateway.chat → NVIDIA (primary, with its own model chain)
 *                           → Gemini gemini-2.5-flash-lite on a TRANSIENT failure
 *                           → one clean 503 if both fail
 *
 * Transient = timeout / network error / 429 / 5xx / provider not configured.
 * A genuine client error (400 bad request shape, 401/403 auth) is NOT retried
 * on the other provider — it would fail there too and would double the cost.
 * Exactly one fallback hop, never a loop; each provider already caps its own
 * attempt with a timeout. The fallback exists for availability, not to route
 * around a provider's quota.
 *
 * Token hygiene: identical in-flight requests (same user, same payload) share
 * one upstream call — a double-clicked "Generate" or a React re-render no
 * longer costs two completions.
 */
export type ChatBody = {
    messages: Array<{ role: string; content: any }>;
    model?: string;
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    response_format?: any;
};

export type ChatResult = { text: string; model: string; usage?: any; raw?: any; provider: 'nvidia' | 'gemini' };

const inFlight = new Map<string, Promise<ChatResult>>();

// Input budget. Chat screens send their whole transcript on every turn
// (history is client-managed and unbounded), so a long tutoring session was
// re-sending everything each time. Keep the system message(s), the most
// recent turns, and stay under a character ceiling — old turns add cost and
// latency without improving the next answer. Outputs are capped too: nothing
// in the app needs more than MAX_OUTPUT_TOKENS in one completion.
const MAX_HISTORY_MESSAGES = 16;
const MAX_INPUT_CHARS = 24_000;
const MAX_OUTPUT_TOKENS = 2048;

const sizeOf = (m: { content: any }) => typeof m.content === 'string'
    ? m.content.length
    : Array.isArray(m.content) ? m.content.reduce((n: number, p: any) => n + (typeof p?.text === 'string' ? p.text.length : 64), 0) : 0;

export function trimMessages(messages: ChatBody['messages']): ChatBody['messages'] {
    const system = messages.filter((m) => m.role === 'system');
    let turns = messages.filter((m) => m.role !== 'system').slice(-MAX_HISTORY_MESSAGES);
    let budget = MAX_INPUT_CHARS - system.reduce((n, m) => n + sizeOf(m), 0);
    // Drop from the oldest end until the newest turns fit; always keep the last one.
    while (turns.length > 1 && turns.reduce((n, m) => n + sizeOf(m), 0) > budget) turns = turns.slice(1);
    // The first kept turn must be a user turn for providers that require alternation.
    while (turns.length > 1 && turns[0].role === 'assistant') turns = turns.slice(1);
    return [...system, ...turns];
}

export function boundedBody(body: ChatBody): ChatBody {
    return {
        ...body,
        messages: trimMessages(body.messages),
        max_tokens: Math.min(body.max_tokens ?? 1024, MAX_OUTPUT_TOKENS),
    };
}

export const isTransient = (err: any): boolean => {
    const status = Number(err?.status);
    if (!status) return true; // AbortError / fetch network failure / unknown
    return status === 408 || status === 429 || status >= 500;
};

export class AIGateway {
    static async chat(body: ChatBody, dedupeKey?: string): Promise<ChatResult> {
        const key = dedupeKey
            ? `${dedupeKey}:${crypto.createHash('sha1').update(JSON.stringify(body)).digest('hex')}`
            : null;
        if (key && inFlight.has(key)) return inFlight.get(key)!;

        const run = this.run(body).finally(() => { if (key) inFlight.delete(key); });
        if (key) inFlight.set(key, run);
        return run;
    }

    private static async run(input: ChatBody): Promise<ChatResult> {
        const body = boundedBody(input);
        let primaryError: any = null;
        if (NvidiaAIService.isConfigured()) {
            try {
                const r = await NvidiaAIService.chat(body);
                return { ...r, provider: 'nvidia' };
            } catch (err: any) {
                if (!isTransient(err)) throw err;
                primaryError = err;
                console.warn(`[AI] NVIDIA unavailable (${err?.status || err?.name || 'network'}) — falling back to Gemini`);
            }
        }

        if (GeminiAIService.isConfigured()) {
            try {
                return await GeminiAIService.chat(body);
            } catch (err: any) {
                if (!primaryError && !isTransient(err)) throw err;
                console.error(`[AI] Gemini fallback failed (${err?.status || err?.name || 'network'})`);
            }
        }

        throw Object.assign(
            new Error('The AI assistant is temporarily unavailable. Please try again in a moment.'),
            { status: 503, primary: primaryError?.status },
        );
    }
}
