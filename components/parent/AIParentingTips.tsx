
import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Student } from '../../types';
import { CheckCircleIcon, TrendingUpIcon, MessagesIcon, SparklesIcon } from '../../constants';

interface Tip {
    category: string;
    content: string[];
}

interface AIParentingTipsScreenProps {
    student: Student;
}

const AIParentingTipsScreen: React.FC<AIParentingTipsScreenProps> = ({ student }) => {
    const [tips, setTips] = useState<Tip[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const generateTips = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

                const academicSummary = student.academicPerformance
                    ?.slice(-4) // get latest 4 records
                    .map(p => `${p.subject}: ${p.score}%`)
                    .join(', ');
                
                const behaviorSummary = student.behaviorNotes
                    ?.map(n => `${n.type} note - ${n.title}: ${n.note}`)
                    .join('; ');

                const prompt = `
                    Based on the following data for a student named ${student.name}, generate personalized parenting tips.
                    The tips should be constructive, encouraging, and actionable for a parent.

                    Student Data:
                    - Academic Performance (Recent): ${academicSummary || 'No recent academic data.'}
                    - Behavioral Notes: ${behaviorSummary || 'No behavioral notes.'}

                    Provide tips in three categories: 'Strengths to Encourage', 'Areas for Support', and 'Conversation Starters'.
                    Each category should have 2-3 brief, distinct tips as a list of strings.
                `;

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                tips: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            category: { type: Type.STRING },
                                            content: {
                                                type: Type.ARRAY,
                                                items: { type: Type.STRING }
                                            }
                                        },
                                        required: ["category", "content"]
                                    }
                                }
                            },
                            required: ["tips"]
                        }
                    }
                });

                const jsonResponse = JSON.parse(response.text.trim());
                if (jsonResponse.tips) {
                    setTips(jsonResponse.tips);
                } else {
                    throw new Error("Invalid response format from AI.");
                }

            } catch (err) {
                console.error("Error generating parenting tips:", err);
                setError("Sorry, we couldn't generate tips at this moment. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };

        generateTips();
    }, [student]);

    const categoryIcons: { [key: string]: React.ReactNode } = {
        'Strengths to Encourage': <CheckCircleIcon className="h-6 w-6 text-green-500" />,
        'Areas for Support': <TrendingUpIcon className="h-6 w-6 text-amber-500" />,
        'Conversation Starters': <MessagesIcon className="h-6 w-6 text-sky-500" />,
    };

    if (isLoading) {
        return (
            <div className="p-6 flex flex-col items-center justify-center h-full text-center bg-gray-50">
                <SparklesIcon className="w-12 h-12 text-green-400 animate-pulse mb-4"/>
                <h2 className="text-xl font-bold text-gray-700">Generating Personalized Tips...</h2>
                <p className="text-gray-500 mt-2">Our AI is analyzing {student.name}'s progress to provide helpful insights.</p>
            </div>
        );
    }
    
    if (error) {
         return (
            <div className="p-6 flex flex-col items-center justify-center h-full text-center bg-gray-50">
                <h2 className="text-xl font-bold text-red-600">Oops!</h2>
                <p className="text-gray-600 mt-2">{error}</p>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4 bg-gray-50">
             <div className="bg-green-50 p-4 rounded-xl text-center border border-green-200">
                <SparklesIcon className="h-10 w-10 mx-auto text-green-400 mb-2"/>
                <h3 className="font-bold text-lg text-green-800">Parenting Tips for {student.name}</h3>
                <p className="text-sm text-green-700">Powered by AI to help your child thrive.</p>
            </div>
            {tips?.map((tipSection, index) => (
                <div key={index} className="bg-white rounded-xl shadow-sm p-4">
                    <div className="flex items-center space-x-3 mb-3">
                        {categoryIcons[tipSection.category] || <SparklesIcon className="h-6 w-6 text-gray-500" />}
                        <h4 className="font-bold text-lg text-gray-800">{tipSection.category}</h4>
                    </div>
                    <ul className="space-y-2 list-disc list-inside text-gray-700">
                        {tipSection.content.map((item, idx) => (
                           <li key={idx} className="prose prose-sm max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{item}</ReactMarkdown></li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
};

export default AIParentingTipsScreen;
