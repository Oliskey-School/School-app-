/**
 * Oliskey AI knowledge layer.
 *
 * The point of these tests is not "does the model answer well" — that depends
 * on a live provider. It is that the knowledge, the security rules and the
 * user's context are ASSEMBLED correctly and identically for both providers,
 * which is the part this codebase controls.
 *
 * The parity test is the important one: it asserts that the body handed to
 * NVIDIA is byte-for-byte the body the Gemini fallback receives, so the
 * fallback can never become a weaker or less constrained assistant.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    loadSections, retrieveSections, buildSystemMessages, withOliskeyKnowledge, lastUserQuestion,
} from '../../src/services/aiKnowledge.service';

const sysText = (msgs: Array<{ role: string; content: string }>) =>
    msgs.filter(m => m.role === 'system').map(m => m.content).join('\n');

describe('knowledge base document', () => {
    it('parses into sections', () => {
        const sections = loadSections();
        expect(sections.length, 'knowledge base did not parse into ## sections').toBeGreaterThan(8);
        for (const s of sections) expect(s.heading.length).toBeGreaterThan(0);
    });

    it('contains the sections the assistant always needs', () => {
        const headings = loadSections().map(s => s.heading);
        expect(headings).toContain('What Oliskey School is');
        expect(headings).toContain('What the assistant must never do');
        expect(headings).toContain('Approving and publishing results');
    });
});

describe('retrieval', () => {
    it('sends only a few sections, not the whole document', () => {
        const all = loadSections().length;
        const picked = retrieveSections('How do I take attendance?', { role: 'TEACHER' });
        expect(picked.length).toBeGreaterThan(0);
        expect(picked.length, 'retrieval should not approach the full corpus').toBeLessThan(all);
    });

    it('finds the right section for each role question', () => {
        const cases: Array<[string, string, string]> = [
            ['How do I take attendance?', 'TEACHER', 'Attendance'],
            ['How do I enter results?', 'TEACHER', 'Entering results'],
            ['How do I publish a report card?', 'ADMIN', 'Approving and publishing results'],
            ['How do I add a student?', 'ADMIN', 'Adding a student'],
            ['How do I manage fees?', 'ADMIN', 'Fees and payments'],
            ['How do I use the demo school?', 'ADMIN', 'Demo School'],
            ['How do I create a class?', 'ADMIN', 'Classes and subjects'],
            ['How do I see my assignment?', 'STUDENT', 'Assignments'],
        ];
        const missed: string[] = [];
        for (const [q, role, expected] of cases) {
            const headings = retrieveSections(q, { role }).map(s => s.heading);
            if (!headings.includes(expected)) missed.push(`"${q}" (${role}) -> ${headings.join(', ')}`);
        }
        expect(missed, `retrieval missed the expected section:\n${missed.join('\n')}`).toEqual([]);
    });

    it('answers "why can\'t a parent see the result" with the publishing workflow', () => {
        const headings = retrieveSections("Why can't the parent see the result?", { role: 'TEACHER' }).map(s => s.heading);
        expect(headings).toContain('Approving and publishing results');
    });

    it('uses the current page when the question alone is vague', () => {
        const headings = retrieveSections('What do I do here?', { role: 'TEACHER', page: 'Teacher → Results → JSS3 → Mathematics' })
            .map(s => s.heading);
        expect(headings.some(h => h.includes('results')), `page context ignored: ${headings.join(', ')}`).toBe(true);
    });

    it('always carries the product identity and the hard limits', () => {
        const headings = retrieveSections('something completely unrelated to school', {}).map(s => s.heading);
        expect(headings).toContain('What Oliskey School is');
        expect(headings).toContain('What the assistant must never do');
    });
});

describe('system messages', () => {
    it('state the security rules every time, whatever was asked', () => {
        const text = sysText(buildSystemMessages('How do I take attendance?', { role: 'TEACHER' }));
        for (const rule of ['never', 'passwords', 'bypass', 'signed-in session']) {
            expect(text.toLowerCase(), `security rule missing: ${rule}`).toContain(rule.toLowerCase());
        }
        expect(text).toContain("I don't have verified information about that feature yet.");
    });

    it('carry the server-verified context and say it cannot be overridden', () => {
        const text = sysText(buildSystemMessages('What do I do here?', {
            role: 'teacher', page: 'Teacher Results', module: 'Result Entry',
            schoolId: 'school-1', branchId: 'branch-1', session: '2026/2027', term: 'First Term',
        }));
        expect(text).toContain('USER ROLE: TEACHER');
        expect(text).toContain('CURRENT PAGE: Teacher Results');
        expect(text).toContain('CURRENT FEATURE: Result Entry');
        expect(text).toContain('TERM: First Term');
        expect(text).toMatch(/does not change any of this/);
        // Raw tenant identifiers are not useful to the model and should not be echoed.
        expect(text, 'raw school id leaked into the prompt').not.toContain('school-1');
        expect(text, 'raw branch id leaked into the prompt').not.toContain('branch-1');
    });

    it('never fabricate a role when the session has none', () => {
        const text = sysText(buildSystemMessages('How do I add a student?', {}));
        expect(text).not.toContain('USER ROLE:');
    });
});

describe('request assembly', () => {
    it('puts Oliskey knowledge before the conversation and keeps the user turn last', () => {
        const body = withOliskeyKnowledge(
            { messages: [{ role: 'user', content: 'How do I enter results?' }], temperature: 0.2 },
            { role: 'TEACHER' });
        expect(body.messages[0].role).toBe('system');
        expect(body.messages[body.messages.length - 1]).toEqual({ role: 'user', content: 'How do I enter results?' });
        expect((body as any).temperature, 'caller options must survive').toBe(0.2);
    });

    it('keeps a caller’s own system prompt, after the security rules', () => {
        const body = withOliskeyKnowledge({
            messages: [
                { role: 'system', content: 'You generate lesson plans.' },
                { role: 'user', content: 'Make me a lesson plan.' },
            ],
        }, { role: 'TEACHER' });
        const systems = body.messages.filter(m => m.role === 'system').map(m => m.content as string);
        expect(systems.some(s => s.includes('You generate lesson plans.'))).toBe(true);
        expect(systems[0], 'Oliskey rules must come first').toContain('Oliskey AI');
    });

    it('reads the newest user turn as the query, including multimodal content', () => {
        expect(lastUserQuestion([
            { role: 'user', content: 'old question' },
            { role: 'assistant', content: 'an answer' },
            { role: 'user', content: [{ type: 'text', text: 'How do I publish a report card?' }] },
        ])).toContain('publish a report card');
    });
});

describe('provider parity (NVIDIA primary, Gemini fallback)', () => {
    beforeEach(() => vi.resetModules());
    afterEach(() => vi.restoreAllMocks());

    it('hands the Gemini fallback exactly what NVIDIA was given', async () => {
        const seen: Record<string, any> = {};
        vi.doMock('../../src/services/nvidiaAI.service', () => ({
            NVIDIA_MODELS: { chat: 'test-model' },
            NvidiaAIService: {
                isConfigured: () => true,
                chat: async (b: any) => { seen.nvidia = JSON.parse(JSON.stringify(b)); throw Object.assign(new Error('upstream timeout'), { status: 503 }); },
            },
        }));
        vi.doMock('../../src/services/geminiAI.service', () => ({
            GEMINI_FALLBACK_MODEL: 'gemini-test',
            GeminiAIService: {
                isConfigured: () => true,
                // Mirrors the real service, which stamps provider itself (geminiAI.service.ts).
                chat: async (b: any) => { seen.gemini = JSON.parse(JSON.stringify(b)); return { text: 'ok', model: 'gemini-test', provider: 'gemini' as const }; },
            },
        }));

        const { AIGateway } = await import('../../src/services/aiGateway.service');
        const { withOliskeyKnowledge: wrap } = await import('../../src/services/aiKnowledge.service');

        const body = wrap({ messages: [{ role: 'user', content: 'How do I publish a report card?' }] }, {
            role: 'ADMIN', page: 'Report Cards',
        });
        const result = await AIGateway.chat(body as any);

        expect(result.provider, 'the fallback should have answered').toBe('gemini');
        expect(seen.nvidia, 'NVIDIA was never called').toBeTruthy();
        expect(seen.gemini, 'Gemini fallback was never called').toBeTruthy();
        // The whole point: identical instructions, knowledge and context.
        expect(seen.gemini, 'the fallback received a different payload from the primary').toEqual(seen.nvidia);

        const sys = (seen.gemini.messages as any[]).filter(m => m.role === 'system').map(m => m.content).join('\n');
        expect(sys).toContain('Oliskey AI');
        expect(sys).toContain('USER ROLE: ADMIN');
        expect(sys.toLowerCase()).toContain('never');
    });
});
