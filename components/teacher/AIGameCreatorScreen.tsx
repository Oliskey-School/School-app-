import React, { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { getAIClient, AI_MODEL_NAME, SchemaType as Type } from '../../lib/ai';
import { AIGame, AIGameQuestion, GameLevel } from '../../types';
import { mockCustomAIGames } from '../../data';
import { AIIcon, SparklesIcon, TrashIcon, PlusIcon, XCircleIcon, CheckCircleIcon, EditIcon, PlayIcon, PublishIcon } from '../../constants';



interface AIGameCreatorScreenProps {
    navigateTo: (view: string, title: string, props: any) => void;
    handleBack: () => void;
    forceUpdate: () => void;
    teacherId?: number | null;
}

const GeneratingScreen: React.FC = () => (
    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-50 animate-fade-in">
        <SparklesIcon className="w-16 h-16 text-white animate-spin" />
        <p className="text-white font-semibold mt-4 text-lg">Generating Your Game...</p>
        <p className="text-white/80 mt-2 text-sm max-w-xs text-center">Our AI is crafting questions, answers, and fun explanations!</p>
    </div>
);

const AIGameCreatorScreen: React.FC<AIGameCreatorScreenProps> = ({ navigateTo, handleBack, forceUpdate, teacherId }) => {
    const [step, setStep] = useState<'setup' | 'review'>('setup');
    const [isGenerating, setIsGenerating] = useState(false);

    // Setup state
    const [subject, setSubject] = useState('');
    const [topic, setTopic] = useState('');
    const [level, setLevel] = useState<GameLevel>('Junior Secondary (12-14 years)');

    // Review state
    const [game, setGame] = useState<AIGame | null>(null);

    const handleGenerate = async () => {
        if (!subject || !topic || !level) {
            toast.error("Please fill in all fields.");
            return;
        }
        setIsGenerating(true);
        try {
            const ai = getAIClient(import.meta.env.VITE_GEMINI_API_KEY || '');
            const prompt = `You are an expert educational game designer. Create a multiple-choice quiz game based on these criteria:\n- Subject: ${subject}\n- Topic: ${topic}\n- Class Level: ${level}\nGenerate a JSON object for a quiz with 10 questions.`;

            const response = await ai.models.generateContent({
                model: AI_MODEL_NAME,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            gameName: { type: Type.STRING, description: "A creative, short name for the quiz." },
                            questions: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        id: { type: Type.STRING },
                                        question: { type: Type.STRING },
                                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                        correctAnswer: { type: Type.STRING },
                                        explanation: { type: Type.STRING }
                                    },
                                    required: ["id", "question", "options", "correctAnswer", "explanation"]
                                }
                            }
                        },
                        required: ["gameName", "questions"]
                    }
                }
            });

            const rawText = response.text ? response.text.trim() : '';

            if (!rawText || rawText.startsWith('Error') || rawText.startsWith("I'm sorry")) {
                throw new Error(rawText || "AI returned an error message.");
            }

            // Sanitize
            const sanitizedText = rawText.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();

            let generatedData;
            try {
                generatedData = JSON.parse(sanitizedText);
            } catch (e) {
                console.error("Game Creation JSON Parse Error", rawText);
                throw new Error("AI generated an invalid format. Please try again.");
            }
            setGame({
                id: `game-${Date.now()}`,
                gameName: generatedData.gameName,
                subject,
                topic,
                level,
                creatorId: teacherId || 2,
                status: 'Draft',
                questions: generatedData.questions,
            });
            setStep('review');
        } catch (error) {
            console.error("Game generation error:", error);
            toast.error("Failed to generate the game. The AI might be busy. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePublish = () => {
        if (!game) return;
        const publishedGame = { ...game, status: 'Published' as const };

        // In a real app, this would be an API call. Here we update the mock data.
        mockCustomAIGames.push(publishedGame);

        toast.success(`Game "${game.gameName}" has been published!`);
        forceUpdate(); // To update views that use this data
        handleBack();
    };

    // A simplified review screen for brevity. A real app would have full editing.
    const renderReviewStep = () => (
        <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-sm">
                <h3 className="text-xl font-bold text-gray-800">{game?.gameName}</h3>
                <p className="text-gray-600">{game?.subject} - {game?.topic}</p>
            </div>
            <div className="space-y-2">
                {game?.questions.map((q, index) => (
                    <div key={index} className="bg-white p-3 rounded-lg shadow-sm">
                        <p className="font-semibold text-gray-800">{index + 1}. {q.question}</p>
                        <p className="text-sm text-green-600 mt-1">✓ {q.correctAnswer}</p>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-gray-100 relative">
            {isGenerating && <GeneratingScreen />}
            <main className="flex-grow p-4 space-y-5 overflow-y-auto pb-24">
                {step === 'setup' && (
                    <div className="space-y-4">
                        <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                            <div>
                                <label className="font-semibold text-gray-700">Subject</label>
                                <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g., Biology" className="w-full mt-1 p-2 border rounded-md" />
                            </div>
                            <div>
                                <label className="font-semibold text-gray-700">Topic</label>
                                <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g., The Human Heart" className="w-full mt-1 p-2 border rounded-md" />
                            </div>
                            <div>
                                <label className="font-semibold text-gray-700">Class Level</label>
                                <select value={level} onChange={e => setLevel(e.target.value as GameLevel)} className="w-full mt-1 p-2 border rounded-md bg-white">
                                    <option>Junior Secondary (12-14 years)</option>
                                    <option>Senior Secondary (15-18 years)</option>
                                    <option>Upper Primary (9-11 years)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
                {step === 'review' && game && renderReviewStep()}
            </main>
            <footer className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-200 sticky bottom-0">
                {step === 'setup' && (
                    <button onClick={handleGenerate} className="w-full py-3 bg-purple-600 text-white font-bold rounded-lg shadow-md flex items-center justify-center space-x-2">
                        <AIIcon className="w-5 h-5" />
                        <span>Generate Game</span>
                    </button>
                )}
                {step === 'review' && game && (
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => navigateTo('gamePlayer', `Test: ${game.gameName}`, { game, mode: 'test' })} className="py-3 bg-sky-500 text-white font-bold rounded-lg shadow-sm flex items-center justify-center space-x-2">
                            <PlayIcon className="w-5 h-5" />
                            <span>Test Game</span>
                        </button>
                        <button onClick={handlePublish} className="py-3 bg-green-500 text-white font-bold rounded-lg shadow-sm flex items-center justify-center space-x-2">
                            <PublishIcon className="w-5 h-5" />
                            <span>Publish</span>
                        </button>
                    </div>
                )}
            </footer>
        </div>
    );
};

export default AIGameCreatorScreen;
