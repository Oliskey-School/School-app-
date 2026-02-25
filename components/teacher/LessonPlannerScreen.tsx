import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { api } from '../../lib/api';
// import { GoogleGenAI, Type } from "@google/genai"; // Removed in favor of lib/ai
import { getAIClient, AI_MODEL_NAME, AI_GENERATION_CONFIG, SchemaType as Type } from '../../lib/ai';
import { toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../../lib/supabase';
import { GeneratedResources, SchemeWeek, SavedScheme, HistoryEntry, GeneratedHistoryEntry, Subject } from '../../types';
import { AIIcon, SparklesIcon, TrashIcon, PlusIcon, XCircleIcon, CheckCircleIcon, getFormattedClassName } from '../../constants';
import { fetchSubjects } from '../../lib/database';
import { useTeacherClasses } from '../../hooks/useTeacherClasses';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';


const HistoryIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={`h - 6 w - 6 ${className || ''} `.trim()} viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M12 8l0 4l2 2" /><path d="M3.05 11a9 9 0 1 1 .5 4m-3.55 -4a9 9 0 0 1 12.5 -5" /><path d="M3 4v4h4" /></svg>;
const FolderIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={`h - 6 w - 6 ${className || ''} `.trim()} viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2" /></svg>;


// --- SUB-COMPONENTS ---
import { AILoadingOverlay } from '../ui/AILoadingOverlay';

// GeneratingScreen removed in favor of AILoadingOverlay

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
                        <input type="text" value={entry.topic} onChange={(e) => handleTopicChange(weekIndex, e.target.value)} placeholder="Main Topic for the Week" className="w-full p-2 font-semibold border text-gray-800 bg-white border-gray-300 rounded-md focus:ring-1 focus:ring-gray-500" />
                        <button type="button" onClick={() => removeWeek(weekIndex)} className="p-1 text-gray-400 hover:text-red-500" aria-label={`Remove Week ${entry.week} `}><TrashIcon className="w-5 h-5" /></button>
                    </div>
                    <div className="pl-8 mt-2 space-y-2">
                        {entry.subTopics.map((subTopic, subIndex) => (
                            <div key={subIndex} className="flex items-center gap-2">
                                <span className="text-gray-400">-</span>
                                <input type="text" value={subTopic} onChange={(e) => handleSubTopicChange(weekIndex, subIndex, e.target.value)} placeholder="Add a sub-topic or learning objective" className="w-full p-1.5 text-sm border bg-white text-gray-800 border-gray-300 rounded-md focus:ring-1 focus:ring-gray-500" />
                                <button type="button" onClick={() => removeSubTopic(weekIndex, subIndex)} className="p-1 text-gray-400 hover:text-red-500" aria-label={`Remove sub - topic`}><XCircleIcon className="w-5 h-5" /></button>
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
                    {history.length > 0 ? history.map((entry, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                            <div>
                                <p className="font-bold text-gray-800">{entry.subject}</p>
                                <p className="text-sm text-gray-600">{entry.className}</p>
                                <p className="text-xs text-gray-400 mt-1">Last saved: {new Date(entry.lastUpdated).toLocaleString()}</p>
                            </div>
                            <button onClick={() => onLoad(entry)} className="px-3 py-1.5 text-sm font-semibold bg-gray-800 text-white rounded-lg hover:bg-gray-900">Load</button>
                        </div>
                    )) : <p className="text-center text-gray-500 py-8">No saved history.</p>}
                </div>
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
                    {history.length > 0 ? history.map((entry, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                            <div>
                                <p className="font-bold text-gray-800">{entry.subject}</p>
                                <p className="text-sm text-gray-600">{entry.className}</p>
                                <p className="text-xs text-gray-400 mt-1">Generated: {new Date(entry.lastUpdated).toLocaleString()}</p>
                            </div>
                            <button onClick={() => onLoad(entry)} className="px-3 py-1.5 text-sm font-semibold bg-purple-600 text-white rounded-lg hover:bg-purple-700">View</button>
                        </div>
                    )) : <p className="text-center text-gray-500 py-8">No saved generated plans.</p>}
                </div>
            </div>
        </div>
    );
};




import { generateLocalCurriculum } from '../../utils/lessonNoteGenerator';

// --- MAIN COMPONENT ---

const LessonPlannerScreen: React.FC<{ navigateTo: (view: string, title: string, props?: any) => void; teacherId?: string | null; }> = ({ navigateTo, teacherId }) => {
    const [subject, setSubject] = useState('');
    const [className, setClassName] = useState('');
    // ... (keep existing state)
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
    const { classes: rawTeacherClasses, subjects: teacherSubjects, assignments: rawAssignments, loading } = useTeacherClasses(teacherId);

    const teacherClasses = useMemo(() => {
        const groups = new Map<string, any>();
        rawTeacherClasses.forEach(cls => {
            const name = getFormattedClassName(cls.grade, cls.section);
            if (!groups.has(name)) {
                groups.set(name, cls);
            }
        });
        return Array.from(groups.values());
    }, [rawTeacherClasses]);

    const filteredSubjects = useMemo(() => {
        if (!selectedClassId) return teacherSubjects;

        const specificAssignments = rawAssignments.filter(a => a.classId === selectedClassId);

        if (specificAssignments.length > 0 && specificAssignments.some(a => a.subjectId)) {
            const allowedSubjectIds = new Set(specificAssignments.map(a => a.subjectId));
            return teacherSubjects.filter(sub => allowedSubjectIds.has(sub.id));
        }

        return teacherSubjects;
    }, [selectedClassId, teacherSubjects, rawAssignments]);
    const [generatedHistory, setGeneratedHistory] = useState<GeneratedHistoryEntry[]>([]);
    const [isSchemeHistoryOpen, setIsSchemeHistoryOpen] = useState(false);
    const [isGeneratedHistoryOpen, setIsGeneratedHistoryOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [schemeHistory, setSchemeHistory] = useState<HistoryEntry[]>([]);
    const [activeTerm, setActiveTerm] = useState<'term1' | 'term2' | 'term3'>('term1');
    const [term1Scheme, setTerm1Scheme] = useState<SchemeWeek[]>([{ week: 1, topic: '', subTopics: [] }]);
    const [term2Scheme, setTerm2Scheme] = useState<SchemeWeek[]>([{ week: 1, topic: '', subTopics: [] }]);
    const [term3Scheme, setTerm3Scheme] = useState<SchemeWeek[]>([{ week: 1, topic: '', subTopics: [] }]);
    const [isGenerating, setIsGenerating] = useState(false);

    const effectiveTeacherId = teacherId || '2'; // Fallback to '2' only if no auth provided (dev mode)

    const fetchHistory = useCallback(async () => {
        try {
            const data = await api.getGeneratedResources(effectiveTeacherId);

            const schemes: HistoryEntry[] = data
                .filter(row => row.scheme_content)
                .map(row => ({
                    subject: row.subject,
                    className: row.class_name,
                    term1Scheme: row.scheme_content.term1 || [],
                    term2Scheme: row.scheme_content.term2 || [],
                    term3Scheme: row.scheme_content.term3 || [],
                    lastUpdated: row.updated_at
                }));
            setSchemeHistory(schemes);

            const generated: GeneratedHistoryEntry[] = data
                .filter(row => row.lesson_plans_content)
                .map(row => ({
                    subject: row.subject,
                    className: row.class_name,
                    lastUpdated: row.updated_at,
                    resources: row.lesson_plans_content // Assuming this matches GeneratedResources structure
                }));
            setGeneratedHistory(generated);
        } catch (error) {
            console.error("Error fetching history:", error);
        }
    }, [effectiveTeacherId]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    useRealtimeRefresh(['generated_resources'], fetchHistory);



    const hasSchemeContent = useMemo(() => {
        const checkScheme = (scheme: SchemeWeek[]) => scheme.some(week => week.topic.trim() !== '');
        return checkScheme(term1Scheme) || checkScheme(term2Scheme) || checkScheme(term3Scheme);
    }, [term1Scheme, term2Scheme, term3Scheme]);

    const handleSaveScheme = useCallback(async () => {
        if (!subject.trim() || !className.trim()) {
            setToastMessage('Please enter Subject and Class Name to save.');
            return;
        }

        const schemeData = {
            term1: term1Scheme,
            term2: term2Scheme,
            term3: term3Scheme
        };

        try {
            await api.saveGeneratedResource({
                teacher_id: effectiveTeacherId,
                subject,
                class_name: className,
                term: 'All', // Defaulting as we store all 3
                scheme_content: schemeData
            });
            toast.success('Scheme of work saved to database!');
            fetchHistory(); // Refresh
        } catch (error) {
            console.error("Error saving scheme:", error);
            toast.error('Failed to save scheme.');
        }
    }, [subject, className, term1Scheme, term2Scheme, term3Scheme, effectiveTeacherId, fetchHistory]);

    const handleLoadFromSchemeHistory = useCallback((entry: HistoryEntry) => {
        setSubject(entry.subject);
        setClassName(entry.className);
        setTerm1Scheme(entry.term1Scheme);
        setTerm2Scheme(entry.term2Scheme);
        setTerm3Scheme(entry.term3Scheme);
        setIsSchemeHistoryOpen(false);
        toast.success(`Loaded scheme for ${entry.subject} - ${entry.className}.`);
    }, []);

    const handleClearSchemeHistory = useCallback(() => {
        // In DB mode, maybe we don't want to clear ALL, or maybe we do?
        // Let's just alert that this feature is restricted for now or clear local state?
        // Actually, let's skip implementing "Clear All" for database as it's dangerous.
        toast.error("Deleting all history is disabled in connected mode. You can overwrite entries by saving.");
    }, []);

    const handleLoadFromGeneratedHistory = useCallback((entry: GeneratedHistoryEntry) => {
        setIsGeneratedHistoryOpen(false);
        navigateTo('lessonPlanDetail', `AI Plan: ${entry.subject} `, { resources: entry.resources });
    }, [navigateTo]);

    const handleClearGeneratedHistory = useCallback(() => {
        toast.error("Deleting all history is disabled in connected mode.");
    }, []);

    const schemes = { term1: term1Scheme, term2: term2Scheme, term3: term3Scheme };
    const currentScheme = schemes[activeTerm];
    const setCurrentScheme = { term1: setTerm1Scheme, term2: setTerm2Scheme, term3: setTerm3Scheme }[activeTerm];

    const handleLocalGenerate = async () => {
        if (!subject.trim() || !className.trim() || !hasSchemeContent) {
            toast.error("Please provide a subject, class name, and at least one topic.");
            return;
        }

        setIsGenerating(true);
        // Simulate a small delay for "generation" feel
        await new Promise(resolve => setTimeout(resolve, 800));

        try {
            const resources = generateLocalCurriculum(subject, className, {
                term1: term1Scheme,
                term2: term2Scheme,
                term3: term3Scheme
            });

            // Save to Database (same as AI path)
            await api.saveGeneratedResource({
                teacher_id: effectiveTeacherId,
                subject: resources.subject,
                class_name: resources.className,
                term: 'All',
                lesson_plans_content: resources
            });

            fetchHistory();

            const resourcesWithIds = {
                ...resources,
                subjectId: selectedSubjectId,
                classId: selectedClassId,
                teacherId: effectiveTeacherId
            };
            
            toast.success("Resources generated locally using curriculum map!");
            navigateTo('lessonPlanDetail', `Local Plan: ${subject}`, { resources: resourcesWithIds });
        } catch (error) {
            console.error("Local Generation Error:", error);
            toast.error("Failed to generate resources locally.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerate = async () => {
        if (!subject.trim() || !className.trim() || !hasSchemeContent) {
            toast.error("Please provide a subject, class name, and at least one topic in a term's scheme of work.");
            return;
        }

        setIsGenerating(true);
        try {
            const prompt = `As an expert curriculum designer for the Nigerian school system, generate a comprehensive lesson plan resource.
            
            Subject: ${subject}
            Class: ${className}
            
            Here are the schemes of work provided by the user:
            - First Term: ${JSON.stringify(term1Scheme)}
            - Second Term: ${JSON.stringify(term2Scheme)}
            - Third Term: ${JSON.stringify(term3Scheme)}

            Task:
            1. Analyze the topics provided for each term.
            2. For each week in the scheme, generate:
               - Specific Learning Objectives (at least 2-3)
               - Recommended Teaching Resources (books, materials, digital tools)
               - A brief Lesson Note guide.
            3. If a term has no user-provided topics, suggest a standard curriculum for that term based on the Subject and Class level.

            Output Format:
            Return a JSON object with the following structure:
            {
                "subject": "${subject}",
                "className": "${className}",
                "terms": [
                    {
                        "term": "First Term",
                        "weeks": [
                            { "week": 1, "topic": "...", "learningObjectives": ["..."], "resources": ["..."] }
                        ]
                    },
                    { "term": "Second Term", "weeks": [] },
                    { "term": "Third Term", "weeks": [] }
                ]
            }`;

            // Use local Gemini client instead of Edge Function to avoid CORS/Deployment issues
            const ai = getAIClient(import.meta.env.VITE_GEMINI_API_KEY || '');

            // Construct the messages structure for chat
            const history = [
                { role: 'user', parts: [{ text: 'You are an expert curriculum designer for the Nigerian school system.' }] },
                { role: 'model', parts: [{ text: 'I am ready to help design the curriculum.' }] },
                { role: 'user', parts: [{ text: prompt }] }
            ];

            const response = await ai.models.generateContent({
                contents: history,
                generationConfig: {
                    temperature: 0.7,
                    responseMimeType: "application/json",
                    responseSchema: {
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
                                        weeks: {
                                            type: Type.ARRAY,
                                            items: {
                                                type: Type.OBJECT,
                                                properties: {
                                                    week: { type: Type.INTEGER },
                                                    topic: { type: Type.STRING },
                                                    learningObjectives: { type: Type.ARRAY, items: { type: Type.STRING } },
                                                    resources: { type: Type.ARRAY, items: { type: Type.STRING } }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            if (!response.text) throw new Error('No content returned from AI');

            let raw = response.text;

            // Check for direct error messages from AI
            if (!raw || raw.trim().startsWith('Error') || raw.trim().startsWith("I'm sorry") || raw.trim().startsWith("I cannot")) {
                throw new Error(raw || "AI returned an error message instead of content.");
            }

            // Sanitize
            raw = raw.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();

            let resources;
            try {
                resources = JSON.parse(raw);
            } catch (jsonError) {
                console.error("AI JSON Parse Error. Raw output:", raw);
                throw new Error("The AI generated an invalid format. Please try again.");
            }

            if (!resources || !resources.terms) {
                throw new Error("AI returned a response, but it was empty or missing terms data.");
            }

            // Inject scheme data logic
            resources.terms = resources.terms.map((term: any) => {
                let relevantScheme: SchemeWeek[] = [];
                if (term.term?.toLowerCase().includes('first') || term.term?.includes('Term 1')) relevantScheme = term1Scheme;
                else if (term.term?.toLowerCase().includes('second') || term.term?.includes('Term 2')) relevantScheme = term2Scheme;
                else if (term.term?.toLowerCase().includes('third') || term.term?.includes('Term 3')) relevantScheme = term3Scheme;

                if (relevantScheme.length === 0 && resources.terms.length === 1) {
                    if (activeTerm === 'term1') relevantScheme = term1Scheme;
                    if (activeTerm === 'term2') relevantScheme = term2Scheme;
                    if (activeTerm === 'term3') relevantScheme = term3Scheme;
                }

                return {
                    ...term,
                    schemeOfWork: relevantScheme
                };
            });

            // Save to Database logic (Hybrid API)
            await api.saveGeneratedResource({
                teacher_id: effectiveTeacherId,
                subject: resources.subject || subject,
                class_name: resources.className || className,
                term: 'All',
                lesson_plans_content: resources
            });

            fetchHistory(); // Refresh history list

            // Navigate with expanded resources including IDs
            const resourcesWithIds = {
                ...resources,
                subjectId: selectedSubjectId,
                classId: selectedClassId,
                teacherId: effectiveTeacherId
            };
            navigateTo('lessonPlanDetail', `AI Plan: ${subject}`, { resources: resourcesWithIds });

        } catch (error: any) {
            console.error("AI Generation Error:", error);
            const msg = error.message || '';
            if (msg.includes('429') || msg.includes('Too many requests')) {
                toast.error("AI is currently busy. Please try 'Generate Locally' instead!", { duration: 5000 });
            } else {
                toast.error(`AI Connection Failed. Details:\n${msg}`);
            }
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-100 relative">
            {/* AI Loading Overlay */}
            <AILoadingOverlay isVisible={isGenerating} />
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
                            <select
                                id="subject"
                                value={selectedSubjectId}
                                onChange={e => {
                                    setSelectedSubjectId(e.target.value);
                                    const sub = filteredSubjects.find(s => s.id === e.target.value);
                                    setSubject(sub ? sub.name : '');
                                }}
                                required
                                className="w-full p-2 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg"
                            >
                                <option value="">Select Subject</option>
                                {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="flex-grow">
                            <label htmlFor="className" className="block text-sm font-medium text-gray-700 mb-1">Class Name</label>
                            <select
                                id="className"
                                value={selectedClassId}
                                onChange={e => {
                                    setSelectedClassId(e.target.value);
                                    const cls = teacherClasses.find(c => c.id === e.target.value);
                                    setClassName(cls ? getFormattedClassName(cls.grade, cls.section) : '');
                                }}
                                required
                                className="w-full p-2 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg"
                            >
                                <option value="">Select Class</option>
                                {teacherClasses.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {getFormattedClassName(c.grade, c.section)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={() => setIsSchemeHistoryOpen(true)} className="w-full flex items-center justify-center space-x-2 py-2 text-sm font-semibold text-gray-700 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-100 hover:border-gray-400">
                            <HistoryIcon className="w-4 h-4" />
                            <span>Load Scheme</span>
                        </button>
                        <button type="button" onClick={() => setIsGeneratedHistoryOpen(true)} className="w-full flex items-center justify-center space-x-2 py-2 text-sm font-semibold text-purple-700 border-2 border-dashed border-purple-300 rounded-lg hover:bg-purple-50 hover:border-purple-400">
                            <FolderIcon className="w-4 h-4" />
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

            <footer className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-200 space-y-3 sticky bottom-0">
                <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={handleSaveScheme} className="w-full py-2.5 px-4 text-sm font-medium text-gray-800 bg-gray-100 rounded-lg shadow-sm hover:bg-gray-200">Save Scheme</button>
                    <button 
                        type="button" 
                        onClick={handleLocalGenerate}
                        disabled={isGenerating || !subject.trim() || !className.trim() || !hasSchemeContent}
                        className="w-full py-2.5 px-4 text-sm font-medium text-blue-800 bg-blue-50 border border-blue-200 rounded-lg shadow-sm hover:bg-blue-100 disabled:opacity-50"
                    >
                        Generate Locally (No AI)
                    </button>
                </div>
                <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating || !subject.trim() || !className.trim() || !hasSchemeContent}
                    className="w-full flex justify-center items-center space-x-2 py-3 px-4 font-bold text-white bg-gray-900 hover:bg-black rounded-xl shadow-lg disabled:bg-gray-400 transition-all transform active:scale-[0.98]">
                    <SparklesIcon className="h-5 w-5" />
                    <span>Generate AI Resources</span>
                </button>
            </footer>

            <HistoryModal isOpen={isSchemeHistoryOpen} onClose={() => setIsSchemeHistoryOpen(false)} history={schemeHistory} onLoad={handleLoadFromSchemeHistory} onClear={handleClearSchemeHistory} />
            <GeneratedHistoryModal isOpen={isGeneratedHistoryOpen} onClose={() => setIsGeneratedHistoryOpen(false)} history={generatedHistory} onLoad={handleLoadFromGeneratedHistory} onClear={handleClearGeneratedHistory} />
        </div>
    );
};

export default LessonPlannerScreen;
