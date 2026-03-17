/**
 * AI Grading Service
 * Uses Gemini to provide automated assessment and feedback for students.
 */

import { getAIClient } from './ai';

export interface GradingResult {
    score: number;
    maxScore: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
    suggestedModelAnswer?: string;
}

/**
 * Assesses a student's written submission against a rubric.
 */
export async function assessSubmission(
    submission: string,
    rubric: string,
    assignmentTitle: string
): Promise<GradingResult | null> {
    const ai = getAIClient();
    
    const systemPrompt = `You are an expert educator. Grade the student's submission for the assignment "${assignmentTitle}" based on the provided rubric.
    Return a JSON object with:
    {
      "score": number,
      "maxScore": number,
      "feedback": "detailed summary",
      "strengths": ["list"],
      "improvements": ["list"],
      "suggestedModelAnswer": "short example of a perfect response"
    }`;

    const prompt = `Rubric: ${rubric}\n\nStudent Submission: ${submission}`;

    try {
        const result = await ai.generateContent({
            contents: prompt,
            generationConfig: { responseMimeType: "application/json" },
            systemInstruction: { parts: [{ text: systemPrompt }] }
        });

        return JSON.parse(result.text);
    } catch (error) {
        console.error('❌ AI Grading failed:', error);
        return null;
    }
}

/**
 * Generates automated feedback for a quiz attempt.
 */
export async function generateQuizFeedback(
    questions: any[],
    studentAnswers: any[]
): Promise<string> {
    const ai = getAIClient();
    
    const prompt = `Review these quiz results and provide a motivational summary for the student.
    Questions: ${JSON.stringify(questions)}
    Answers: ${JSON.stringify(studentAnswers)}`;

    try {
        const result = await ai.generateContent({
            contents: prompt,
            systemInstruction: { parts: [{ text: "Keep it encouraging and brief (max 3 sentences)." }] }
        });

        return result.text;
    } catch (error) {
        return "Great effort on the quiz! Keep studying.";
    }
}
