import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { GeneratedResources, SchemeWeek, SavedScheme, HistoryEntry, GeneratedHistoryEntry } from '../../types';
import { AIIcon, SparklesIcon, TrashIcon, PlusIcon, XCircleIcon, CheckCircleIcon } from '../../constants';

const HistoryIcon = ({className}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${className || ''}`.trim()} viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 8l0 4l2 2" /><path d="M3.05 11a9 9 0 1 1 .5 4m-3.55 -4a9 9 0 0 1 12.5 -5" /><path d="M3 4v4h4" /></svg>;
const FolderIcon = ({className}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${className || ''}`.trim()} viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2" /></svg>;


// --- SUB-COMPONENTS ---

const GeneratingScreen: React.FC = () => (
    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-50">
        <SparklesIcon className="w-16 h-16 text-white animate-spin" />
        <p className="text-white font-semibold mt-4 text-lg">Generating Your Resources...</p>
        <p className="text-white/80 mt-2 text-sm max-w-xs text-center">This may take a moment as the AI builds everything for you.</p>
    </div>
);

const SchemeInput: React.FC<{ scheme: SchemeWeek[]; setScheme: React.Dispatch<React.SetStateAction<SchemeWeek[]>> }> = ({ scheme, setScheme }) => {
  const handleTopicChange = (weekIndex: number, value: string) => {
    const newScheme = [...scheme];
    newScheme[weekIndex].topic = value;
    setScheme(newScheme);
  };
  
  const handleSubTopicChange = (weekIndex: number, subTopicIndex: number, value: string) => {
    const newScheme = [...scheme];
    newScheme[weekIndex].subTopics[subTopicIndex] = value;
    setScheme(newScheme);
  };

  const addSubTopic = (weekIndex: number) => {
    const newScheme = [...scheme];
    newScheme[weekIndex].subTopics.push('');
    setScheme(newScheme);
  };

  const removeSubTopic = (weekIndex: number, subTopicIndex: number) => {
    const newScheme = [...scheme];
    newScheme[weekIndex].subTopics.splice(subTopicIndex, 1);
    setScheme(newScheme);
  };

  const addWeek = () => {
    const newWeek = scheme.length > 0 ? Math.max(...scheme.map(s => s.week)) + 1 : 1;
    setScheme([...scheme, { week: newWeek, topic: '', subTopics: [] }]);
  };

  const removeWeek = (indexToRemove: number) => {
    setScheme(scheme.filter((_, index) => index !== indexToRemove));
  };

  return (
      <div className="space-y-3">
        {scheme.map((entry, weekIndex) => (
          <div key={entry.week} className="bg-gray-50/70 p-3 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-800">{entry.week}.</span>
              <input type="text" value={entry.topic} onChange={(e) => handleTopicChange(weekIndex, e.target.value)} placeholder="Main Topic for the Week" className="w-full p-2 font-semibold border text-gray-800 bg-white border-gray-300 rounded-md focus:ring-1 focus:ring-gray-500"/>
              <button type="button" onClick={() => removeWeek(weekIndex)} className="p-1 text-gray-400 hover:text-red-500" aria-label={`Remove Week ${entry.week}`}><TrashIcon className="w-5 h-5" /></button>
            </div>
            <div className="pl-8 mt-2 space-y-2">
              {entry.subTopics.map((subTopic, subIndex) => (
                <div key={subIndex} className="flex items-center gap-2">
                  <span className="text-gray-400">-</span>
                  <input type="text" value={subTopic} onChange={(e) => handleSubTopicChange(weekIndex, subIndex, e.target.value)} placeholder="Add a sub-topic or learning objective" className="w-full p-1.5 text-sm border bg-white text-gray-800 border-gray-300 rounded-md focus:ring-1 focus:ring-gray-500"/>
                  <button type="button" onClick={() => removeSubTopic(weekIndex, subIndex)} className="p-1 text-gray-400 hover:text-red-500" aria-label={`Remove sub-topic`}><XCircleIcon className="w-5 h-5" /></button>
                </div>
              ))}
              <button type="button" onClick={() => addSubTopic(weekIndex)} className="flex items-center space-x-1 py-1 px-2 text-xs font-semibold text-gray-800 bg-gray-200 rounded-md hover:bg-gray-300"><PlusIcon className="w-4 h-4" /><span>Add Sub-Topic</span></button>
            </div>
          </div>
        ))}
        <button type="button" onClick={addWeek} className="mt-2 w-full flex items-center justify-center space-x-1 py-2 text-sm font-semibold text-gray-800 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-100 hover:border-gray-400"><PlusIcon className="w-4 h-4" /><span>Add Week</span></button>
      </div>
  );
};

const HistoryModal: React.FC<{ isOpen: boolean; onClose: () => void; history: HistoryEntry[]; onLoad: (entry: HistoryEntry) => void; onClear: () => void; }> = ({ isOpen, onClose, history, onLoad, onClear }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800">Load Scheme of Work</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XCircleIcon className="w-7 h-7" /></button>
                </div>
                <div className="flex-grow p-4 space-y-2 overflow-y-auto">
                    {history.length > 0 ? history.map(entry => (
                        <div key={entry.lastUpdated} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                            <div>
                                <p className="font-bold text-gray-800">{entry.subject}</p>
                                <p className="text-sm text-gray-600">{entry.className}</p>
                                <p className="text-xs text-gray-400 mt-1">Last saved: {new Date(entry.lastUpdated).toLocaleString()}</p>
                            </div>
                            <button onClick={() => onLoad(entry)} className="px-3 py-1.5 text-sm font-semibold bg-gray-800 text-white rounded-lg hover:bg-gray-900">Load</button>
                        </div>
                    )) : <p className="text-center text-gray-500 py-8">No saved history.</p>}
                </div>
                {history.length > 0 && (
                    <div className="p-4 border-t">
                        <button onClick={onClear} className="w-full py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100">Clear All History</button>
                    </div>
                )}
            </div>
        </div>
    );
};

const GeneratedHistoryModal: React.FC<{ isOpen: boolean; onClose: () => void; history: GeneratedHistoryEntry[]; onLoad: (entry: GeneratedHistoryEntry) => void; onClear: () => void; }> = ({ isOpen, onClose, history, onLoad, onClear }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800">Load Generated Plan</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XCircleIcon className="w-7 h-7" /></button>
                </div>
                <div className="flex-grow p-4 space-y-2 overflow-y-auto">
                    {history.length > 0 ? history.map(entry => (
                        <div key={entry.lastUpdated} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                            <div>
                                <p className="font-bold text-gray-800">{entry.subject}</p>
                                <p className="text-sm text-gray-600">{entry.className}</p>
                                <p className="text-xs text-gray-400 mt-1">Generated: {new Date(entry.lastUpdated).toLocaleString()}</p>
                            </div>
                            <button onClick={() => onLoad(entry)} className="px-3 py-1.5 text-sm font-semibold bg-purple-600 text-white rounded-lg hover:bg-purple-700">View</button>
                        </div>
                    )) : <p className="text-center text-gray-500 py-8">No saved generated plans.</p>}
                </div>
                {history.length > 0 && (
                    <div className="p-4 border-t">
                        <button onClick={onClear} className="w-full py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100">Clear Saved Plans</button>
                    </div>
                )}
            </div>
        </div>
    );
};


const Toast: React.FC<{ message: string; onClear: () => void; }> = ({ message, onClear }) => {
    useEffect(() => {
        const timer = setTimeout(onClear, 3000);
        return () => clearTimeout(timer);
    }, [onClear]);

    return (
        <div className="fixed bottom-24 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 animate-slide-in-up">
            <CheckCircleIcon className="w-5 h-5 text-green-400" />
            <span>{message}</span>
        </div>
    );
};

// --- MAIN COMPONENT ---

const LessonPlannerScreen: React.FC<{ navigateTo: (view: string, title: string, props?: any) => void; }> = ({ navigateTo }) => {
    const [subject, setSubject] = useState('');
    const [className, setClassName] = useState('');
    const [term1Scheme, setTerm1Scheme] = useState<SchemeWeek[]>([]);
    const [term2Scheme, setTerm2Scheme] = useState<SchemeWeek[]>([]);
    const [term3Scheme, setTerm3Scheme] = useState<SchemeWeek[]>([]);
    const [activeTerm, setActiveTerm] = useState<'term1' | 'term2' | 'term3'>('term1');
    const [isGenerating, setIsGenerating] = useState(false);
    const [schemeHistory, setSchemeHistory] = useState<HistoryEntry[]>([]);
    const [generatedHistory, setGeneratedHistory] = useState<GeneratedHistoryEntry[]>([]);
    const [isSchemeHistoryOpen, setIsSchemeHistoryOpen] = useState(false);
    const [isGeneratedHistoryOpen, setIsGeneratedHistoryOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    const SCHEME_HISTORY_KEY = 'lessonPlannerHistory_v2';
    const GENERATED_HISTORY_KEY = 'generatedLessonPlanHistory_v1';

    useEffect(() => {
        try {
            const savedSchemeHistory = localStorage.getItem(SCHEME_HISTORY_KEY);
            if (savedSchemeHistory) setSchemeHistory(JSON.parse(savedSchemeHistory));
            
            const savedGeneratedHistory = localStorage.getItem(GENERATED_HISTORY_KEY);
            if (savedGeneratedHistory) setGeneratedHistory(JSON.parse(savedGeneratedHistory));
        } catch (error) {
            console.error("Failed to parse history from localStorage", error);
        }
    }, []);

    const hasSchemeContent = useMemo(() => {
        const checkScheme = (scheme: SchemeWeek[]) => scheme.some(week => week.topic.trim() !== '');
        return checkScheme(term1Scheme) || checkScheme(term2Scheme) || checkScheme(term3Scheme);
    }, [term1Scheme, term2Scheme, term3Scheme]);

    const handleSaveScheme = useCallback(() => {
        if (!subject.trim() || !className.trim()) {
            setToastMessage('Please enter Subject and Class Name to save.');
            return;
        }
        const newEntry: HistoryEntry = {
            subject,
            className,
            term1Scheme,
            term2Scheme,
            term3Scheme,
            lastUpdated: new Date().toISOString()
        };
        const newHistory = [...schemeHistory];
        const existingIndex = newHistory.findIndex(h => h.subject.toLowerCase() === subject.toLowerCase() && h.className.toLowerCase() === className.toLowerCase());
        
        if (existingIndex > -1) {
            newHistory[existingIndex] = newEntry;
        } else {
            newHistory.push(newEntry);
        }
        
        localStorage.setItem(SCHEME_HISTORY_KEY, JSON.stringify(newHistory));
        setSchemeHistory(newHistory);
        setToastMessage('Scheme of work saved!');
    }, [subject, className, term1Scheme, term2Scheme, term3Scheme, schemeHistory]);
    
    const handleLoadFromSchemeHistory = useCallback((entry: HistoryEntry) => {
        setSubject(entry.subject);
        setClassName(entry.className);
        setTerm1Scheme(entry.term1Scheme);
        setTerm2Scheme(entry.term2Scheme);
        setTerm3Scheme(entry.term3Scheme);
        setIsSchemeHistoryOpen(false);
        setToastMessage(`Loaded scheme for ${entry.subject} - ${entry.className}.`);
    }, []);

    const handleClearSchemeHistory = useCallback(() => {
        if (window.confirm("Are you sure you want to clear all saved schemes? This cannot be undone.")) {
            localStorage.removeItem(SCHEME_HISTORY_KEY);
            setSchemeHistory([]);
            setIsSchemeHistoryOpen(false);
            setToastMessage('Scheme history cleared.');
        }
    }, []);

    const handleLoadFromGeneratedHistory = useCallback((entry: GeneratedHistoryEntry) => {
        setIsGeneratedHistoryOpen(false);
        navigateTo('lessonPlanDetail', `AI Plan: ${entry.subject}`, { resources: entry.resources });
    }, [navigateTo]);

    const handleClearGeneratedHistory = useCallback(() => {
        if (window.confirm("Are you sure you want to clear all saved generated plans? This cannot be undone.")) {
            localStorage.removeItem(GENERATED_HISTORY_KEY);
            setGeneratedHistory([]);
            setIsGeneratedHistoryOpen(false);
            setToastMessage('Saved plans history cleared.');
        }
    }, []);

    const schemes = { term1: term1Scheme, term2: term2Scheme, term3: term3Scheme };
    const currentScheme = schemes[activeTerm];
    const setCurrentScheme = { term1: setTerm1Scheme, term2: setTerm2Scheme, term3: setTerm3Scheme }[activeTerm];

    const handleGenerate = async () => {
        if (!subject.trim() || !className.trim() || !hasSchemeContent) {
            alert("Please provide a subject, class name, and at least one topic in a term's scheme of work.");
            return;
        }
        setIsGenerating(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const prompt = `As an expert curriculum designer for the Nigerian school system, generate educational resources for ${subject} for the class ${className}.

**Primary Directive: Content Generation from User Topics**

Your function is to create educational materials based *exclusively* on the topics provided by the user for each week.

**How to Handle User Input:**

1.  **If a week has a Main Topic AND Sub-Topics:**
    *   Your generated lesson plan, detailed notes, and assessment for that week **MUST** be based *only* on the provided Sub-Topics. Do not introduce any other concepts.

2.  **If a week has ONLY a Main Topic (no sub-topics):**
    *   This is a directive to expand on the Main Topic. You **MUST** generate a full lesson plan, detailed notes, and assessment by logically breaking down the Main Topic into relevant sections, steps, or concepts.
    *   **Example 1:** User provides "Classification of Whole Numbers". Your lesson plan should include sections like "What are Whole Numbers?", "Prime vs. Composite Numbers", "Even vs. Odd Numbers", and "Factors and Multiples". This is considered *detailing* the topic, not inventing a new one.
    *   **Example 2:** User provides "The Solar System". Your content should cover "The Sun", "The Inner Planets", "The Outer Planets", and "Asteroids and Comets".
    *   **Crucial:** Failure to generate a lesson plan for a topic without sub-topics is a failure to follow instructions. You must always elaborate on single topics.

**ABSOLUTE RESTRICTION**: Under no circumstances should you generate content for a topic the user has not provided in their scheme of work. Your scope is strictly limited to the topics listed for each week.

**Additional Rule:**
*   For EACH week that has a topic, generate ONE corresponding assessment (Test, Quiz, or Assignment). The assessment's "type" property must be named according to the week, for example: "Week 1 Test", "Week 2 Quiz".

**User-provided schemes of work**:
- First Term: ${JSON.stringify(term1Scheme)}
- Second Term: ${JSON.stringify(term2Scheme)}
- Third Term: ${JSON.stringify(term3Scheme)}

**Your Task**:
For EACH term that has topics provided in the user's scheme, generate the corresponding lessonPlans, assessments, and detailedNotes based on all rules above.

Return a single JSON object matching the required schema. Ensure 'schemeOfWork' is a simplified list of week/topic, and that each assessment has a 'week' number.`;


            const responseSchema = {
                type: Type.OBJECT,
                properties: {
                    subject: { type: Type.STRING },
                    className: { type: Type.STRING },
                    terms: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                term: { type: Type.STRING },
                                schemeOfWork: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: { week: { type: Type.INTEGER }, topic: { type: Type.STRING } },
                                        required: ['week', 'topic']
                                    }
                                },
                                lessonPlans: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            week: { type: Type.INTEGER },
                                            topic: { type: Type.STRING },
                                            objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
                                            materials: { type: Type.ARRAY, items: { type: Type.STRING } },
                                            teachingSteps: {
                                                type: Type.ARRAY,
                                                items: {
                                                    type: Type.OBJECT,
                                                    properties: { step: { type: Type.STRING }, description: { type: Type.STRING } },
                                                    required: ['step', 'description']
                                                }
                                            },
                                            duration: { type: Type.STRING },
                                            keyVocabulary: { type: Type.ARRAY, items: { type: Type.STRING } },
                                            assessmentMethods: { type: Type.ARRAY, items: { type: Type.STRING } }
                                        },
                                        required: ['week', 'topic', 'objectives', 'materials', 'teachingSteps', 'duration', 'keyVocabulary', 'assessmentMethods']
                                    }
                                },
                                assessments: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            week: { type: Type.INTEGER },
                                            type: { type: Type.STRING },
                                            totalMarks: { type: Type.INTEGER },
                                            questions: {
                                                type: Type.ARRAY,
                                                items: {
                                                    type: Type.OBJECT,
                                                    properties: {
                                                        id: { type: Type.INTEGER },
                                                        question: { type: Type.STRING },
                                                        type: { type: Type.STRING },
                                                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                                        answer: { type: Type.STRING },
                                                        explanation: { type: Type.STRING },
                                                        marks: { type: Type.INTEGER }
                                                    },
                                                    required: ['id', 'question', 'type', 'answer', 'marks']
                                                }
                                            }
                                        },
                                        required: ['week', 'type', 'totalMarks', 'questions']
                                    }
                                }
                            },
                            required: ['term', 'schemeOfWork', 'lessonPlans', 'assessments']
                        }
                    },
                    detailedNotes: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                topic: { type: Type.STRING },
                                note: { type: Type.STRING }
                            },
                            required: ['topic', 'note']
                        }
                    }
                },
                required: ['subject', 'className', 'terms', 'detailedNotes']
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: responseSchema,
                }
            });

            const resources: GeneratedResources = JSON.parse(response.text.trim());
            
            const newGeneratedEntry: GeneratedHistoryEntry = {
                subject: resources.subject,
                className: resources.className,
                lastUpdated: new Date().toISOString(),
                resources: resources,
            };

            const newGeneratedHistory = [newGeneratedEntry, ...generatedHistory];
            localStorage.setItem(GENERATED_HISTORY_KEY, JSON.stringify(newGeneratedHistory));
            setGeneratedHistory(newGeneratedHistory);

            navigateTo('lessonPlanDetail', `AI Plan: ${resources.subject}`, { resources });

        } catch (error) {
            console.error("AI Generation Error:", error);
            alert("An error occurred while generating resources. The AI might be busy, or the request was too complex. Please try again with a simpler scheme.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-100 relative">
            {isGenerating && <GeneratingScreen />}
            <main className="flex-grow p-4 space-y-5 overflow-y-auto pb-24">
                <div className="bg-gray-100 p-4 rounded-xl text-center border border-gray-200">
                    <SparklesIcon className="h-10 w-10 mx-auto text-gray-500 mb-2" />
                    <h3 className="font-bold text-lg text-gray-800">AI Curriculum Co-Pilot</h3>
                    <p className="text-sm text-gray-700">Input your termly topics and let AI build resources for your entire academic year.</p>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="flex-grow">
                            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                            <input id="subject" type="text" value={subject} onChange={e => setSubject(e.target.value)} required className="w-full p-2 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg"/>
                        </div>
                        <div className="flex-grow">
                             <label htmlFor="className" className="block text-sm font-medium text-gray-700 mb-1">Class Name</label>
                            <input id="className" type="text" value={className} onChange={e => setClassName(e.target.value)} required className="w-full p-2 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg"/>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={() => setIsSchemeHistoryOpen(true)} className="w-full flex items-center justify-center space-x-2 py-2 text-sm font-semibold text-gray-700 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-100 hover:border-gray-400">
                            <HistoryIcon className="w-4 h-4"/>
                            <span>Load Scheme</span>
                        </button>
                        <button type="button" onClick={() => setIsGeneratedHistoryOpen(true)} className="w-full flex items-center justify-center space-x-2 py-2 text-sm font-semibold text-purple-700 border-2 border-dashed border-purple-300 rounded-lg hover:bg-purple-50 hover:border-purple-400">
                            <FolderIcon className="w-4 h-4"/>
                            <span>Saved Plans</span>
                        </button>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm">
                    <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg mb-4">
                        <button onClick={() => setActiveTerm('term1')} className={`w-1/3 py-2 text-sm font-semibold rounded-md ${activeTerm === 'term1' ? 'bg-white shadow text-gray-900' : 'text-gray-700'}`}>First Term</button>
                        <button onClick={() => setActiveTerm('term2')} className={`w-1/3 py-2 text-sm font-semibold rounded-md ${activeTerm === 'term2' ? 'bg-white shadow text-gray-900' : 'text-gray-700'}`}>Second Term</button>
                        <button onClick={() => setActiveTerm('term3')} className={`w-1/3 py-2 text-sm font-semibold rounded-md ${activeTerm === 'term3' ? 'bg-white shadow text-gray-900' : 'text-gray-700'}`}>Third Term</button>
                    </div>
                    <SchemeInput scheme={currentScheme} setScheme={setCurrentScheme} />
                </div>
            </main>
            
            <footer className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-200 grid grid-cols-2 gap-3 sticky bottom-0">
                <button type="button" onClick={handleSaveScheme} className="w-full py-3 px-4 font-medium text-gray-800 bg-gray-200 rounded-lg shadow-sm hover:bg-gray-300">Save Scheme</button>
                <button 
                    type="button" 
                    onClick={handleGenerate} 
                    disabled={isGenerating || !subject.trim() || !className.trim() || !hasSchemeContent}
                    className="w-full flex justify-center items-center space-x-2 py-3 px-4 font-medium text-white bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400">
                    <SparklesIcon className="h-5 h-5" /><span>Generate Resources</span>
                </button>
            </footer>
            
            <HistoryModal isOpen={isSchemeHistoryOpen} onClose={() => setIsSchemeHistoryOpen(false)} history={schemeHistory} onLoad={handleLoadFromSchemeHistory} onClear={handleClearSchemeHistory} />
            <GeneratedHistoryModal isOpen={isGeneratedHistoryOpen} onClose={() => setIsGeneratedHistoryOpen(false)} history={generatedHistory} onLoad={handleLoadFromGeneratedHistory} onClear={handleClearGeneratedHistory} />
            {toastMessage && <Toast message={toastMessage} onClear={() => setToastMessage('')} />}
        </div>
    );
};

export default LessonPlannerScreen;