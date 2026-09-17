/**
 * AIGateway — NVIDIA primary, Gemini fallback, one clean error, no loops.
 * Providers are mocked; each case maps to the release checklist for the AI
 * architecture (success, timeout, 429, 503, unavailable, both fail, dedupe).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const nvidia = { chat: vi.fn(), isConfigured: vi.fn(() => true) };
const gemini = { chat: vi.fn(), isConfigured: vi.fn(() => true) };
vi.mock('../../src/services/nvidiaAI.service', () => ({ NvidiaAIService: nvidia }));
vi.mock('../../src/services/geminiAI.service', () => ({ GeminiAIService: gemini, GEMINI_FALLBACK_MODEL: 'gemini-2.5-flash-lite' }));

const { AIGateway } = await import('../../src/services/aiGateway.service');
const body = { messages: [{ role: 'user', content: 'Explain photosynthesis in one line.' }] };
const err = (status?: number, name?: string) => Object.assign(new Error(name || `err ${status}`), status ? { status } : {}, name ? { name } : {});

beforeEach(() => {
    nvidia.chat.mockReset(); gemini.chat.mockReset();
    nvidia.isConfigured.mockReturnValue(true); gemini.isConfigured.mockReturnValue(true);
    gemini.chat.mockResolvedValue({ text: 'from gemini', model: 'gemini-2.5-flash-lite', provider: 'gemini' });
});

describe('AIGateway.chat', () => {
    it('1. NVIDIA success → NVIDIA answers, Gemini never called', async () => {
        nvidia.chat.mockResolvedValue({ text: 'from nvidia', model: 'meta/llama' });
        const r = await AIGateway.chat(body);
        expect(r).toMatchObject({ text: 'from nvidia', provider: 'nvidia' });
        expect(gemini.chat).not.toHaveBeenCalled();
    });

    it.each([
        ['2. timeout', err(undefined, 'TimeoutError')],
        ['3. 429', err(429)],
        ['4. 503', err(503)],
        ['network failure', err(undefined, 'TypeError')],
    ])('%s on NVIDIA → Gemini answers', async (_label, failure) => {
        nvidia.chat.mockRejectedValue(failure);
        const r = await AIGateway.chat(body);
        expect(r).toMatchObject({ text: 'from gemini', provider: 'gemini' });
        expect(nvidia.chat).toHaveBeenCalledTimes(1);
        expect(gemini.chat).toHaveBeenCalledTimes(1);
    });

    it('5. NVIDIA not configured → Gemini directly', async () => {
        nvidia.isConfigured.mockReturnValue(false);
        const r = await AIGateway.chat(body);
        expect(r.provider).toBe('gemini');
        expect(nvidia.chat).not.toHaveBeenCalled();
    });

    it('7. both fail → one clean 503, each provider tried exactly once', async () => {
        nvidia.chat.mockRejectedValue(err(503));
        gemini.chat.mockRejectedValue(err(500));
        await expect(AIGateway.chat(body)).rejects.toMatchObject({ status: 503, message: /temporarily unavailable/ });
        expect(nvidia.chat).toHaveBeenCalledTimes(1);
        expect(gemini.chat).toHaveBeenCalledTimes(1);
    });

    it('a genuine client error (400) is NOT retried on the other provider', async () => {
        nvidia.chat.mockRejectedValue(err(400));
        await expect(AIGateway.chat(body)).rejects.toMatchObject({ status: 400 });
        expect(gemini.chat).not.toHaveBeenCalled();
    });

    it('identical in-flight requests from the same user share one upstream call', async () => {
        let resolve!: (v: any) => void;
        nvidia.chat.mockReturnValue(new Promise((r) => { resolve = r; }));
        const a = AIGateway.chat(body, 'user-1');
        const b = AIGateway.chat(body, 'user-1');
        const other = AIGateway.chat(body, 'user-2');
        resolve({ text: 'once', model: 'm' });
        expect(await a).toEqual(await b);
        expect(await other).toMatchObject({ text: 'once' });
        expect(nvidia.chat).toHaveBeenCalledTimes(2); // user-1 (shared) + user-2
    });
});

describe('token budget (boundedBody)', () => {
    it('keeps system messages, trims old turns, caps output tokens', async () => {
        const { boundedBody } = await import('../../src/services/aiGateway.service');
        const turns = Array.from({ length: 40 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `turn ${i} ` + 'x'.repeat(900) }));
        const out = boundedBody({ messages: [{ role: 'system', content: 'rules' }, ...turns], max_tokens: 9000 });
        expect(out.messages[0]).toEqual({ role: 'system', content: 'rules' });
        expect(out.messages.length).toBeLessThanOrEqual(17);
        expect(out.messages[out.messages.length - 1].content).toContain('turn 39');
        expect(out.messages[1].role).toBe('user');
        expect(out.messages.reduce((n, m) => n + String(m.content).length, 0)).toBeLessThanOrEqual(24_000);
        expect(out.max_tokens).toBe(2048);
    });

    it('leaves a short conversation untouched', async () => {
        const { boundedBody } = await import('../../src/services/aiGateway.service');
        const msgs = [{ role: 'system', content: 's' }, { role: 'user', content: 'hi' }];
        expect(boundedBody({ messages: msgs, max_tokens: 300 })).toEqual({ messages: msgs, max_tokens: 300 });
    });
});
