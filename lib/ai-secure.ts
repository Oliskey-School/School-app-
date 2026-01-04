import { supabase } from './supabase';

/**
 * Secure AI call through Supabase Edge Function
 * Replaces direct API calls to protect API keys
 */
export async function callAI(
    prompt: string,
    options: {
        model?: 'gpt-4' | 'gpt-3.5-turbo' | 'gemini-pro';
        systemPrompt?: string;
        maxTokens?: number;
    } = {}
): Promise<string> {
    try {
        const { data, error } = await supabase.functions.invoke('ai-assistant', {
            body: {
                prompt,
                model: options.model,
                systemPrompt: options.systemPrompt,
                maxTokens: options.maxTokens || 1000,
            },
        });

        if (error) {
            console.error('AI Function Error:', error);
            throw new Error(error.message || 'AI request failed');
        }

        if (!data || !data.response) {
            throw new Error('No response from AI');
        }

        return data.response;
    } catch (error) {
        console.error('AI Call Error:', error);
        throw error;
    }
}

/**
 * Legacy function for backwards compatibility
 * Now routes through Edge Function
 * @deprecated Use callAI instead
 */
export async function generateAIResponse(prompt: string, systemPrompt?: string): Promise<string> {
    return callAI(prompt, { systemPrompt });
}

/**
 * Generate quiz questions using AI
 */
export async function generateQuizQuestions(topic: string, count: number = 5): Promise<any[]> {
    const systemPrompt = `You are a helpful educational assistant. Generate ${count} multiple-choice quiz questions about the following topic. Return ONLY a JSON array of questions, each with: question, options (array of 4 choices), and correctAnswer (the correct option text).`;

    const prompt = `Topic: ${topic}\n\nGenerate ${count} quiz questions.`;

    const response = await callAI(prompt, { systemPrompt, model: 'gpt-3.5-turbo' });

    try {
        return JSON.parse(response);
    } catch {
        // If response isn't pure JSON, try to extract it
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        throw new Error('Failed to parse AI response as quiz questions');
    }
}

/**
 * Get study help from AI
 */
export async function getStudyHelp(question: string, subject?: string): Promise<string> {
    const systemPrompt = subject
        ? `You are a helpful ${subject} tutor. Provide clear, educational explanations suitable for students. Be encouraging and break down complex concepts into simple terms.`
        : 'You are a helpful tutor. Provide clear, educational explanations suitable for students.';

    return callAI(question, { systemPrompt });
}

/**
 * Generate parenting tips
 */
export async function generateParentingTips(studentData: {
    name: string;
    grade: number;
    recentGrades?: number[];
    behaviorNotes?: string[];
}): Promise<string> {
    const systemPrompt = 'You are an educational counselor providing personalized parenting advice. Be supportive, practical, and specific.';

    const prompt = `Generate parenting tips for a parent of ${studentData.name}, a grade ${studentData.grade} student${studentData.recentGrades ? ` with recent grades averaging ${Math.round(studentData.recentGrades.reduce((a, b) => a + b, 0) / studentData.recentGrades.length)}%` : ''
        }${studentData.behaviorNotes?.length ? `. Recent behavioral notes: ${studentData.behaviorNotes.join('; ')}` : ''
        }. Provide 3-5 actionable tips.`;

    return callAI(prompt, { systemPrompt, maxTokens: 500 });
}
