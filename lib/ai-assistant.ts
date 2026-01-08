
import { supabase } from './supabase';

const BACKEND_URL = 'http://localhost:5000'; // Should be env var in production

export interface AIResponse {
    answer: string;
    summary: string;
    sources: string[];
    tokens_estimate: number;
    cached: boolean;
    image_needed: boolean;
    image_instructions: string;
}

export const generateAIResponse = async (question: string, options: { image_needed?: boolean } = {}): Promise<AIResponse> => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const response = await fetch(`${BACKEND_URL}/api/ai/assistant`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token || ''}`
            },
            body: JSON.stringify({
                question,
                options
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Backend API Error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        return data as AIResponse;

    } catch (error: any) {
        console.error("AI Assistant Error:", error);
        // Return fallback to prevent UI crash
        return {
            answer: "I'm having trouble connecting to the school assistant server. Please ensure the backend is running.",
            summary: "Connection Error",
            sources: [],
            tokens_estimate: 0,
            cached: false,
            image_needed: false,
            image_instructions: ""
        };
    }
};
