import { describe, it, expect, vi } from 'vitest';
import {
    describeClassLevel, parseAIJson, generateTermPlan, mergeTermIntoResources, normalizeResources,
    buildWeeksPrompt, WEEKS_PER_CALL, PlannerAIClient,
} from '../lessonPlanAI';

const aiWeek = (week: number, topic: string) => ({
    week, topic,
    objectives: ['Define it', 'Apply it'],
    materials: ['Chalkboard'],
    keyVocabulary: ['term'],
    steps: [{ step: 'Introduction', description: 'Teacher asks a question.' }],
    assessment: ['Oral questions'],
    questions: ['What is it?', 'Give an example.'],
    note: '### Definition\nIt is a thing.',
});

/** Answers each request with the weeks it was asked about. */
const echo = async (body: any): Promise<{ text: string }> => {
    const prompt: string = body.messages[1].content;
    const weeks = [...prompt.matchAll(/- Week (\d+): ([^(\n]+)/g)].map(m => aiWeek(Number(m[1]), m[2].trim()));
    return { text: JSON.stringify({ weeks }) };
};
const echoAI = () => ({ chat: vi.fn(echo) });

describe('describeClassLevel', () => {
    it('recognises SSS, JSS and Primary classes and drops the arm letter', () => {
        expect(describeClassLevel('SSS 1 A')).toMatchObject({ label: 'SSS 1', stage: 'sss' });
        expect(describeClassLevel('SSS 1 A').curriculum).toMatch(/WAEC and NECO/);
        expect(describeClassLevel('JSS 2 B')).toMatchObject({ label: 'JSS 2', stage: 'jss' });
        expect(describeClassLevel('JSS 2 B').curriculum).toMatch(/BECE/);
        expect(describeClassLevel('Primary 4')).toMatchObject({ stage: 'primary', lessonMinutes: 35 });
    });
});

describe('buildWeeksPrompt', () => {
    it('uses the real subject, class, term and sub-topics', () => {
        const p = buildWeeksPrompt('Mathematics', describeClassLevel('SSS 1 A'), 'Second Term',
            [{ week: 3, topic: 'Indices', subTopics: ['Laws of indices'] }]);
        expect(p).toContain('Subject: Mathematics');
        expect(p).toContain('Class: SSS 1');
        expect(p).toContain('Term: Second Term');
        expect(p).toContain('- Week 3: Indices (sub-topics: Laws of indices)');
        expect(p).toMatch(/WAEC\/NECO style/);
    });
});

describe('parseAIJson', () => {
    it('reads plain, fenced and wrapped JSON', () => {
        expect(parseAIJson('{"a":1}')).toEqual({ a: 1 });
        expect(parseAIJson('```json\n{"a":2}\n```')).toEqual({ a: 2 });
        expect(parseAIJson('Here you go: {"a":3} Enjoy!')).toEqual({ a: 3 });
    });
    it('recovers array items written with escaped quotes', () => {
        expect(parseAIJson('{"o":[\\"x\\",\\"y\\"]}')).toEqual({ o: ['x', 'y'] });
    });
    it('throws when there is no JSON (e.g. an empty answer)', () => {
        expect(() => parseAIJson('')).toThrow();
    });
});

describe('generateTermPlan', () => {
    const scheme = [
        { week: 1, topic: 'Number bases', subTopics: [] },
        { week: 2, topic: '', subTopics: [] },             // blank week is skipped
        { week: 3, topic: 'Indices', subTopics: ['Laws'] },
        { week: 4, topic: 'Logarithms', subTopics: [] },
    ];

    it('asks for the term in small batches with thinking off, and maps every week', async () => {
        const ai = echoAI();
        const progress: number[] = [];
        const r = await generateTermPlan({ ai, subject: 'Mathematics', className: 'SSS 1 A', termLabel: 'First Term', scheme, onProgress: p => progress.push(p.done) });
        expect(ai.chat).toHaveBeenCalledTimes(Math.ceil(3 / WEEKS_PER_CALL));
        expect(ai.chat.mock.calls[0][0]).toMatchObject({ thinking: false, max_tokens: 2048 });
        expect(r.failedWeeks).toEqual([]);
        expect(r.term.lessonPlans.map(p => p.week)).toEqual([1, 3, 4]);
        expect(r.term.lessonPlans[1]).toMatchObject({ topic: 'Indices', objectives: ['Define it', 'Apply it'], duration: '40 minutes' });
        expect(r.notes[0]).toMatchObject({ term: 'First Term', week: 1 });
        expect(r.term.assessments[0].questions).toHaveLength(2);
        expect(progress.at(-1)).toBe(3);
    });

    it('reports the weeks that failed and keeps the rest; a retry asks only for the missing weeks', async () => {
        let fail = true;
        const ai = echoAI();

        ai.chat.mockImplementation(async (body: any) => {
            if (fail && body.messages[1].content.includes('Logarithms')) throw new Error('Request failed with status 503');
            return echo(body);
        });
        const first = await generateTermPlan({ ai, subject: 'Mathematics', className: 'SSS 1 A', termLabel: 'First Term', scheme });
        expect(first.failedWeeks).toEqual([4]);
        expect(first.term.lessonPlans.map(p => p.week)).toEqual([1, 3]);
        expect(first.firstError?.code).toBe('busy');

        fail = false;
        ai.chat.mockClear();
        const { weeksFromTerm } = await import('../lessonPlanAI');
        const second = await generateTermPlan({ ai, subject: 'Mathematics', className: 'SSS 1 A', termLabel: 'First Term', scheme, already: weeksFromTerm(first.term, first.notes) });
        expect(ai.chat).toHaveBeenCalledTimes(1);
        expect(ai.chat.mock.calls[0][0].messages[1].content).toContain('Logarithms');
        expect(second.term.lessonPlans.map(p => p.week)).toEqual([1, 3, 4]);
    });

    it('an empty answer (all tokens spent) is retried, then falls back to one week per call', async () => {
        const ai = echoAI();

        ai.chat.mockImplementation(async (body: any) => {
            const weeksAsked = (body.messages[1].content.match(/- Week \d+:/g) || []).length;
            return weeksAsked > 1 ? { text: '' } : echo(body);
        });
        const r = await generateTermPlan({ ai, subject: 'Mathematics', className: 'SSS 1 A', termLabel: 'First Term', scheme: scheme.slice(0, 1).concat(scheme.slice(2, 3)) });
        expect(r.failedWeeks).toEqual([]);
        expect(r.term.lessonPlans.map(p => p.week)).toEqual([1, 3]);
    });

    it('does not retry when AI is not on the plan', async () => {
        const { PlannerAIError } = await import('../lessonPlanAI');
        const ai: PlannerAIClient = { chat: vi.fn(async () => { throw new PlannerAIError('Upgrade to Advanced.', 'locked'); }) };
        const r = await generateTermPlan({ ai, subject: 'Mathematics', className: 'SSS 1 A', termLabel: 'First Term', scheme });
        // 3 weeks = 2 batches already in flight together; neither is retried.
        expect(ai.chat).toHaveBeenCalledTimes(2);
        expect(r.term.lessonPlans).toHaveLength(0);
        expect(r.firstError?.code).toBe('locked');
    });
});

describe('mergeTermIntoResources / normalizeResources', () => {
    it('replaces only the generated term and keeps the others in term order', () => {
        const existing: any = {
            subject: 'Mathematics', className: 'SSS 1 A',
            terms: [{ term: 'Second Term', schemeOfWork: [], lessonPlans: [{ week: 1, topic: 'Old T2' }], assessments: [] },
                    { term: 'First Term', schemeOfWork: [], lessonPlans: [{ week: 1, topic: 'Old T1' }], assessments: [] }],
            detailedNotes: [{ topic: 'Old T1', note: 'x', term: 'First Term', week: 1 }, { topic: 'Old T2', note: 'y', term: 'Second Term', week: 1 }],
        };
        const merged = mergeTermIntoResources(existing, { subject: 'Mathematics', className: 'SSS 1 A' },
            { term: 'First Term', schemeOfWork: [], lessonPlans: [{ week: 1, topic: 'New T1' } as any], assessments: [] },
            [{ topic: 'New T1', note: 'z', term: 'First Term', week: 1 }]);
        expect(merged.terms.map(t => t.term)).toEqual(['First Term', 'Second Term']);
        expect(merged.terms[0].lessonPlans[0].topic).toBe('New T1');
        expect(merged.detailedNotes!.map(n => n.topic).sort()).toEqual(['New T1', 'Old T2']);
    });

    it('opens plans saved in the old weeks/learningObjectives shape', () => {
        const r = normalizeResources({ subject: 'M', className: 'C', terms: [{ term: 'First Term', weeks: [{ week: 1, topic: 'A', learningObjectives: ['o'], resources: ['r'] }, { week: 2, topic: '' }] }] } as any);
        expect(r.terms[0].lessonPlans).toEqual([expect.objectContaining({ week: 1, topic: 'A', objectives: ['o'], materials: ['r'] })]);
    });
});
