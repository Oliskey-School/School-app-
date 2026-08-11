/**
 * AI-generated game questions.
 *
 * Produces fresh, class/subject/age-appropriate multiple-choice questions via
 * Gemini for the quiz-style games (Class Battle, Geometry Jeopardy, Vocabulary
 * Adventure, Spelling Sparkle, Vocabulary Ninja, Historical Hot Seat). Every
 * question shown to a student is recorded in GameQuestionHistory so the next
 * request can tell Gemini exactly which prompts to avoid repeating — the
 * question bank effectively grows forever instead of cycling through a small
 * fixed set.
 *
 * Falls back to whatever the caller passes as `fallback` (the existing
 * offline/procedural content) whenever the API key is missing or the Gemini
 * call fails, so a quota hiccup degrades a game to "less varied" rather than
 * broken.
 */
import prisma from '../config/database';
import { config } from '../config/env';
import { gradeBand, normaliseSubject, type BattleQuestion } from './gameContent.service';

const MODEL = process.env.GAME_QUESTION_MODEL || 'gemini-2.5-flash-lite';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const BAND_LABEL: Record<string, string> = {
    early: 'ages 4-6 (early years)',
    lower: 'ages 6-9 (lower primary)',
    mid: 'ages 9-12 (upper primary)',
    jss: 'ages 12-15 (junior secondary)',
    sss: 'ages 15-18 (senior secondary)',
};

export interface GameQuestionParams {
    schoolId: string;
    branchId?: string | null;
    /** Whose history to check against / record. For shared multiplayer rounds
     * (e.g. Class Battle) this can be the host's id — see `historyScope`. */
    studentId: string;
    gameType: string;
    subject: string;
    grade: number | null | undefined;
    count: number;
    /** 'student' = never repeat a question this specific student has seen.
     *  'school'  = never repeat a question anyone in this school/subject has
     *  recently seen for this game — used for shared rounds (e.g. Class
     *  Battle) where the same question set is answered by many students at
     *  once, so per-student history isn't the right unit of "repeat". */
    historyScope?: 'student' | 'school';
}

async function getRecentQuestionTexts(params: GameQuestionParams): Promise<string[]> {
    const { schoolId, studentId, gameType, subject, historyScope = 'student' } = params;
    const rows = await prisma.gameQuestionHistory.findMany({
        where: {
            school_id: schoolId,
            game_type: gameType,
            subject: normaliseSubject(subject),
            ...(historyScope === 'student' ? { student_id: studentId } : {}),
        },
        orderBy: { created_at: 'desc' },
        take: 60,
        select: { question_text: true },
    });
    return rows.map(r => r.question_text);
}

async function recordShownQuestions(params: GameQuestionParams, questions: BattleQuestion[]): Promise<void> {
    if (questions.length === 0) return;
    await prisma.gameQuestionHistory.createMany({
        data: questions.map(q => ({
            student_id: params.studentId,
            game_type: params.gameType,
            subject: normaliseSubject(params.subject),
            question_text: q.prompt,
            school_id: params.schoolId,
            branch_id: params.branchId || null,
        })),
    });
}

async function callGemini(prompt: string): Promise<any[]> {
    const key = config.googleTranslateApiKey;
    if (!key) throw new Error('Gemini API key is not configured');

    const requestBody = JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.9, // variety matters more than determinism here
            responseMimeType: 'application/json',
            responseSchema: {
                type: 'ARRAY',
                items: {
                    type: 'OBJECT',
                    properties: {
                        prompt: { type: 'STRING' },
                        options: { type: 'ARRAY', items: { type: 'STRING' } },
                        correctIndex: { type: 'INTEGER' },
                        explanation: { type: 'STRING' },
                    },
                    required: ['prompt', 'options', 'correctIndex', 'explanation'],
                },
            },
        },
    });

    let res: any = null;
    let lastErr = '';
    for (let attempt = 0; attempt < 2; attempt++) {
        // A game screen is a real person watching a spinner — never let a slow
        // or hung network call block them past a few seconds before falling
        // back to the offline question bank.
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        try {
            res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(key)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: requestBody,
                signal: controller.signal,
            });
            if (res.ok) break;
            lastErr = `Gemini ${res.status}`;
            if (res.status < 500) break;
        } catch (e: any) {
            lastErr = e?.name === 'AbortError' ? 'timed out' : (e?.message || 'network error');
        } finally {
            clearTimeout(timeout);
        }
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }

    if (!res || !res.ok) {
        const body = res ? await res.text().catch(() => '') : '';
        throw new Error(`${lastErr}: ${body.slice(0, 300)}`);
    }

    const json: any = await res.json();
    const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error('Gemini returned a non-array response');
    return parsed;
}

/**
 * Generate `count` fresh multiple-choice questions for a subject/grade,
 * avoiding anything this student (or school, for shared rounds) has already
 * been asked in this game. Returns BattleQuestion[] — the same shape the
 * existing offline content bank produces, so callers can use either
 * interchangeably.
 */
export async function generateAIQuestions(params: GameQuestionParams): Promise<BattleQuestion[]> {
    const band = gradeBand(params.grade);
    const bandLabel = BAND_LABEL[band];
    const subjectKey = normaliseSubject(params.subject);
    const avoid = await getRecentQuestionTexts(params);

    const prompt =
        `You are writing multiple-choice quiz questions for a school game app used in Nigerian schools. ` +
        `Write ${params.count} fresh, original questions for the subject "${params.subject}" (category: ${subjectKey}), ` +
        `suitable for students ${bandLabel}.\n` +
        `Rules:\n` +
        `- Each question needs exactly 4 short answer options, with exactly one correct answer.\n` +
        `- "correctIndex" is the 0-based index of the correct option.\n` +
        `- Keep questions age-appropriate, curriculum-relevant, and varied in topic within the subject.\n` +
        `- Include a short one-sentence "explanation" of the correct answer.\n` +
        (avoid.length > 0
            ? `- Do NOT reuse or closely rephrase any of these previously-asked questions:\n${avoid.map(q => `  - ${q}`).join('\n')}\n`
            : '') +
        `Return ONLY the JSON array, no commentary.`;

    const raw = await callGemini(prompt);
    const questions: BattleQuestion[] = raw
        .filter((q: any) => q?.prompt && Array.isArray(q.options) && q.options.length === 4 && typeof q.correctIndex === 'number')
        .map((q: any, i: number) => ({
            id: `ai-${Date.now()}-${i}`,
            prompt: String(q.prompt),
            options: q.options.map(String),
            answer: q.correctIndex,
            explanation: String(q.explanation || ''),
        }));

    if (questions.length === 0) throw new Error('Gemini returned no usable questions');

    await recordShownQuestions(params, questions).catch(() => {
        // Non-fatal: worst case a question repeats a little sooner than ideal.
    });

    return questions;
}
