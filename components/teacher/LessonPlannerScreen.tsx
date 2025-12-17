import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { supabase } from '../../lib/supabase';
import { GeneratedResources, SchemeWeek, SavedScheme, HistoryEntry, GeneratedHistoryEntry } from '../../types';
import { AIIcon, SparklesIcon, TrashIcon, PlusIcon, XCircleIcon, CheckCircleIcon } from '../../constants';

const HistoryIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${className || ''}`.trim()} viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M12 8l0 4l2 2" /><path d="M3.05 11a9 9 0 1 1 .5 4m-3.55 -4a9 9 0 0 1 12.5 -5" /><path d="M3 4v4h4" /></svg>;
const FolderIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${className || ''}`.trim()} viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2" /></svg>;


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
                        <input type="text" value={entry.topic} onChange={(e) => handleTopicChange(weekIndex, e.target.value)} placeholder="Main Topic for the Week" className="w-full p-2 font-semibold border text-gray-800 bg-white border-gray-300 rounded-md focus:ring-1 focus:ring-gray-500" />
                        <button type="button" onClick={() => removeWeek(weekIndex)} className="p-1 text-gray-400 hover:text-red-500" aria-label={`Remove Week ${entry.week}`}><TrashIcon className="w-5 h-5" /></button>
                    </div>
                    <div className="pl-8 mt-2 space-y-2">
                        {entry.subTopics.map((subTopic, subIndex) => (
                            <div key={subIndex} className="flex items-center gap-2">
                                <span className="text-gray-400">-</span>
                                <input type="text" value={subTopic} onChange={(e) => handleSubTopicChange(weekIndex, subIndex, e.target.value)} placeholder="Add a sub-topic or learning objective" className="w-full p-1.5 text-sm border bg-white text-gray-800 border-gray-300 rounded-md focus:ring-1 focus:ring-gray-500" />
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

    const TEACHER_ID = 2; // Hardcoced for now, pending real auth context

    const fetchHistory = useCallback(async () => {
        const { data, error } = await supabase
            .from('generated_resources')
            .select('*')
            .eq('teacher_id', TEACHER_ID)
            .order('updated_at', { ascending: false });

        if (error) {
            console.error("Error fetching history:", error);
            return;
        }

        if (data) {
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
        }
    }, [TEACHER_ID]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

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

        // Check availability first to decide update vs insert (or use upsert if constraint exists)
        // We don't have a unique constraint on subject+class+teacher in the provided SQL schema,
        // so upsert might duplicate if we rely on ID. We'll try to find an existing record first.
        const { data: existing } = await supabase
            .from('generated_resources')
            .select('id')
            .eq('teacher_id', TEACHER_ID)
            .eq('subject', subject)
            .eq('class_name', className)
            .maybeSingle();

        let error;
        if (existing) {
            const { error: updateError } = await supabase
                .from('generated_resources')
                .update({
                    scheme_content: schemeData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('generated_resources')
                .insert([{
                    teacher_id: TEACHER_ID,
                    subject,
                    class_name: className,
                    term: 'All', // Defaulting as we store all 3
                    scheme_content: schemeData
                }]);
            error = insertError;
        }

        if (error) {
            console.error("Error saving scheme:", error);
            setToastMessage('Failed to save scheme.');
        } else {
            setToastMessage('Scheme of work saved to database!');
            fetchHistory(); // Refresh
        }
    }, [subject, className, term1Scheme, term2Scheme, term3Scheme, TEACHER_ID, fetchHistory]);

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
        // In DB mode, maybe we don't want to clear ALL, or maybe we do?
        // Let's just alert that this feature is restricted for now or clear local state?
        // Actually, let's skip implementing "Clear All" for database as it's dangerous.
        alert("Deleting all history is disabled in connected mode. You can overwrite entries by saving.");
    }, []);

    const handleLoadFromGeneratedHistory = useCallback((entry: GeneratedHistoryEntry) => {
        setIsGeneratedHistoryOpen(false);
        navigateTo('lessonPlanDetail', `AI Plan: ${entry.subject}`, { resources: entry.resources });
    }, [navigateTo]);

    const handleClearGeneratedHistory = useCallback(() => {
        alert("Deleting all history is disabled in connected mode.");
    }, []);

    const schemes = { term1: term1Scheme, term2: term2Scheme, term3: term3Scheme };
    const currentScheme = schemes[activeTerm];
    const setCurrentScheme = { term1: setTerm1Scheme, term2: setTerm2Scheme, term3: setTerm3Scheme }[activeTerm];

    const handleGenerate = async () => {
        if (!subject.trim() || !className.trim() || !hasSchemeContent) {
            alert("Please provide a subject, class name, and at least one topic in a term's scheme of work.");
            return;
        }
        const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || "AIzaSyCbaGxsPmwNb8KuqFV2VTBhRZUVvO82FXI";
        if (!apiKey) {
            alert("Configuration Error: API Key is missing.");
            return;
        }

        setIsGenerating(true);
        try {
            const ai = new GoogleGenAI({ apiKey });

            const prompt = `As an expert curriculum designer for the Nigerian school system, generate educational resources for ${subject} for the class ${className}.

**Primary Directive: Content Generation from User Topics**
Your function is to create educational materials based *exclusively* on the topics provided by the user for each week.

**Format Requirements:**
1.  **Professional Lesson Notes:** The 'detailedNotes' field for each week must be structured as a formal Professional Lesson Note. It should include:
    *   **Topic & Sub-topics**
    *   **Behavioral Objectives:** (What students should be able to do by the end)
    *   **Entry Behavior/Previous Knowledge:** (Connecting to prior learning)
    *   **Instructional Material:** (Tools used)
    *   **Content Development:** (Step-by-step teaching phases: Step 1, Step 2, Step 3, etc.)
    *   **Evaluation:** (Quick class check)
    *   **Conclusion & Assignment**

2.  **Assessments:**
    *   For EACH week, generate an assessment that strictly follows this structure:
        *   **Section A: Objectives** - Exactly **10** multiple-choice questions with options (A-D).
        *   **Section B: Theory** - Exactly **3** theory/essay questions requiring detailed answers.

**Output JSON Structure Requirement:**
Return a PURE JSON object with this EXACT structure (no markdown code blocks):
{
  "subject": "${subject}",
  "className": "${className}",
  "terms": [
    {
      "term": "First Term",
      "schemeOfWork": [{"week": 1, "topic": "..."}],
      "lessonPlans": [{"week": 1, "topic": "...", "objectives": [], "materials": [], "teachingSteps": [{"step": "", "description": ""}], "duration": "", "keyVocabulary": [], "assessmentMethods": []}],
      "assessments": [{"week": 1, "type": "Weekly Assessment", "totalMarks": 20, "questions": [{"id": 1, "question": "...", "type": "multiple-choice", "options": ["A", "B", "C", "D"], "answer": "A", "marks": 1}]}]
    }
    // Repeat for Second Term and Third Term
  ],
  "detailedNotes": [
    {
      "topic": "Topic Name",
      "note": "Full markdown text of the professional lesson note..."
    }
  ]
}

**How to Handle User Input:**
1.  **If a week has a Main Topic AND Sub-Topics:** Content must be based *only* on the provided Sub-Topics.
2.  **If a week has ONLY a Main Topic:** You **MUST** break it down into relevant sections to generate a full lesson note.

**ABSOLUTE RESTRICTION**: Do not generate content for topics not provided in the scheme.

**User-provided schemes of work**:
- First Term: ${JSON.stringify(term1Scheme)}
- Second Term: ${JSON.stringify(term2Scheme)}
- Third Term: ${JSON.stringify(term3Scheme)}

**Your Task**:
For EACH term that has topics provided in the user's scheme, generate the corresponding lessonPlans, assessments, and detailedNotes based on all rules above.
Return a single JSON object matching the required schema.`;


            // NOTE: Strict response schemas and forcing `application/json` can cause
            // schema-validation failures on the model side and make debugging hard.
            // For reliability, request a normal text response, log the raw output,
            // and parse with a resilient fallback so we surface errors instead of
            // silently failing.
            // Direct REST API Loop - Robust Fallback Strategy
            const modelsToUse = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-pro'];
            let generatedText = null;
            let finalError = null;

            console.log("Starting AI generation with model fallbacks...");

            for (const model of modelsToUse) {
                try {
                    console.log(`Attempting generation with model: ${model}`);
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (generatedText) {
                            console.log(`Success with model: ${model}`);
                            break; // Success!
                        }
                    } else {
                        const err = await response.json().catch(() => ({}));
                        console.warn(`Model ${model} failed (${response.status}):`, err);
                        finalError = new Error(`Model ${model} error: ${response.status} ${err.error?.message || response.statusText}`);

                        // If it's a critical auth error (400/403 with API key msg), stop trying others to avoid locking key
                        if (response.status === 400 && JSON.stringify(err).toLowerCase().includes('api key')) {
                            throw finalError;
                        }
                    }
                } catch (e) {
                    console.error(`Network/Logic error with ${model}:`, e);
                    finalError = e;
                }
            }

            if (!generatedText) {
                console.error("All fallback models failed.");
                throw finalError || new Error("All AI models failed to respond. Please check your internet or API key.");
            }

            // Map to expected structure for downstream processing
            const response = {
                text: generatedText
            };

            // Log raw response for debugging (inspect in browser console)
            console.debug('AI raw response object:', response);
            console.debug('AI raw response.text:', response.text);

            let resources: GeneratedResources | null = null;
            let raw = response.text ? response.text.trim() : '';

            // Clean up Markdown code blocks if present
            raw = raw.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();

            try {
                // Attempt direct parse first
                resources = JSON.parse(raw);
            } catch (parseError) {
                console.warn('Direct JSON parse failed. Attempting robust extraction.', parseError);

                // Robust extraction: find the widest range from first '{' to last '}'
                const firstBrace = raw.indexOf('{');
                const lastBrace = raw.lastIndexOf('}');

                if (firstBrace > -1 && lastBrace > firstBrace) {
                    const possibleJson = raw.substring(firstBrace, lastBrace + 1);
                    try {
                        resources = JSON.parse(possibleJson);
                    } catch (secondError) {
                        console.error('Robust JSON parse failed.', secondError);
                        alert('AI returned an invalid JSON format. Check console for raw output.');
                        throw secondError;
                    }
                } else {
                    console.error('No JSON object found in response used.', raw);
                    alert('AI returned text instead of JSON. Try again.');
                    throw parseError;
                }
            }

            if (!resources) {
                throw new Error('Failed to obtain generated resources from AI response.');
            }

            // Save to Database
            const { data: existing } = await supabase
                .from('generated_resources')
                .select('id')
                .eq('teacher_id', TEACHER_ID)
                .eq('subject', resources.subject)
                .eq('class_name', resources.className)
                .maybeSingle();

            if (existing) {
                await supabase
                    .from('generated_resources')
                    .update({
                        lesson_plans_content: resources,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id);
            } else {
                await supabase
                    .from('generated_resources')
                    .insert([{
                        teacher_id: TEACHER_ID,
                        subject: resources.subject,
                        class_name: resources.className,
                        term: 'All', // Default
                        lesson_plans_content: resources
                    }]);
            }

            fetchHistory(); // Refresh history list

            navigateTo('lessonPlanDetail', `AI Plan: ${resources.subject}`, { resources });

        } catch (error: any) {
            console.error("AI Generation Error:", error);
            const errorMessage = error.message || "Unknown error";
            if (errorMessage.includes("404")) {
                alert(`AI Models unavailable. Please check your region or API key permissions (404 Not Found).`);
            } else if (errorMessage.includes("401") || errorMessage.includes("API key")) {
                alert(`Authentication failed. Please check your API Key.`);
            } else {
                alert(`Generation failed: ${errorMessage}. Please try again.`);
            }
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
                            <input id="subject" type="text" value={subject} onChange={e => setSubject(e.target.value)} required className="w-full p-2 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg" />
                        </div>
                        <div className="flex-grow">
                            <label htmlFor="className" className="block text-sm font-medium text-gray-700 mb-1">Class Name</label>
                            <input id="className" type="text" value={className} onChange={e => setClassName(e.target.value)} required className="w-full p-2 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg" />
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