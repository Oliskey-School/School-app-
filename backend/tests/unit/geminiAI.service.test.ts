import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env', () => ({ config: { geminiApiKey: 'server-only-key' } }));
const { GeminiAIService, GEMINI_FALLBACK_MODEL } = await import('../../src/services/geminiAI.service');

describe('GeminiAIService.chat', () => {
    const fetchMock = vi.fn();
    beforeEach(() => { vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset(); });

    it('maps OpenAI-style messages to Gemini, sends the key in a header, returns the shared shape', async () => {
        fetchMock.mockResolvedValue({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Hi ' }, { text: 'there' }] } }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 2, totalTokenCount: 12 } }) });
        const r = await GeminiAIService.chat({
            messages: [
                { role: 'system', content: 'Be brief.' },
                { role: 'user', content: 'Hello' },
                { role: 'assistant', content: 'Yes?' },
                { role: 'user', content: [{ type: 'text', text: 'Look:' }, { type: 'image_url', image_url: { url: 'data:image/png;base64,AAAA' } }] },
            ],
            max_tokens: 64, temperature: 0.2, response_format: { type: 'json_object' },
        });
        expect(r).toMatchObject({ text: 'Hi there', model: GEMINI_FALLBACK_MODEL, provider: 'gemini', usage: { total_tokens: 12 } });
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_FALLBACK_MODEL}:generateContent`);
        expect(url).not.toContain('key=');
        expect(init.headers['x-goog-api-key']).toBe('server-only-key');
        const payload = JSON.parse(init.body);
        expect(payload.systemInstruction.parts[0].text).toBe('Be brief.');
        expect(payload.contents.map((c: any) => c.role)).toEqual(['user', 'model', 'user']);
        expect(payload.contents[2].parts[1].inlineData).toEqual({ mimeType: 'image/png', data: 'AAAA' });
        expect(payload.generationConfig).toMatchObject({ maxOutputTokens: 64, temperature: 0.2, responseMimeType: 'application/json' });
    });

    it('surfaces upstream failures with their status so the gateway can classify them', async () => {
        fetchMock.mockResolvedValue({ ok: false, status: 429, text: async () => 'quota' });
        await expect(GeminiAIService.chat({ messages: [{ role: 'user', content: 'x' }] })).rejects.toMatchObject({ status: 429, provider: 'gemini' });
    });
});
