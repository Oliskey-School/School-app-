import { getAIClient } from './ai';
import { syncEngine } from './syncEngine';

/**
 * AI Assistant for Educators.
 * Provides lesson drafting and grading suggestions.
 */
export class AIEducatorService {
    /**
     * Generates a lesson plan draft based on Nigerian/British curriculum.
     */
    static async generateLessonDraft(subject: string, topic: string, grade: string) {
        const ai = getAIClient();
        const prompt = `Act as an expert Nigerian/British curriculum designer. 
        Draft a lesson plan for ${subject} on the topic "${topic}" for ${grade}. 
        Include: Objectives, Introduction, Development, and Evaluation questions. 
        Format as JSON.`;

        try {
            const result = await ai.generateContent({
                contents: prompt,
                generationConfig: { responseMimeType: "application/json" }
            });
            return JSON.parse(result.text);
        } catch (err) {
            console.error('AI Lesson drafting failed:', err);
            return null;
        }
    }

    /**
     * Saves a lesson note draft resiliently.
     * Uses 'draft_offline' status to indicate it was created without internet.
     */
    static async saveDraftResilient(noteData: any) {
        await syncEngine.enqueueAction('LESSON_NOTE', {
            ...noteData,
            status: 'draft_offline',
            created_at: new Date().toISOString()
        });
    }

    /**
     * Suggests a grade and constructive feedback for a student essay/submission.
     */
    static async suggestAssessment(submission: string, rubric: string) {
        const ai = getAIClient();
        const prompt = `Grade this student submission based on the rubric: "${rubric}".
        Submission: "${submission}"
        Provide a suggested score (0-100) and 2 strengths and 2 areas for improvement.`;

        try {
            const result = await ai.generateContent({
                contents: prompt,
                generationConfig: { responseMimeType: "application/json" }
            });
            return JSON.parse(result.text);
        } catch (err) {
            return null;
        }
    }
}
