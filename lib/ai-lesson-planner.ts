/**
 * AI Lesson Planner Service
 * Generates structured lesson plans aligned with the Nigerian National Curriculum.
 */

import { getAIClient } from './ai';
import { supabase } from './supabase';

export interface LessonPlan {
    topic: string;
    objectives: string[];
    materials: string[];
    activities: string[];
    evaluation: string[];
    resources_nigeria?: string[]; // Suggests locally available materials
}

/**
 * Generates a full lesson plan using Gemini.
 */
export async function generateLessonPlan(
    subject: string,
    topic: string,
    gradeLevel: string
): Promise<LessonPlan | null> {
    const ai = getAIClient();
    
    const systemPrompt = `You are an expert curriculum designer for Nigerian primary and secondary education.
    Generate a lesson plan following the structure:
    {
      "topic": "string",
      "objectives": ["list"],
      "materials": ["list"],
      "activities": ["Introduction, Development, Conclusion"],
      "evaluation": ["questions"],
      "resources_nigeria": ["suggest locally available teaching aids found in Nigeria, e.g., crown corks for counting"]
    }
    Aling strictly with Nigerian National Curriculum standards for ${gradeLevel}.`;

    const prompt = `Subject: ${subject}\nTopic: ${topic}\nGrade: ${gradeLevel}`;

    try {
        const result = await ai.generateContent({
            contents: prompt,
            generationConfig: { responseMimeType: "application/json" },
            systemInstruction: { parts: [{ text: systemPrompt }] }
        });

        const plan: LessonPlan = JSON.parse(result.text);

        // Optional: Save to DB
        // await supabase.from('lesson_plans').insert({ ...plan, subject, grade_level: gradeLevel });

        return plan;
    } catch (error) {
        console.error('❌ AI Lesson Planning failed:', error);
        return null;
    }
}
