
import React, { useState, useCallback } from 'react';
import { getAIClient, AI_MODEL_NAME, SchemaType as Type } from '../../../lib/ai';
import { toast } from 'react-hot-toast';
import HomeScreen from './HomeScreen';
import LoadingScreen from './LoadingScreen';
import QuizScreen from './QuizScreen';
import ResultsScreen from './ResultsScreen';
import { AdventureData, AdventureDifficulty, UserAnswer } from '../../../types';

const fileToText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
    });
};

const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
    return {
        inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
};

type AdventureContent = { type: 'text', content: string } | { type: 'media', content: { inlineData: { data: string; mimeType: string; } } };

const AdventureQuestHost: React.FC<{ handleBack: () => void }> = ({ handleBack }) => {
    const [appState, setAppState] = useState<'home' | 'loading' | 'quiz' | 'results'>('home');
    const [adventureData, setAdventureData] = useState<AdventureData | null>(null);
    const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
    const [error, setError] = useState<string | null>(null);

    const generateAdventure = useCallback(async (adventureContent: AdventureContent, difficulty: AdventureDifficulty) => {
        setAppState('loading');
        setError(null);
        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
            if (!apiKey) {
                setError("Configuration Error: API Key is missing. Please check your settings.");
                setAppState('home');
                return;
            }
            const ai = getAIClient(apiKey);

            const sourceContentDescription = adventureContent.type === 'text'
                ? 'the following text'
                : 'the attached image/video';

            const systemPrompt = `
                You are an expert educator and creative storyteller for children. Your task is to transform ${sourceContentDescription} into an interactive learning adventure based on the selected difficulty level.

                Difficulty Level: "${difficulty}"

                Based on the content and difficulty, generate a JSON object with two main parts: "study_guide" and "quiz".

                1.  **study_guide**: Create a comprehensive study guide. It should have a main "title" and a list of "sections". Each section must have a "title" (like 'Main Idea', 'Key People', 'Key Terms', 'Fun Facts') and "content" (a string, possibly with markdown for formatting). The complexity and depth of the content should match the difficulty level.

                2.  **quiz**: Create a quiz with up to 15 multiple-choice questions. The difficulty should ramp up, with a mix of easy, medium, and hard questions relative to the selected age group. Each question in the quiz array must be a JSON object with these fields:
                    - "id": A unique integer for the question (starting from 1).
                    - "question": The question text, phrased appropriately for the age group.
                    - "options": An array of several string options. One must be the correct answer.
                    - "correct_answer": The exact string of the correct answer from the "options" array.
                    - "explanation": A simple, one-sentence explanation for why the correct answer is right. This will be shown to the user if they get the answer wrong.
                    - "image_prompt": A creative, detailed, and safe-for-kids DALL-E style prompt to generate a vibrant, illustrative, and imaginative cartoon-style image related to the question. For example: "A friendly cartoon lion wearing a crown, explaining the food chain to a group of curious cartoon animals in a sunny savanna, digital art".
                    - "background_theme": A single keyword for the background style (e.g., 'jungle', 'space', 'ocean', 'castle', 'desert', 'lab').
            `;

            let contents;
            if (adventureContent.type === 'text') {
                contents = `${systemPrompt}\n\nSource Content:\n---\n${adventureContent.content.substring(0, 30000)}\n---`;
            } else { // media
                contents = { parts: [{ text: systemPrompt }, adventureContent.content] };
            }

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: contents,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            study_guide: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    sections: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, content: { type: Type.STRING } }, required: ["title", "content"] } }
                                },
                                required: ["title", "sections"]
                            },
                            quiz: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        id: { type: Type.INTEGER },
                                        question: { type: Type.STRING },
                                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                        correct_answer: { type: Type.STRING },
                                        explanation: { type: Type.STRING },
                                        image_prompt: { type: Type.STRING },
                                        background_theme: { type: Type.STRING }
                                    },
                                    required: ["id", "question", "options", "correct_answer", "explanation", "image_prompt", "background_theme"]
                                }
                            }
                        },
                        required: ["study_guide", "quiz"]
                    }
                }
            });
            const data: AdventureData = JSON.parse(response.text.trim());
            if (!data.quiz || !data.study_guide) throw new Error("Invalid data structure from AI.");
            setAdventureData(data);
            setAppState('quiz');
        } catch (e) {
            console.error(e);
            setError("Oh no! The magic scroll got smudged. We couldn't create your adventure. Please try again with a different text or file.");
            setAppState('home');
        }
    }, []);

    const handleStartAdventure = useCallback(async (source: { type: 'file'; value: File } | { type: 'url'; value: string }, difficulty: AdventureDifficulty) => {
        if (source.type === 'url') {
            const content = `(This is a demo using content from ${source.value}) In 1492, Columbus sailed the ocean blue. He was an explorer who made four trips across the Atlantic Ocean.`;
            toast("URL fetching is for demo purposes only. Using sample text.", { icon: 'ℹ️' });
            await generateAdventure({ type: 'text', content }, difficulty);
            return;
        }

        const file = source.value;
        const fileType = file.type;

        if (fileType.startsWith('image/') || fileType.startsWith('video/')) {
            try {
                const part = await fileToGenerativePart(file);
                await generateAdventure({ type: 'media', content: part }, difficulty);
            } catch (e) {
                setError("Could not process the uploaded media file.");
                setAppState('home');
            }
        } else { // Assume it's a text-based file
            try {
                const content = await fileToText(file);
                await generateAdventure({ type: 'text', content }, difficulty);
            } catch (e) {
                setError("Could not read the uploaded file. Please ensure it's a valid text, image, or video file.");
                setAppState('home');
            }
        }
    }, [generateAdventure]);

    const handleQuizComplete = (answers: UserAnswer[]) => {
        setUserAnswers(answers);
        setAppState('results');
    };

    const handleRestart = () => {
        setAdventureData(null);
        setUserAnswers([]);
        setError(null);
        setAppState('home');
    };

    const renderContent = () => {
        switch (appState) {
            case 'loading':
                return <LoadingScreen />;
            case 'quiz':
                return adventureData ? <QuizScreen adventureData={adventureData} onQuizComplete={handleQuizComplete} /> : null;
            case 'results':
                return adventureData ? <ResultsScreen adventureData={adventureData} userAnswers={userAnswers} onRestart={handleRestart} /> : null;
            case 'home':
            default:
                return <HomeScreen onStartAdventure={handleStartAdventure} error={error} />;
        }
    };

    return <div className="h-full">{renderContent()}</div>;
};

export default AdventureQuestHost;
