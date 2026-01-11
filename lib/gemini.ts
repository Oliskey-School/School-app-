
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini Client
// WARNING: VITE_GEMINI_API_KEY must be set in .env
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-1.5-flash"; // Or use "gemini-pro" depending on access

let genAI: GoogleGenerativeAI | null = null;
if (API_KEY) {
    genAI = new GoogleGenerativeAI(API_KEY);
} else {
    console.warn("Missing VITE_GEMINI_API_KEY. AI features will not work.");
}

export interface TimetableRequest {
    className: string;
    subjects: string[];
    teachers: { id: any; name: string }[];
    periodsPerDay: number; // e.g. 8
    days: string[]; // ['Monday', 'Tuesday', ...]
}

export interface GeneratedSchedule {
    schedule: { [key: string]: string }; // "Monday-0": "Math"
    assignments: { [key: string]: string }; // "Monday-0": "Mr. Smith"
}

export async function generateTimetableAI(data: TimetableRequest): Promise<GeneratedSchedule> {
    if (!genAI) {
        throw new Error("Gemini API Key is missing. Please check your settings.");
    }

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = `
    You are an expert school timetable scheduler.
    Create a weekly timetable for a class with the following details:
    
    Class: ${data.className}
    Subjects: ${data.subjects.join(", ")}
    Teachers: ${data.teachers.map(t => t.name).join(", ")}
    Days: ${data.days.join(", ")}
    Periods per day: ${data.periodsPerDay}
    
    Constraints:
    1. Distribute subjects evenly across the week.
    2. Assign a teacher to each slot from the provided list (try to match subject expertise if implied by name, otherwise random).
    3. Return ONLY valid JSON. No markdown formatting.
    4. The JSON must match this structure:
    {
      "schedule": { "Day-PeriodIndex": "SubjectName" },
      "assignments": { "Day-PeriodIndex": "TeacherName" }
    }
    Example Key: "Monday-0" for first period on Monday.
  `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Cleanup logic if AI adds markdown code blocks
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();

        const json = JSON.parse(text);
        return json as GeneratedSchedule;
    } catch (error) {
        console.error("AI Generation Error:", error);
        throw new Error("Failed to generate timetable. Please try again.");
    }
}

export interface AIQuestion {
    id: number;
    subject: string;
    text: string;
    options: string[];
    correctAnswer: number;
    explanation?: string;
}

export async function generateExamQuestions(subject: string, topic: string = "General", difficulty: string = "Medium", count: number = 10): Promise<AIQuestion[]> {
    if (!genAI) {
        console.warn("Gemini API not initialized, returning mock questions.");
        return [];
    }

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = `
    You are an expert exam question generator for Nigerian Senior Secondary School students (SS1-SS3), preparing for JAMB/WAEC.
    Create ${count} multiple-choice questions on the subject "${subject}" focusing on the topic "${topic}".
    Difficulty Level: ${difficulty}.

    Return ONLY valid JSON array. No markdown.
    Format:
    [
      {
        "id": 1,
        "subject": "${subject}",
        "text": "Question text here",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": 0, // Index of correct option (0-3)
        "explanation": "Brief explanation of the answer"
      }
    ]
  `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();

        const json = JSON.parse(text);
        return json as AIQuestion[];
    } catch (error) {
        console.error("AI Exam Generation Error:", error);
        return [];
    }
}
