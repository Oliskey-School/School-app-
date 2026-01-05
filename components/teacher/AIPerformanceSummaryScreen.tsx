import React, { useState, useEffect, useMemo } from 'react';
import { getAIClient, AI_MODEL_NAME, SchemaType as Type } from '../../lib/ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Student } from '../../types';
import { AIIcon, CheckCircleIcon, TrendingUpIcon, UserGroupIcon } from '../../constants';

interface SummaryData {
    overallSummary: string;
    topPerformers: { name: string; reason: string }[];
    studentsNeedingSupport: { name: string; reason: string }[];
}

interface AIPerformanceSummaryScreenProps {
    students: Student[];
}

const AIPerformanceSummaryScreen: React.FC<AIPerformanceSummaryScreenProps> = ({ students }) => {
    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const generateSummary = async () => {
            if (students.length === 0) {
                setError("No student data available to generate a summary.");
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const ai = getAIClient(import.meta.env.VITE_GEMINI_API_KEY || '');
                const studentDataForPrompt = students.map(s => {
                    const latestGrades = s.academicPerformance?.slice(-3).map(p => `${p.subject}: ${p.score}%`).join(', ') || 'N/A';
                    const behavior = s.behaviorNotes?.map(n => `${n.type}: ${n.title}`).join(', ') || 'No notes';
                    return `- ${s.name}: Grades=[${latestGrades}], Behavior=[${behavior}]`;
                }).join('\n');

                const prompt = `
                    Analyze the following student data for a class and provide a concise summary for the teacher.
                    
                    Class Data:
                    ${studentDataForPrompt}

                    The summary should help the teacher quickly understand class dynamics. Identify top-performing students and students who might need extra support, providing a brief reason for each.
                `;

                const response = await ai.models.generateContent({
                    model: 'gemini-2.0-flash',
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                overallSummary: { type: Type.STRING, description: "A brief, 2-3 sentence summary of the class's overall performance and atmosphere." },
                                topPerformers: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            name: { type: Type.STRING },
                                            reason: { type: Type.STRING, description: "A short, specific reason why this student is a top performer." }
                                        },
                                        required: ["name", "reason"]
                                    },
                                    description: "A list of 2-3 students who are excelling academically or behaviorally."
                                },
                                studentsNeedingSupport: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            name: { type: Type.STRING },
                                            reason: { type: Type.STRING, description: "A short, specific reason why this student might need support." }
                                        },
                                        required: ["name", "reason"]
                                    },
                                    description: "A list of 2-3 students who might need extra attention, either academically or behaviorally."
                                }
                            },
                            required: ["overallSummary", "topPerformers", "studentsNeedingSupport"]
                        }
                    }
                });

                const rawText = response.text ? response.text.trim() : '';

                if (!rawText || rawText.startsWith('Error') || rawText.startsWith("I'm sorry")) {
                    throw new Error(rawText || "AI returned an error message.");
                }

                const sanitizedText = rawText.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();

                let jsonResponse;
                try {
                    jsonResponse = JSON.parse(sanitizedText);
                } catch (e) {
                    console.error("Performance Summary JSON Parse Error", rawText);
                    throw new Error("AI generated an invalid format.");
                }
                setSummary(jsonResponse);

            } catch (err) {
                console.error("Error generating AI summary:", err);
                setError("Sorry, we couldn't generate the summary. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };

        generateSummary();
    }, [students]);

    if (isLoading) {
        return (
            <div className="p-6 flex flex-col items-center justify-center h-full text-center bg-gray-100">
                <AIIcon className="w-12 h-12 text-purple-400 animate-pulse mb-4" />
                <h2 className="text-xl font-bold text-gray-700">Analyzing Class Performance...</h2>
                <p className="text-gray-500 mt-2">The AI is crunching the numbers to provide you with actionable insights.</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-center bg-gray-100 h-full">
                <h2 className="text-xl font-bold text-red-600">Error</h2>
                <p className="text-gray-600 mt-2">{error}</p>
            </div>
        );
    }

    return (
        <div className="p-4 bg-gray-100">
            {summary && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-4">
                        <div className="flex items-center space-x-3 mb-3">
                            <UserGroupIcon className="h-6 w-6 text-purple-600" />
                            <h4 className="font-bold text-lg text-gray-800">Overall Summary</h4>
                        </div>
                        <div className="prose prose-sm max-w-none text-gray-700">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary.overallSummary}</ReactMarkdown>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-4">
                        <div className="flex items-center space-x-3 mb-3">
                            <CheckCircleIcon className="h-6 w-6 text-green-500" />
                            <h4 className="font-bold text-lg text-gray-800">Top Performers</h4>
                        </div>
                        <ul className="space-y-3">
                            {summary.topPerformers.map((student, idx) => (
                                <li key={idx} className="flex items-start space-x-3">
                                    <img src={students.find(s => s.name === student.name)?.avatarUrl} alt={student.name} className="w-10 h-10 rounded-full object-cover" />
                                    <div>
                                        <p className="font-semibold text-gray-800">{student.name}</p>
                                        <p className="text-sm text-gray-600">{student.reason}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-4">
                        <div className="flex items-center space-x-3 mb-3">
                            <TrendingUpIcon className="h-6 w-6 text-amber-500" />
                            <h4 className="font-bold text-lg text-gray-800">Students Needing Support</h4>
                        </div>
                        <ul className="space-y-3">
                            {summary.studentsNeedingSupport.map((student, idx) => (
                                <li key={idx} className="flex items-start space-x-3">
                                    <img src={students.find(s => s.name === student.name)?.avatarUrl} alt={student.name} className="w-10 h-10 rounded-full object-cover" />
                                    <div>
                                        <p className="font-semibold text-gray-800">{student.name}</p>
                                        <p className="text-sm text-gray-600">{student.reason}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIPerformanceSummaryScreen;
