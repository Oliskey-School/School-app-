
import { api } from './api';



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
        const data = await api.post<AIResponse>('/ai/assistant', {
            question,
            options
        });
        
        return data;

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

