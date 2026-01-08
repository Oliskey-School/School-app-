
import { GoogleGenerativeAI, GenerationConfig } from "@google/generative-ai";

const GEMINI_MODEL_NAME = "gemini-2.5-flash"; // Or compatible

export class AIService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(apiKey: string) {
        if (!apiKey) {
            throw new Error("AI Service requires an API Key");
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME });
    }

    async generateContent(prompt: string, systemInstruction?: string): Promise<string> {
        try {
            const generationConfig: GenerationConfig = {
                temperature: 0.2,
                maxOutputTokens: 1000,
                responseMimeType: "application/json"
            };

            // Note: systemInstruction is supported in newer SDK versions. 
            // If strictly needed as a separate param, we use model.startChat or specific headers.
            // But getGenerativeModel config supports it.
            const model = this.genAI.getGenerativeModel({
                model: GEMINI_MODEL_NAME,
                systemInstruction: systemInstruction
            });

            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig
            });

            const response = await result.response;
            return response.text();
        } catch (error: any) {
            console.error("AI Service Generation Error:", error);
            throw new Error(`AI Generation Failed: ${error.message}`);
        }
    }
}
