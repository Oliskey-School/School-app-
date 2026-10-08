import type {
    SchemeWeek, GeneratedResources, TermResources, GeneratedLessonPlan,
    GeneratedAssessment, DetailedNote,
} from '../types';

/**
 * AI lesson-plan generation for the Lesson Planner.
 *
 * Why it is split into small calls: the server caps every AI completion at
 * 2,048 output tokens, and the default model used to spend all of it on a
 * hidden "thinking" pass. Asking for a whole year in one call therefore came
 * back empty or as cut-off JSON and the planner showed nothing. Requests now
 * turn thinking off, one term is generated per run, WEEKS_PER_CALL weeks per
 * request, a few requests at a time.
 */

export const TERM_LABELS = { term1: 'First Term', term2: 'Second Term', term3: 'Third Term' } as const;
export type TermKey = keyof typeof TERM_LABELS;
const TERM_ORDER: string[] = [TERM_LABELS.term1, TERM_LABELS.term2, TERM_LABELS.term3];

export const WEEKS_PER_CALL = 2;
export const MAX_PARALLEL_CALLS = 3;
export const CALL_TIMEOUT_MS = 45_000;

/**
 * The AI call this module needs: one chat completion through the app's
 * /api/ai/chat proxy. Throws on failure (network, 4xx/5xx, plan lock).
 */
export interface PlannerAIClient {
    chat: (body: {
        messages: Array<{ role: 'system' | 'user'; content: string }>;
        max_tokens: number;
        temperature: number;
        thinking: false;
    }) => Promise<{ text?: string }>;
}

export interface ClassLevel {
    /** e.g. "SSS 1" — the class name without the arm letter. */
    label: string;
    stage: 'early' | 'primary' | 'jss' | 'sss' | 'other';
    description: string;
    curriculum: string;
    lessonMinutes: number;
}

/** Works out the Nigerian school stage from a class name like "JSS 2 A" or "Primary 4". */
export function describeClassLevel(className: string): ClassLevel {
    const label = className.trim().replace(/\s+[A-Z]$/, '').trim() || className.trim();
    const n = (label.match(/\d+/) || [''])[0];
    if (/\b(SSS|SS|SENIOR)\b/i.test(label)) {
        return {
            label, stage: 'sss',
            description: `Senior Secondary School ${n}, students aged about ${14 + Number(n || 1)}`,
            curriculum: 'the NERDC Senior Secondary Education Curriculum, with depth and question style matched to the WAEC and NECO SSCE syllabus',
            lessonMinutes: 40,
        };
    }
    if (/\b(JSS|JS|JUNIOR)\b/i.test(label)) {
        return {
            label, stage: 'jss',
            description: `Junior Secondary School ${n} (Upper Basic ${6 + Number(n || 1)}), students aged about ${11 + Number(n || 1)}`,
            curriculum: 'the NERDC 9-Year Basic Education Curriculum (Upper Basic), building towards the BECE',
            lessonMinutes: 40,
        };
    }
    if (/\b(PRIMARY|PRY|BASIC|GRADE)\b/i.test(label)) {
        return {
            label, stage: 'primary',
            description: `Primary ${n}, pupils aged about ${5 + Number(n || 1)}`,
            curriculum: 'the NERDC 9-Year Basic Education Curriculum (Lower/Middle Basic); keep language simple and concrete',
            lessonMinutes: 35,
        };
    }
    if (/\b(NURSERY|KG|KINDERGARTEN|CRECHE|PRE-?SCHOOL|RECEPTION)\b/i.test(label)) {
        return {
            label, stage: 'early',
            description: `${label}, young children aged about 3-5`,
            curriculum: 'the NERDC Early Childhood Care and Development Education curriculum; play-based, very simple language',
            lessonMinutes: 30,
        };
    }
    return {
        label, stage: 'other',
        description: label,
        curriculum: 'the NERDC curriculum for this class level',
        lessonMinutes: 40,
    };
}

/** Weeks the teacher actually filled in (a topic is required; sub-topics are optional). */
export function plannableWeeks(scheme: SchemeWeek[]): SchemeWeek[] {
    return scheme
        .filter(w => (w.topic || '').trim() !== '')
        .map(w => ({ week: w.week, topic: w.topic.trim(), subTopics: (w.subTopics || []).map(s => s.trim()).filter(Boolean) }));
}

export function buildSystemPrompt(subject: string, level: ClassLevel): string {
    return [
        `You are an experienced Nigerian ${subject} teacher and curriculum specialist writing lesson plans for ${level.description}.`,
        `Follow ${level.curriculum}.`,
        'Use Nigerian classroom realities: low-cost local materials, naira, Nigerian names, places, foods and everyday examples.',
        'Write in clear British English. Be accurate; never invent facts.',
        'Respond ONLY with valid minified JSON. No markdown fences, no commentary.',
    ].join('\n');
}

export function buildWeeksPrompt(subject: string, level: ClassLevel, termLabel: string, weeks: SchemeWeek[]): string {
    const isSSS = level.stage === 'sss';
    const weekLines = weeks.map(w =>
        `- Week ${w.week}: ${w.topic}${w.subTopics.length ? ` (sub-topics: ${w.subTopics.join('; ')})` : ''}`
    ).join('\n');
    return [
        `Subject: ${subject}`,
        `Class: ${level.label} — ${level.description}`,
        `Term: ${termLabel}`,
        `Lesson length: ${level.lessonMinutes} minutes`,
        '',
        'Write a lesson plan for each of these weeks from the teacher\'s scheme of work. Keep the week numbers and topics exactly as given:',
        weekLines,
        '',
        'For each week return:',
        '- objectives: 3-4 measurable objectives that complete "By the end of the lesson, students should be able to…", each starting with an action verb',
        '- materials: 3-5 low-cost instructional materials available in a Nigerian classroom',
        '- keyVocabulary: 3-6 key terms',
        `- steps: exactly 5 steps named "Introduction", "Presentation", "Class Activity", "Evaluation", "Conclusion"; each description 1-2 sentences saying what the teacher does and what the ${level.stage === 'primary' || level.stage === 'early' ? 'pupils' : 'students'} do`,
        '- assessment: 2-3 short assessment methods',
        `- questions: 3 evaluation questions${isSSS ? ' in WAEC/NECO style' : level.stage === 'jss' ? ' in BECE style' : ''}, with any answer options inside the question text`,
        '- note: the lesson note to copy onto the board, in markdown, 100-160 words, with "### " sub-headings (for example definition, explanation, worked example) and no emoji',
        '',
        'JSON shape:',
        '{"weeks":[{"week":1,"topic":"","objectives":[""],"materials":[""],"keyVocabulary":[""],"steps":[{"step":"","description":""}],"assessment":[""],"questions":[""],"note":""}]}',
    ].join('\n');
}

/**
 * Pulls the JSON object out of a model reply. Models sometimes wrap it in code
 * fences or add a sentence before/after it; the object itself is what we need.
 */
export function parseAIJson(raw: string): any {
    let text = (raw || '').trim();
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fence) text = fence[1].trim();
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end <= start) throw new Error('NO_JSON');
    const candidate = text.slice(start, end + 1);
    try {
        return JSON.parse(candidate);
    } catch {
        // Seen from the default model: array items written as [\"a\",\"b\"]
        // outside any string. Un-escaping those quotes recovers the object.
        return JSON.parse(candidate.replace(/\\"/g, '"'));
    }
}

const asStrings = (v: any): string[] =>
    Array.isArray(v) ? v.map(x => (typeof x === 'string' ? x : x?.text ?? JSON.stringify(x))).map(s => String(s).trim()).filter(Boolean) : [];

export interface GeneratedWeek {
    plan: GeneratedLessonPlan;
    note: DetailedNote;
    assessment: GeneratedAssessment;
}

/** Turns one AI week object into the shapes the plan screens already read. */
export function toGeneratedWeek(aiWeek: any, schemeWeek: SchemeWeek, termLabel: string, level: ClassLevel): GeneratedWeek {
    const steps = Array.isArray(aiWeek?.steps)
        ? aiWeek.steps
            .map((s: any) => ({ step: String(s?.step || '').trim(), description: String(s?.description || '').trim() }))
            .filter((s: any) => s.step && s.description)
        : [];
    const questions = asStrings(aiWeek?.questions);
    const plan: GeneratedLessonPlan = {
        week: schemeWeek.week,
        topic: schemeWeek.topic,
        objectives: asStrings(aiWeek?.objectives),
        materials: asStrings(aiWeek?.materials),
        teachingSteps: steps,
        duration: `${level.lessonMinutes} minutes`,
        keyVocabulary: asStrings(aiWeek?.keyVocabulary),
        assessmentMethods: asStrings(aiWeek?.assessment),
    };
    return {
        plan,
        note: { topic: schemeWeek.topic, note: String(aiWeek?.note || '').trim(), term: termLabel, week: schemeWeek.week },
        assessment: {
            week: schemeWeek.week,
            type: `Week ${schemeWeek.week} evaluation`,
            totalMarks: questions.length * 5,
            questions: questions.map((q, i) => ({ id: i + 1, question: q, type: 'theory' as const, marks: 5 })),
        },
    };
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('TIMEOUT')), ms);
        p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
    });
}

/** A user-facing reason for a failed AI call. */
export class PlannerAIError extends Error {
    constructor(message: string, public readonly code: 'locked' | 'busy' | 'timeout' | 'format' | 'network' | 'cancelled') {
        super(message);
        this.name = 'PlannerAIError';
    }
}

async function generateBatch(ai: PlannerAIClient, subject: string, level: ClassLevel, termLabel: string, weeks: SchemeWeek[]): Promise<GeneratedWeek[]> {
    let lastError: PlannerAIError | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
        let text = '';
        try {
            const response = await withTimeout(ai.chat({
                messages: [
                    { role: 'system', content: buildSystemPrompt(subject, level) },
                    { role: 'user', content: buildWeeksPrompt(subject, level, termLabel, weeks) },
                ],
                max_tokens: 2048,
                temperature: 0.5,
                // Answer directly: the model's hidden reasoning otherwise eats the
                // whole token budget and the reply comes back empty.
                thinking: false,
            }), CALL_TIMEOUT_MS);
            text = response?.text || '';
        } catch (e: any) {
            const msg = String(e?.message || '');
            if (e instanceof PlannerAIError) throw e;
            if (/advanced plan|upgrade|not available on your/i.test(msg)) {
                throw new PlannerAIError("AI tools are not included in your school's current plan.", 'locked');
            }
            lastError = msg === 'TIMEOUT' || /timed out/i.test(msg)
                ? new PlannerAIError('The AI took too long to answer.', 'timeout')
                : /\b(429|50[234])\b|busy|too many|unavailable/i.test(msg)
                    ? new PlannerAIError('The AI service is busy right now.', 'busy')
                    : new PlannerAIError('Could not reach the AI service.', 'network');
            continue;
        }
        try {
            const parsed = parseAIJson(text);
            const list: any[] = Array.isArray(parsed?.weeks) ? parsed.weeks : Array.isArray(parsed) ? parsed : [];
            const result = weeks.map((sw, i) => {
                const match = list.find(w => Number(w?.week) === sw.week) || list[i];
                if (!match) throw new Error('MISSING_WEEK');
                const gw = toGeneratedWeek(match, sw, termLabel, level);
                if (gw.plan.objectives.length === 0 || !gw.note.note) throw new Error('EMPTY_WEEK');
                return gw;
            });
            return result;
        } catch {
            lastError = new PlannerAIError('The AI answer came back incomplete.', 'format');
        }
    }
    // Two weeks of rich content sits close to the output cap; if the answer
    // keeps getting cut off, ask for one week at a time instead.
    if (lastError?.code === 'format' && weeks.length > 1) {
        const out: GeneratedWeek[] = [];
        for (const w of weeks) out.push(...await generateBatch(ai, subject, level, termLabel, [w]));
        return out;
    }
    throw lastError || new PlannerAIError('Could not reach the AI service.', 'network');
}

export interface TermGenerationProgress { done: number; total: number }

export interface TermGenerationResult {
    term: TermResources;
    notes: DetailedNote[];
    /** Weeks that could not be generated (the rest still succeeded). */
    failedWeeks: number[];
    firstError: PlannerAIError | null;
}

/**
 * Generates lesson plans, notes and evaluation questions for one term.
 * `already` holds weeks finished by an earlier, partly failed run, so Retry
 * only asks the AI for what is still missing.
 */
export async function generateTermPlan(opts: {
    ai: PlannerAIClient;
    subject: string;
    className: string;
    termLabel: string;
    scheme: SchemeWeek[];
    already?: GeneratedWeek[];
    onProgress?: (p: TermGenerationProgress) => void;
    isCancelled?: () => boolean;
}): Promise<TermGenerationResult> {
    const level = describeClassLevel(opts.className);
    const weeks = plannableWeeks(opts.scheme);
    const done = new Map<number, GeneratedWeek>();
    for (const gw of opts.already || []) {
        const sw = weeks.find(w => w.week === gw.plan.week && w.topic === gw.plan.topic);
        if (sw) done.set(sw.week, gw);
    }
    const todo = weeks.filter(w => !done.has(w.week));
    const batches: SchemeWeek[][] = [];
    for (let i = 0; i < todo.length; i += WEEKS_PER_CALL) batches.push(todo.slice(i, i + WEEKS_PER_CALL));

    const failedWeeks: number[] = [];
    let firstError: PlannerAIError | null = null;
    const report = () => opts.onProgress?.({ done: done.size, total: weeks.length });
    report();

    let next = 0;
    const worker = async () => {
        while (next < batches.length) {
            if (opts.isCancelled?.()) return;
            const batch = batches[next++];
            try {
                const res = await generateBatch(opts.ai, opts.subject, level, opts.termLabel, batch);
                if (opts.isCancelled?.()) return;
                res.forEach(gw => done.set(gw.plan.week, gw));
                report();
            } catch (e: any) {
                const err = e instanceof PlannerAIError ? e : new PlannerAIError('Could not reach the AI service.', 'network');
                firstError = firstError || err;
                failedWeeks.push(...batch.map(w => w.week));
                if (err.code === 'locked') { next = batches.length; }
            }
        }
    };
    await Promise.all(Array.from({ length: Math.min(MAX_PARALLEL_CALLS, batches.length) }, worker));
    if (opts.isCancelled?.()) throw new PlannerAIError('Generation was cancelled.', 'cancelled');

    const finished = weeks.filter(w => done.has(w.week)).map(w => done.get(w.week)!);
    return {
        term: {
            term: opts.termLabel,
            schemeOfWork: weeks,
            lessonPlans: finished.map(f => f.plan),
            assessments: finished.map(f => f.assessment),
        },
        notes: finished.map(f => f.note),
        failedWeeks: failedWeeks.sort((a, b) => a - b),
        firstError,
    };
}

/** Rebuilds the per-week pieces of an already generated term (used by Retry). */
export function weeksFromTerm(term: TermResources | undefined, notes: DetailedNote[] | undefined): GeneratedWeek[] {
    if (!term?.lessonPlans) return [];
    return term.lessonPlans.map(plan => ({
        plan,
        note: (notes || []).find(n => n.term === term.term && n.week === plan.week) || { topic: plan.topic, note: '' },
        assessment: (term.assessments || []).find(a => a.week === plan.week) || { week: plan.week, type: '', totalMarks: 0, questions: [] },
    }));
}

/**
 * Puts one generated term into the year plan already saved for this subject
 * and class, replacing that term and keeping the others.
 */
export function mergeTermIntoResources(
    existing: GeneratedResources | null | undefined,
    base: { subject: string; className: string },
    term: TermResources,
    notes: DetailedNote[],
): GeneratedResources {
    const prev = existing ? normalizeResources(existing) : null;
    const terms = (prev?.terms || []).filter(t => t.term !== term.term);
    terms.push(term);
    terms.sort((a, b) => TERM_ORDER.indexOf(a.term) - TERM_ORDER.indexOf(b.term));
    const oldTopics = new Set((prev?.terms.find(t => t.term === term.term)?.lessonPlans || []).map(p => p.topic));
    const keptNotes = (prev?.detailedNotes || []).filter(n => (n.term ? n.term !== term.term : !oldTopics.has(n.topic)));
    return {
        subject: base.subject,
        className: base.className,
        terms,
        detailedNotes: [...keptNotes, ...notes],
    };
}

/**
 * Older saved plans came back from the AI as terms[].weeks[] with
 * learningObjectives/resources and no lessonPlans, so the plan screen showed
 * "No Lesson Plans". Map those into the current shape so they still open.
 */
export function normalizeResources(res: GeneratedResources): GeneratedResources {
    const terms = (Array.isArray(res?.terms) ? res.terms : []).map((t: any): TermResources => {
        if (Array.isArray(t?.lessonPlans) && t.lessonPlans.length) {
            return { term: t.term, schemeOfWork: t.schemeOfWork || [], lessonPlans: t.lessonPlans, assessments: t.assessments || [] };
        }
        const weeks: any[] = Array.isArray(t?.weeks) ? t.weeks.filter((w: any) => (w?.topic || '').trim()) : [];
        return {
            term: t?.term || '',
            schemeOfWork: (t?.schemeOfWork || []).length ? t.schemeOfWork : weeks.map(w => ({ week: w.week, topic: w.topic, subTopics: [] })),
            lessonPlans: weeks.map(w => ({
                week: w.week,
                topic: w.topic,
                objectives: asStrings(w.objectives || w.learningObjectives),
                materials: asStrings(w.materials || w.resources),
                teachingSteps: Array.isArray(w.teachingSteps) ? w.teachingSteps : [],
                duration: w.duration || '',
                keyVocabulary: asStrings(w.keyVocabulary),
                assessmentMethods: asStrings(w.assessmentMethods),
            })),
            assessments: t?.assessments || [],
        };
    });
    return { ...res, terms };
}
