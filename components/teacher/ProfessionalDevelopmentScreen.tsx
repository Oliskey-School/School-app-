import React, { useState, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PDResource } from '../../types';
import { mockPdResources } from '../../data';
import { BriefcaseIcon, AIIcon } from '../../constants';

const ResourceCard: React.FC<{ resource: PDResource }> = ({ resource }) => {
    const typeStyles = {
        Article: 'bg-sky-100 text-sky-800',
        Video: 'bg-red-100 text-red-800',
        Workshop: 'bg-indigo-100 text-indigo-800',
    };
    return (
        <a href={resource.url} target="_blank" rel="noopener noreferrer" className="block bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${typeStyles[resource.type]}`}>{resource.type}</span>
            <h4 className="font-bold text-gray-800 mt-2">{resource.title}</h4>
            <p className="text-sm text-gray-600 mt-1">{resource.summary}</p>
            <p className="text-xs text-gray-400 mt-2">Source: {resource.source}</p>
        </a>
    );
};

const ProfessionalDevelopmentScreen: React.FC = () => {
    const [challenge, setChallenge] = useState('');
    const [suggestions, setSuggestions] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.API_KEY }), []);

    const handleGenerateSuggestions = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!challenge) return;
        setIsGenerating(true);
        setSuggestions(null);

        try {
            const prompt = `As an expert educational coach, provide a list of 3-5 actionable strategies for a teacher facing this challenge: "${challenge}". The strategies should be practical for a modern classroom. Format the response as a markdown list.`;
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            setSuggestions(response.text);
        } catch (error) {
            console.error("AI Suggestion Error:", error);
            setSuggestions("Sorry, I couldn't generate suggestions at this time. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-100">
            <main className="flex-grow p-4 space-y-6 overflow-y-auto">
                <div className="bg-purple-50 p-4 rounded-xl text-center border border-purple-200">
                    <BriefcaseIcon className="h-10 w-10 mx-auto text-purple-400 mb-2" />
                    <h3 className="font-bold text-lg text-purple-800">Professional Development Hub</h3>
                    <p className="text-sm text-purple-700">Grow your skills and find new teaching strategies.</p>
                </div>

                {/* AI Strategy Suggester */}
                <div className="bg-white p-4 rounded-xl shadow-sm">
                    <div className="flex items-center space-x-2 mb-3">
                        <AIIcon className="h-6 w-6 text-purple-600" />
                        <h3 className="font-bold text-lg text-gray-800">AI Strategy Suggester</h3>
                    </div>
                    <form onSubmit={handleGenerateSuggestions} className="space-y-3">
                        <textarea
                            value={challenge}
                            onChange={e => setChallenge(e.target.value)}
                            placeholder="Describe a classroom challenge... e.g., 'Keeping students engaged during long lessons'"
                            rows={3}
                            className="w-full p-2 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                        />
                        <button type="submit" disabled={isGenerating || !challenge} className="w-full py-2 bg-purple-600 text-white font-bold rounded-lg shadow-md hover:bg-purple-700 transition-colors disabled:bg-gray-400">
                            {isGenerating ? 'Thinking...' : 'Get Strategies'}
                        </button>
                    </form>
                    {suggestions && (
                        <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                             <div className="prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 text-gray-800">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{suggestions}</ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>

                {/* Curated Resources */}
                <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2 px-1">Curated Resources</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {mockPdResources.map(resource => (
                            <ResourceCard key={resource.id} resource={resource} />
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ProfessionalDevelopmentScreen;