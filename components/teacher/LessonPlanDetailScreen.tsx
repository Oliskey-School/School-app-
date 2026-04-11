
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GeneratedResources, TermResources, GeneratedLessonPlan, GeneratedAssessment, AssessmentQuestion, DetailedNote, GeneratedHistoryEntry } from '../../types';
import { DocumentTextIcon, ShareIcon, BookOpenIcon, ClipboardListIcon, ChevronRightIcon, SparklesIcon, FolderIcon, CheckCircleIcon, RotateCcwIcon, ClockIcon } from '../../constants';
import { api } from '../../lib/api';

const Toast: React.FC<{ message: string; onClear: () => void; }> = ({ message, onClear }) => {
    useEffect(() => {
        const timer = setTimeout(onClear, 3000);
        return () => clearTimeout(timer);
    }, [onClear]);

    return (
        <div className="fixed bottom-24 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 animate-slide-in-up z-50">
            <CheckCircleIcon className="w-5 h-5 text-green-400" />
            <span>{message}</span>
        </div>
    );
};

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
    <h3 className="font-bold text-lg text-purple-800 border-b-2 border-purple-200 pb-1 mb-3">{title}</h3>
);

const SchemeOfWorkTab: React.FC<{ scheme: TermResources['schemeOfWork'] }> = ({ scheme }) => (
    <div className="overflow-x-auto bg-white p-2 rounded-lg border">
        <table className="min-w-full">
            <thead className="bg-gray-100">
                <tr>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase w-24">Week</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Topic</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
                {scheme.map(item => (
                    <tr key={item.week}>
                        <td className="px-4 py-3 font-bold text-gray-800">{item.week}</td>
                        <td className="px-4 py-3 text-gray-700">{item.topic}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);


const LessonPlanLink: React.FC<{ plan: GeneratedLessonPlan, onSuggest: () => void, onClick: () => void }> = ({ plan, onSuggest, onClick }) => {
    return (
        <div className="flex items-center space-x-2">
            <button onClick={onClick} className="flex-grow text-left p-3 font-semibold flex justify-between items-center hover:bg-purple-50 bg-white rounded-lg border group transition-colors">
                <span className="text-purple-800 group-hover:text-purple-900">Week {plan.week}: {plan.topic}</span>
                <ChevronRightIcon className="h-5 w-5 text-gray-400" />
            </button>
            <button 
                onClick={(e) => { e.stopPropagation(); onSuggest(); }}
                className="p-3 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors"
                title="Suggest AI Activity"
            >
                <SparklesIcon className="w-5 h-5" />
            </button>
        </div>
    );
};

const LessonPlansTab: React.FC<{ plans: TermResources['lessonPlans'], notes?: DetailedNote[], context: any, navigateTo: (view: string, title: string, props: any) => void; onSuggestActivity: (topic: string) => void; }> = ({ plans, notes, context, navigateTo, onSuggestActivity }) => {
    const handlePlanClick = (plan: GeneratedLessonPlan) => {
        const noteData = notes?.find(n => n.topic === plan.topic);
        navigateTo('lessonContent', `Week ${plan.week}`, {
            lessonPlan: plan,
            detailedNote: noteData,
            context: context
        });
    };

    // Check if plans exist and have content
    if (!plans || plans.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-300">
                <BookOpenIcon className="h-16 w-16 text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium mb-1">No Lesson Plans Available</p>
                <p className="text-gray-400 text-sm">Generate AI resources to create lesson plans</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {plans.map(plan => (
                <LessonPlanLink 
                    key={plan.week} 
                    plan={plan} 
                    onClick={() => handlePlanClick(plan)} 
                    onSuggest={() => onSuggestActivity(plan.topic)}
                />
            ))}
        </div>
    );
};

const AssessmentDisplay: React.FC<{ assessment: GeneratedAssessment, navigateTo: (view: string, title: string, props?: any) => void; }> = ({ assessment, navigateTo }) => (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h4 className="font-bold text-xl mb-2 text-gray-800">{assessment.type} ({assessment.totalMarks} Marks)</h4>
        {assessment.questions.slice(0, 2).map(q => ( // Show a preview of first 2 questions
            <div key={q.id} className="mb-2 pb-2 border-b last:border-b-0 text-gray-900">
                <p className="font-semibold text-gray-800 truncate">{q.id}. {q.question}</p>
            </div>
        ))}
        <div className="mt-4 border-t pt-3">
            <button
                onClick={() => navigateTo('assignmentView', `Assignment: ${assessment.type}`, { assessment })}
                className="w-full text-center py-2 px-4 bg-purple-100 text-purple-700 font-semibold rounded-lg hover:bg-purple-200 transition-colors"
            >
                View as Assignment
            </button>
        </div>
    </div>
);

const AssessmentsTab: React.FC<{ assessments: TermResources['assessments'], navigateTo: (view: string, title: string, props?: any) => void; }> = ({ assessments, navigateTo }) => {
    // Check if assessments exist and have content
    if (!assessments || assessments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-300">
                <ClipboardListIcon className="h-16 w-16 text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium mb-1">No Assessments Available</p>
                <p className="text-gray-400 text-sm">Generate AI resources to create assessments</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {assessments
                .sort((a, b) => a.week - b.week)
                .map((ass, index) => <AssessmentDisplay key={index} assessment={ass} navigateTo={navigateTo} />)}
        </div>
    );
};


const TermContent: React.FC<{
    termResource: TermResources,
    resources: GeneratedResources,
    navigateTo: (view: string, title: string, props?: any) => void;
}> = ({ termResource, resources, navigateTo }) => {
    const [activeTab, setActiveTab] = useState<'scheme' | 'plans' | 'assessments'>('scheme');

    // Extract context IDs from resources (passed from LessonPlannerScreen)
    const context = {
        subjectId: (resources as any).subjectId,
        classId: (resources as any).classId,
        teacherId: (resources as any).teacherId
    };

    return (
        <div>
            <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg mb-4 print:hidden">
                <button onClick={() => setActiveTab('scheme')} className={`w-1/3 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'scheme' ? 'bg-white shadow text-black' : 'text-gray-600 hover:bg-gray-300/50'}`}>Scheme</button>
                <button onClick={() => setActiveTab('plans')} className={`w-1/3 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'plans' ? 'bg-white shadow text-black' : 'text-gray-600 hover:bg-gray-300/50'}`}>Lesson Plans</button>
                <button onClick={() => setActiveTab('assessments')} className={`w-1/3 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'assessments' ? 'bg-white shadow text-black' : 'text-gray-600 hover:bg-gray-300/50'}`}>Assessments</button>
            </div>
            {activeTab === 'scheme' && <SchemeOfWorkTab scheme={termResource.schemeOfWork} />}
            {activeTab === 'plans' && <LessonPlansTab plans={termResource.lessonPlans} notes={resources.detailedNotes} context={context} navigateTo={navigateTo} onSuggestActivity={navigateTo.bind(null, 'suggestActivity')} />}
            {activeTab === 'assessments' && <AssessmentsTab assessments={termResource.assessments} navigateTo={navigateTo} />}
        </div>
    );
};

const LessonPlanDetailScreen: React.FC<{ resources: GeneratedResources; navigateTo: (view: string, title: string, props?: any) => void; }> = ({ resources, navigateTo }) => {
    const [currentResources, setCurrentResources] = useState<GeneratedResources>(resources);
    const [activeTerm, setActiveTerm] = useState<string>(resources.terms[0]?.term || '');
    const [toastMessage, setToastMessage] = useState('');

    const activeTermData = currentResources.terms.find(t => t.term === activeTerm);

    const handleSavePlan = () => {
        const GENERATED_HISTORY_KEY = 'generatedLessonPlanHistory_v1';
        try {
            const savedHistoryRaw = localStorage.getItem(GENERATED_HISTORY_KEY);
            const savedHistory: GeneratedHistoryEntry[] = savedHistoryRaw ? JSON.parse(savedHistoryRaw) : [];

            const newEntry: GeneratedHistoryEntry = {
                subject: currentResources.subject,
                className: currentResources.className,
                lastUpdated: new Date().toISOString(),
                resources: currentResources,
            };

            // Prepend the new entry to the history
            const newHistory = [newEntry, ...savedHistory];
            localStorage.setItem(GENERATED_HISTORY_KEY, JSON.stringify(newHistory));
            setToastMessage('Plan saved successfully!');
        } catch (error) {
            console.error("Failed to save plan to localStorage", error);
            setToastMessage('Error: Could not save plan.');
        }
    };

    const [isPublishing, setIsPublishing] = useState(false);

    const handlePublish = async () => {
        setIsPublishing(true);
        try {
            const content = JSON.stringify(currentResources, null, 2);
            const fileName = `lesson-plan-${Date.now()}.json`;
            
            // Create a File object from the content
            const file = new File([content], fileName, { type: 'application/json' });

            // 2. Upload using new local endpoint
            const { publicUrl } = await api.uploadFile('lesson-materials', `plans/${fileName}`, file);

            // 3. Insert into Resources
            await api.createResource({
                title: `Lesson Plan: ${currentResources.subject} (${currentResources.className})`,
                type: 'Document',
                subject: currentResources.subject,
                grade: 0, 
                url: publicUrl,
                description: 'AI Generated Lesson Plan',
                is_public: true,
                language: 'English'
            }, { useBackend: true });

            setToastMessage('Plan published to library!');

        } catch (err: any) {
            console.error('Publish error:', err);
            setToastMessage('Failed to publish plan.');
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-100">
            {toastMessage && <Toast message={toastMessage} onClear={() => setToastMessage('')} />}
            <div className="p-3 border-b border-gray-200 flex justify-between items-center flex-shrink-0 bg-white print:hidden">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">AI Plan: {resources.subject} ({resources.className})</h2>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={handleSavePlan}
                        className="flex items-center space-x-1.5 px-3 py-1.5 text-sm font-semibold text-green-700 bg-green-100 rounded-md hover:bg-green-200"
                    >
                        <FolderIcon className="w-4 h-4" />
                        <span>Save Local</span>
                    </button>
                    <button
                        onClick={handlePublish}
                        disabled={isPublishing}
                        className="flex items-center space-x-1.5 px-3 py-1.5 text-sm font-semibold text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 disabled:opacity-50"
                    >
                        <ShareIcon className="w-4 h-4" />
                        <span>{isPublishing ? 'Publishing...' : 'Publish to Library'}</span>
                    </button>
                </div>
            </div>

            <main className="flex-grow overflow-y-auto p-4 printable-area">
                <div className="flex space-x-2 mb-4 print:hidden">
                    {currentResources.terms.map(term => (
                        <button key={term.term} onClick={() => setActiveTerm(term.term)} className={`px-4 py-2 font-semibold rounded-lg ${activeTerm === term.term ? 'bg-purple-600 text-white shadow' : 'bg-white text-gray-900'}`}>
                            {term.term}
                        </button>
                    ))}
                </div>
                {activeTermData ? <TermContent termResource={activeTermData} resources={currentResources} navigateTo={navigateTo} /> : <p className="text-gray-900">Select a term to view resources.</p>}
            </main>
        </div>
    );
};

export default LessonPlanDetailScreen;

// --- Activity Suggester Component ---
import { getAIClient, SchemaType as Type } from '../../lib/ai';

export const AIActivitySuggester: React.FC<{ topic: string, subject: string, handleBack: () => void }> = ({ topic, subject, handleBack }) => {
    const [isGenerating, setIsGenerating] = useState(true);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [toastMessage, setToastMessage] = useState('');

    useEffect(() => {
        const generate = async () => {
            try {
                const ai = getAIClient((import.meta.env as any).VITE_GEMINI_API_KEY || '');
                const prompt = `Generate 3 creative learning activities for the topic "${topic}" in the subject "${subject}" for a Nigerian classroom. 
                Include:
                1. A Group Activity
                2. A Creative/Artistic Activity
                3. A Quick Quiz/Game
                
                For each, provide a title, duration, materials needed, and step-by-step instructions. Focus on low-cost materials available in Nigeria.`;

                const response = await ai.models.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.8,
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                activities: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            title: { type: Type.STRING },
                                            type: { type: Type.STRING },
                                            duration: { type: Type.STRING },
                                            materials: { type: Type.ARRAY, items: { type: Type.STRING } },
                                            steps: { type: Type.ARRAY, items: { type: Type.STRING } }
                                        }
                                    }
                                }
                            }
                        }
                    }
                });

                if (response.text) {
                    const data = JSON.parse(response.text.replace(/```json/g, '').replace(/```/g, '').trim());
                    setSuggestions(data.activities);
                }
            } catch (err) {
                console.error(err);
                setToastMessage("Failed to generate activities.");
            } finally {
                setIsGenerating(false);
            }
        };
        generate();
    }, [topic, subject]);

    return (
        <div className="p-4 bg-gray-50 h-full overflow-y-auto pb-24">
            {toastMessage && <Toast message={toastMessage} onClear={() => setToastMessage('')} />}
            <header className="mb-6">
                <button onClick={handleBack} className="text-gray-500 mb-2 font-bold flex items-center">&larr; Back</button>
                <h2 className="text-2xl font-bold text-gray-800 font-outfit">AI Activity Ideas</h2>
                <p className="text-sm text-gray-500">Creative ideas for: <span className="text-purple-600 font-bold">{topic}</span></p>
            </header>

            {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <RotateCcwIcon className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                    <p className="text-gray-600 font-medium">Generating creative classroom activities...</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {suggestions.map((act, i) => (
                        <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-8 -mt-8 flex items-center justify-center pt-6 pl-6">
                                <SparklesIcon className="w-6 h-6 text-indigo-300" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-widest text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full">{act.type}</span>
                            <h3 className="text-xl font-bold text-gray-900 mt-2 mb-1">{act.title}</h3>
                            <div className="flex items-center space-x-3 text-sm text-gray-500 mb-4">
                                <span className="flex items-center space-x-1 font-bold"><ClockIcon className="w-4 h-4" /> <span>{act.duration}</span></span>
                            </div>
                            
                            <div className="mb-4">
                                <h4 className="text-sm font-bold text-gray-800 mb-2">Materials Needed:</h4>
                                <div className="flex flex-wrap gap-2">
                                    {act.materials.map((m: string, j: number) => (
                                        <span key={j} className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-lg border">{m}</span>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                {act.steps.map((step: string, j: number) => (
                                    <div key={j} className="flex space-x-3">
                                        <span className="flex-shrink-0 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">{j + 1}</span>
                                        <p className="text-sm text-gray-600 leading-relaxed">{step}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
