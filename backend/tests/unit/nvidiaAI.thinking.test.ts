/**
 * NvidiaAIService.chat — `thinking: false` must reach NVIDIA as
 * chat_template_kwargs.enable_thinking=false, and must not be sent otherwise.
 * Without it the default model spent the whole token budget reasoning and the
 * Lesson Planner got an empty answer.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../src/config/env', () => ({
    config: { nvidiaApiKey: 'test-key', nvidiaBaseUrl: 'https://nvidia.test/v1' },
}));

const { NvidiaAIService } = await import('../../src/services/nvidiaAI.service');

const okResponse = () => ({
    ok: true,
    status: 200,
    json: async () => ({ model: 'm', choices: [{ message: { content: '{"ok":true}' } }] }),
    text: async () => '',
});

describe('NvidiaAIService.chat thinking flag', () => {
    const fetchMock = vi.fn();
    beforeEach(() => { fetchMock.mockReset(); fetchMock.mockResolvedValue(okResponse()); vi.stubGlobal('fetch', fetchMock); });
    afterEach(() => { vi.unstubAllGlobals(); });

    const sentPayload = () => JSON.parse(fetchMock.mock.calls[0][1].body);

    it('thinking:false → enable_thinking:false is sent', async () => {
        const r = await NvidiaAIService.chat({ messages: [{ role: 'user', content: 'hi' }], thinking: false });
        expect(r.text).toBe('{"ok":true}');
        expect(sentPayload().chat_template_kwargs).toEqual({ enable_thinking: false });
        expect(sentPayload().thinking).toBeUndefined();
    });

    it('no thinking flag → no chat_template_kwargs (other features unchanged)', async () => {
        await NvidiaAIService.chat({ messages: [{ role: 'user', content: 'hi' }] });
        expect(sentPayload().chat_template_kwargs).toBeUndefined();
    });
});
