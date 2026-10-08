import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import { isAIAllowedClient, AI_LOCKED_MESSAGE } from '../../lib/ai';
import { toast } from 'react-hot-toast';

import { SchemeWeek, HistoryEntry, GeneratedHistoryEntry, GeneratedResources } from '../../types';
import { SparklesIcon, TrashIcon, PlusIcon, XCircleIcon, CheckCircleIcon, ExclamationCircleIcon, getFormattedClassName } from '../../constants';
import { useTeacherClasses } from '../../hooks/useTeacherClasses';
import { useAutoSync } from '../../hooks/useAutoSync';
import { generateLocalCurriculum } from '../../utils/lessonNoteGenerator';
import {
    TERM_LABELS, TermKey, PlannerAIClient, GeneratedWeek, PlannerAIError,
    generateTermPlan, mergeTermIntoResources, normalizeResources, plannableWeeks, weeksFromTerm,
} from '../../utils/lessonPlanAI';

const HistoryIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M12 8l0 4l2 2" /><path d="M3.05 11a9 9 0 1 1 .5 4m-3.55 -4a9 9 0 0 1 12.5 -5" /><path d="M3 4v4h4" /></svg>;
const FolderIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2" /></svg>;

// --- SUB-COMPONENTS ---

const SchemeInput: React.FC<{ scheme: SchemeWeek[]; setScheme: React.Dispatch<React.SetStateAction<SchemeWeek[]>>; disabled?: boolean }> = ({ scheme, setScheme, disabled }) => {
    // Copy-on-write so React sees new objects (the old version mutated the
    // existing week objects in place).
    const updateWeek = (weekIndex: number, change: (w: SchemeWeek) => SchemeWeek) =>
        setScheme(scheme.map((w, i) => (i === weekIndex ? change({ ...w, subTopics: [...w.subTopics] }) : w)));

    const addWeek = () => {
        const newWeek = scheme.length > 0 ? Math.max(...scheme.map(s => s.week)) + 1 : 1;
        setScheme([...scheme, { week: newWeek, topic: '', subTopics: [] }]);
    };

    return (
        <fieldset className="min-w-0 space-y-3" disabled={disabled}>
            <legend className="sr-only">Weekly topics</legend>
            {scheme.map((entry, weekIndex) => (
                <div key={entry.week} className="bg-gray-50/70 p-3 rounded-lg border border-gray-200">
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-x-2 gap-y-1">
                        <label htmlFor={`week-topic-${entry.week}`} className="w-full sm:w-16 shrink-0 text-sm font-semibold text-gray-700">Week {entry.week}</label>
                        <input
                            id={`week-topic-${entry.week}`}
                            type="text"
                            value={entry.topic}
                            onChange={(e) => updateWeek(weekIndex, w => ({ ...w, topic: e.target.value }))}
                            placeholder="Main Topic for the Week"
                            className="min-w-0 flex-1 min-h-[44px] px-3 font-semibold border text-gray-800 bg-white border-gray-300 rounded-md focus:ring-1 focus:ring-gray-500"
                        />
                        <button type="button" onClick={() => setScheme(scheme.filter((_, i) => i !== weekIndex))} className="shrink-0 w-11 h-11 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50" aria-label={`Remove week ${entry.week}`}><TrashIcon className="w-5 h-5" /></button>
                    </div>
                    <div className="mt-2 space-y-2 sm:pl-[4.5rem]">
                        {entry.subTopics.map((subTopic, subIndex) => (
                            <div key={subIndex} className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={subTopic}
                                    onChange={(e) => updateWeek(weekIndex, w => { w.subTopics[subIndex] = e.target.value; return w; })}
                                    placeholder="Add a sub-topic or learning objective"
                                    aria-label={`Week ${entry.week} sub-topic ${subIndex + 1}`}
                                    className="min-w-0 flex-1 min-h-[44px] px-3 text-sm border bg-white text-gray-800 border-gray-300 rounded-md focus:ring-1 focus:ring-gray-500"
                                />
                                <button type="button" onClick={() => updateWeek(weekIndex, w => { w.subTopics.splice(subIndex, 1); return w; })} className="shrink-0 w-11 h-11 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50" aria-label={`Remove week ${entry.week} sub-topic ${subIndex + 1}`}><XCircleIcon className="w-5 h-5" /></button>
                            </div>
                        ))}
                        <button type="button" onClick={() => updateWeek(weekIndex, w => ({ ...w, subTopics: [...w.subTopics, ''] }))} className="inline-flex items-center gap-1.5 min-h-[44px] px-3 text-sm font-semibold text-gray-800 bg-gray-200 rounded-md hover:bg-gray-300"><PlusIcon className="w-4 h-4" /><span>Add Sub-Topic</span></button>
                    </div>
                </div>
            ))}
            <button type="button" onClick={addWeek} className="w-full flex items-center justify-center gap-1.5 min-h-[44px] text-sm font-semibold text-gray-800 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-100 hover:border-gray-400"><PlusIcon className="w-4 h-4" /><span>Add Week</span></button>
        </fieldset>
    );
};

const ModalShell: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div role="dialog" aria-modal="true" aria-label={title} className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="pl-4 pr-2 py-2 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800">{title}</h3>
                    <button onClick={onClose} className="w-11 h-11 flex items-center justify-center text-gray-400 hover:text-gray-600" aria-label="Close"><XCircleIcon className="w-7 h-7" /></button>
                </div>
                <div className="flex-grow p-4 space-y-2 overflow-y-auto">{children}</div>
            </div>
        </div>
    );
};

const HistoryModal: React.FC<{ isOpen: boolean; onClose: () => void; history: HistoryEntry[]; onLoad: (entry: HistoryEntry) => void; }> = ({ isOpen, onClose, history, onLoad }) => {
    if (!isOpen) return null;
    return (
        <ModalShell title="Load Scheme of Work" onClose={onClose}>
            {history.length > 0 ? history.map((entry, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="font-bold text-gray-800 truncate">{entry.subject}</p>
                        <p className="text-sm text-gray-600">{entry.className}</p>
                        <p className="text-xs text-gray-500 mt-1">Last saved: {new Date(entry.lastUpdated).toLocaleString()}</p>
                    </div>
                    <button onClick={() => onLoad(entry)} className="shrink-0 min-h-[44px] px-4 text-sm font-semibold bg-gray-800 text-white rounded-lg hover:bg-gray-900">Load</button>
                </div>
            )) : (
                <div className="text-center py-8">
                    <p className="font-semibold text-gray-700">No saved schemes yet</p>
                    <p className="text-sm text-gray-500 mt-1">Fill in your weekly topics and tap Save Scheme to keep them here.</p>
                </div>
            )}
        </ModalShell>
    );
};

const GeneratedHistoryModal: React.FC<{ isOpen: boolean; onClose: () => void; history: GeneratedHistoryEntry[]; onLoad: (entry: GeneratedHistoryEntry) => void; }> = ({ isOpen, onClose, history, onLoad }) => {
    if (!isOpen) return null;
    return (
        <ModalShell title="Load Generated Plan" onClose={onClose}>
            {history.length > 0 ? history.map((entry, idx) => {
                const terms = (entry.resources?.terms || []).filter(t => (t.lessonPlans || []).length > 0).map(t => t.term);
                return (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="font-bold text-gray-800 truncate">{entry.subject}</p>
                            <p className="text-sm text-gray-600">{entry.className}{terms.length ? ` · ${terms.join(', ')}` : ''}</p>
                            <p className="text-xs text-gray-500 mt-1">Generated: {new Date(entry.lastUpdated).toLocaleString()}</p>
                        </div>
                        <button onClick={() => onLoad(entry)} className="shrink-0 min-h-[44px] px-4 text-sm font-semibold bg-purple-600 text-white rounded-lg hover:bg-purple-700">View</button>
                    </div>
                );
            }) : (
                <div className="text-center py-8">
                    <p className="font-semibold text-gray-700">No generated plans yet</p>
                    <p className="text-sm text-gray-500 mt-1">Plans you generate are saved here automatically.</p>
                </div>
            )}
        </ModalShell>
    );
};

/** The planner's AI calls, through the app's server-side AI proxy. */
const plannerAI: PlannerAIClient = {
    chat: async (body) => {
        if (!isAIAllowedClient()) throw new PlannerAIError(AI_LOCKED_MESSAGE, 'locked');
        return api.aiChat(body as any);
    },
};

type GenState =
    | { status: 'idle' }
    | { status: 'running'; done: number; total: number }
    | { status: 'error'; message: string; canOpen: boolean };

const emptyWeek = (): SchemeWeek[] => [{ week: 1, topic: '', subTopics: [] }];

// --- MAIN COMPONENT ---

const LessonPlannerScreen: React.FC<{
    navigateTo: (view: string, title: string, props?: any) => void;
    teacherId?: string | null;
    schoolId?: string;
    currentBranchId?: string | null;
}> = ({ navigateTo, teacherId, schoolId, currentBranchId }) => {
    const [subject, setSubject] = useState('');
    const [className, setClassName] = useState('');
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
    const { classes: rawTeacherClasses, subjects: teacherSubjects, assignments: rawAssignments } = useTeacherClasses(teacherId);

    const teacherClasses = useMemo(() => {
        const groups = new Map<string, any>();
        rawTeacherClasses.forEach(cls => {
            const name = getFormattedClassName(cls.grade, cls.section);
            if (!groups.has(name)) groups.set(name, cls);
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
    const [schemeHistory, setSchemeHistory] = useState<HistoryEntry[]>([]);
    const [activeTerm, setActiveTerm] = useState<TermKey>('term1');
    const [term1Scheme, setTerm1Scheme] = useState<SchemeWeek[]>(emptyWeek);
    const [term2Scheme, setTerm2Scheme] = useState<SchemeWeek[]>(emptyWeek);
    const [term3Scheme, setTerm3Scheme] = useState<SchemeWeek[]>(emptyWeek);
    const [genState, setGenState] = useState<GenState>({ status: 'idle' });
    const [isSaving, setIsSaving] = useState(false);
    // Weeks finished by a run that partly failed — Retry only asks for the rest.
    const partialRef = useRef<{ key: string; weeks: GeneratedWeek[] } | null>(null);
    const cancelRef = useRef(false);
    const isGenerating = genState.status === 'running';

    const storageKey = `lesson_planner_draft_${teacherId}`;

    // Load draft on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const draft = JSON.parse(saved);
                if (draft.selectedSubjectId) setSelectedSubjectId(draft.selectedSubjectId);
                if (draft.selectedClassId) setSelectedClassId(draft.selectedClassId);
                if (draft.subject) setSubject(draft.subject);
                if (draft.className) setClassName(draft.className);
                if (draft.term1Scheme) setTerm1Scheme(draft.term1Scheme);
                if (draft.term2Scheme) setTerm2Scheme(draft.term2Scheme);
                if (draft.term3Scheme) setTerm3Scheme(draft.term3Scheme);
                if (draft.activeTerm) setActiveTerm(draft.activeTerm);
            }
        } catch (e) {
            console.error("Failed to load lesson planner draft:", e);
        }
    }, [storageKey]);

    // Save draft on change
    useEffect(() => {
        try {
            localStorage.setItem(storageKey, JSON.stringify({
                selectedSubjectId, selectedClassId, subject, className,
                term1Scheme, term2Scheme, term3Scheme, activeTerm,
                timestamp: new Date().toISOString()
            }));
        } catch { /* storage full or blocked — the draft is a convenience only */ }
    }, [selectedSubjectId, selectedClassId, subject, className, term1Scheme, term2Scheme, term3Scheme, activeTerm, storageKey]);

    // Stop a running generation from updating a screen that has been left.
    useEffect(() => () => { cancelRef.current = true; }, []);

    const effectiveTeacherId = teacherId || '';

    const fetchHistory = useCallback(async () => {
        try {
            const data = await api.getGeneratedResources(schoolId || '');
            // `content` is a plain string column on GeneratedResource — the actual
            // payload is JSON stringified into it, discriminated by `content_type`.
            const parseContent = (row: any) => {
                try { return typeof row.content === 'string' ? JSON.parse(row.content) : row.content; }
                catch { return null; }
            };
            const rows = Array.isArray(data) ? data : [];
            setSchemeHistory(rows
                .filter(row => row.content_type === 'scheme')
                .map(row => {
                    const parsed = parseContent(row) || {};
                    return {
                        subject: row.subject,
                        className: row.class_name,
                        term1Scheme: parsed.term1 || [],
                        term2Scheme: parsed.term2 || [],
                        term3Scheme: parsed.term3 || [],
                        lastUpdated: row.updated_at
                    };
                }));
            setGeneratedHistory(rows
                .filter(row => row.content_type === 'generated_resources')
                .map(row => ({
                    subject: row.subject,
                    className: row.class_name,
                    lastUpdated: row.updated_at,
                    resources: normalizeResources(parseContent(row) || { subject: row.subject, className: row.class_name, terms: [] })
                })));
        } catch (error) {
            console.error("Error fetching history:", error);
        }
    }, [effectiveTeacherId, schoolId, currentBranchId]);

    useEffect(() => { fetchHistory(); }, [fetchHistory]);
    useAutoSync(['generated_resources'], fetchHistory);

    const schemes = { term1: term1Scheme, term2: term2Scheme, term3: term3Scheme };
    const currentScheme = schemes[activeTerm];
    const setCurrentScheme = { term1: setTerm1Scheme, term2: setTerm2Scheme, term3: setTerm3Scheme }[activeTerm];
    const termLabel = TERM_LABELS[activeTerm];
    const termWeeks = useMemo(() => plannableWeeks(currentScheme), [currentScheme]);

    const savedPlan = useMemo(
        () => generatedHistory.find(h => h.subject === subject && h.className === className) || null,
        [generatedHistory, subject, className]
    );
    const savedTermsForClass = (savedPlan?.resources.terms || []).filter(t => t.lessonPlans.length > 0).map(t => t.term);

    const canGenerate = !isGenerating && !!subject.trim() && !!className.trim() && termWeeks.length > 0;
    const missingHint = !subject.trim() || !className.trim()
        ? 'Choose a subject and class to get started.'
        : termWeeks.length === 0 ? `Add at least one topic for the ${termLabel}.` : '';

    const openPlan = useCallback((resources: GeneratedResources, title: string, term?: string) => {
        navigateTo('lessonPlanDetail', title, {
            resources: { ...resources, subjectId: selectedSubjectId, classId: selectedClassId, teacherId: effectiveTeacherId },
            initialTerm: term,
        });
    }, [navigateTo, selectedSubjectId, selectedClassId, effectiveTeacherId]);

    const saveGenerated = useCallback(async (resources: GeneratedResources) => {
        await api.saveGeneratedResource(schoolId || '', {
            teacher_id: effectiveTeacherId,
            school_id: schoolId,
            branch_id: currentBranchId,
            subject,
            class_name: className,
            content_type: 'generated_resources',
            content: JSON.stringify(resources)
        });
    }, [schoolId, effectiveTeacherId, currentBranchId, subject, className]);

    const handleSaveScheme = useCallback(async () => {
        if (!subject.trim() || !className.trim()) {
            toast.error('Please choose a subject and class before saving.');
            return;
        }
        setIsSaving(true);
        try {
            await api.saveGeneratedResource(schoolId || '', {
                teacher_id: effectiveTeacherId,
                school_id: schoolId,
                branch_id: currentBranchId,
                subject,
                class_name: className,
                content_type: 'scheme',
                content: JSON.stringify({ term1: term1Scheme, term2: term2Scheme, term3: term3Scheme })
            });
            toast.success('Scheme of work saved to database!');
            fetchHistory();
        } catch (error) {
            console.error("Error saving scheme:", error);
            toast.error('Could not save the scheme. Check your connection and try again.');
        } finally {
            setIsSaving(false);
        }
    }, [subject, className, term1Scheme, term2Scheme, term3Scheme, effectiveTeacherId, schoolId, currentBranchId, fetchHistory]);

    const handleLoadFromSchemeHistory = useCallback((entry: HistoryEntry) => {
        setSubject(entry.subject);
        setClassName(entry.className);
        // Re-select the matching dropdown options so the pickers show what was loaded.
        const cls = teacherClasses.find(c => getFormattedClassName(c.grade, c.section) === entry.className);
        setSelectedClassId(cls ? cls.id : '');
        const sub = teacherSubjects.find(s => s.name === entry.subject);
        setSelectedSubjectId(sub ? sub.id : '');
        setTerm1Scheme(entry.term1Scheme.length ? entry.term1Scheme : emptyWeek());
        setTerm2Scheme(entry.term2Scheme.length ? entry.term2Scheme : emptyWeek());
        setTerm3Scheme(entry.term3Scheme.length ? entry.term3Scheme : emptyWeek());
        setIsSchemeHistoryOpen(false);
        setGenState({ status: 'idle' });
        toast.success(`Loaded scheme for ${entry.subject} - ${entry.className}.`);
    }, [teacherClasses, teacherSubjects]);

    const handleLoadFromGeneratedHistory = useCallback((entry: GeneratedHistoryEntry) => {
        setIsGeneratedHistoryOpen(false);
        navigateTo('lessonPlanDetail', `AI Plan: ${entry.subject}`, { resources: entry.resources });
    }, [navigateTo]);

    const handleLocalGenerate = async () => {
        if (!canGenerate) { toast.error(missingHint || 'Please add a topic first.'); return; }
        setGenState({ status: 'running', done: 0, total: termWeeks.length });
        try {
            const local = generateLocalCurriculum(subject, className, {
                term1: activeTerm === 'term1' ? term1Scheme : [],
                term2: activeTerm === 'term2' ? term2Scheme : [],
                term3: activeTerm === 'term3' ? term3Scheme : [],
            });
            const term = local.terms.find(t => t.term === termLabel)!;
            const merged = mergeTermIntoResources(savedPlan?.resources, { subject, className },
                { term: term.term, schemeOfWork: term.schemeOfWork, lessonPlans: term.lessonPlans as any, assessments: term.assessments as any },
                local.detailedNotes);
            await saveGenerated(merged);
            fetchHistory();
            setGenState({ status: 'idle' });
            toast.success(`${termLabel} template created from your topics.`);
            openPlan(merged, `Local Plan: ${subject}`, termLabel);
        } catch (error) {
            console.error("Local Generation Error:", error);
            setGenState({ status: 'error', message: 'Could not save the plan. Check your connection and try again.', canOpen: false });
        }
    };

    const handleGenerate = async (retry = false) => {
        if (!canGenerate) { toast.error(missingHint || 'Please add a topic first.'); return; }
        const runKey = `${subject}|${className}|${termLabel}`;
        const already = retry && partialRef.current?.key === runKey ? partialRef.current.weeks : [];
        cancelRef.current = false;
        setGenState({ status: 'running', done: already.length, total: termWeeks.length });

        try {
            const result = await generateTermPlan({
                ai: plannerAI,
                subject,
                className,
                termLabel,
                scheme: currentScheme,
                already,
                onProgress: p => { if (!cancelRef.current) setGenState({ status: 'running', ...p }); },
                isCancelled: () => cancelRef.current,
            });

            partialRef.current = { key: runKey, weeks: weeksFromTerm(result.term, result.notes) };

            if (result.term.lessonPlans.length === 0) {
                setGenState({
                    status: 'error',
                    message: result.firstError?.code === 'locked'
                        ? result.firstError.message
                        : `${result.firstError?.message || 'Nothing came back from the AI.'} Nothing was saved.`,
                    canOpen: false,
                });
                return;
            }

            const merged = mergeTermIntoResources(savedPlan?.resources, { subject, className }, result.term, result.notes);
            try {
                await saveGenerated(merged);
            } catch (e) {
                console.error('Saving generated plan failed:', e);
                setGenState({ status: 'error', message: 'Your plans were generated but could not be saved. Check your connection and try again.', canOpen: false });
                return;
            }
            fetchHistory();

            if (result.failedWeeks.length > 0) {
                setGenState({
                    status: 'error',
                    message: `${result.term.lessonPlans.length} of ${termWeeks.length} weeks are ready and saved. Week${result.failedWeeks.length > 1 ? 's' : ''} ${result.failedWeeks.join(', ')} did not finish: ${result.firstError?.message || 'the AI did not answer.'}`,
                    canOpen: true,
                });
                return;
            }

            partialRef.current = null;
            setGenState({ status: 'idle' });
            toast.success(`${termLabel} lesson plans are ready and saved.`);
            openPlan(merged, `AI Plan: ${subject}`, termLabel);
        } catch (error: any) {
            if (error instanceof PlannerAIError && error.code === 'cancelled') {
                setGenState({ status: 'idle' });
                return;
            }
            console.error("AI Generation Error:", error);
            setGenState({ status: 'error', message: 'Something went wrong while generating. Please try again.', canOpen: false });
        }
    };

    const handleCancel = () => {
        cancelRef.current = true;
        setGenState({ status: 'idle' });
        toast('Generation stopped. Nothing new was saved.');
    };

    const progressPct = genState.status === 'running' && genState.total > 0 ? Math.round((genState.done / genState.total) * 100) : 0;

    return (
        <div className="flex flex-col h-full bg-gray-100">
            <main className="flex-grow min-h-0 overflow-y-auto p-4 pb-24 lg:p-6">
                <div className="mx-auto w-full max-w-6xl grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] lg:items-start">
                    <div className="min-w-0 space-y-5">
                        <header className="flex items-start gap-3">
                            <SparklesIcon className="h-8 w-8 shrink-0 text-gray-500 mt-0.5" />
                            <div className="min-w-0">
                                <h2 className="font-bold text-lg text-gray-800">AI Curriculum Co-Pilot</h2>
                                <p className="text-sm text-gray-700">Enter a term's weekly topics, then generate lesson plans, board notes and evaluation questions for each week.</p>
                            </div>
                        </header>

                        <section aria-label="Subject and class" className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="min-w-0">
                                    <label htmlFor="className" className="block text-sm font-medium text-gray-700 mb-1">Class Name</label>
                                    <select
                                        id="className"
                                        value={selectedClassId}
                                        disabled={isGenerating}
                                        onChange={e => {
                                            setSelectedClassId(e.target.value);
                                            const cls = teacherClasses.find(c => c.id === e.target.value);
                                            setClassName(cls ? getFormattedClassName(cls.grade, cls.section) : '');
                                            setGenState({ status: 'idle' });
                                        }}
                                        required
                                        className="w-full min-h-[44px] px-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg"
                                    >
                                        <option value="">Select Class</option>
                                        {teacherClasses.map(c => (
                                            <option key={c.id} value={c.id}>{getFormattedClassName(c.grade, c.section)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="min-w-0">
                                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                    <select
                                        id="subject"
                                        value={selectedSubjectId}
                                        disabled={isGenerating}
                                        onChange={e => {
                                            setSelectedSubjectId(e.target.value);
                                            const sub = filteredSubjects.find(s => s.id === e.target.value);
                                            setSubject(sub ? sub.name : '');
                                            setGenState({ status: 'idle' });
                                        }}
                                        required
                                        className="w-full min-h-[44px] px-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg"
                                    >
                                        <option value="">Select Subject</option>
                                        {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button type="button" onClick={() => setIsSchemeHistoryOpen(true)} className="w-full flex items-center justify-center gap-2 min-h-[44px] px-2 text-sm font-semibold text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100">
                                    <HistoryIcon className="w-4 h-4 shrink-0" />
                                    <span>Load Scheme</span>
                                </button>
                                <button type="button" onClick={() => setIsGeneratedHistoryOpen(true)} className="w-full flex items-center justify-center gap-2 min-h-[44px] px-2 text-sm font-semibold text-purple-700 border border-purple-300 rounded-lg hover:bg-purple-50">
                                    <FolderIcon className="w-4 h-4 shrink-0" />
                                    <span>Saved Plans</span>
                                </button>
                            </div>
                        </section>

                        <section aria-labelledby="planner-scheme" className="bg-white p-4 rounded-xl shadow-sm">
                            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-3">
                                <h3 id="planner-scheme" className="font-bold text-gray-800">Scheme of work</h3>
                                <p className="text-sm text-gray-500">{termWeeks.length} {termWeeks.length === 1 ? 'week' : 'weeks'} with topics</p>
                            </div>
                            <div role="tablist" aria-label="Term" className="grid grid-cols-3 gap-1 bg-gray-200 p-1 rounded-lg mb-4">
                                {(Object.keys(TERM_LABELS) as TermKey[]).map(key => (
                                    <button
                                        key={key}
                                        type="button"
                                        role="tab"
                                        aria-selected={activeTerm === key}
                                        disabled={isGenerating}
                                        onClick={() => { setActiveTerm(key); setGenState({ status: 'idle' }); }}
                                        className={`min-h-[44px] px-1 text-sm font-semibold rounded-md disabled:cursor-not-allowed ${activeTerm === key ? 'bg-white shadow text-gray-900' : 'text-gray-700 hover:bg-gray-300/50'}`}
                                    >
                                        {TERM_LABELS[key]}
                                    </button>
                                ))}
                            </div>
                            <SchemeInput scheme={currentScheme} setScheme={setCurrentScheme} disabled={isGenerating} />
                        </section>
                    </div>

                    {/* Actions live in the page flow (their own column on wide screens,
                        after the topics on phones). They used to be a sticky bottom
                        bar; the dashboard scrolls the whole document, so that bar
                        floated over the topics. Nothing here is pinned now — a
                        pinned panel would slide under the dashboard's own header. */}
                    <aside aria-labelledby="planner-actions" className="min-w-0">
                        <section className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                            <div>
                                <h3 id="planner-actions" className="font-bold text-gray-800">Generate for {termLabel}</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    {subject && className
                                        ? `${subject} · ${className} · ${termWeeks.length} ${termWeeks.length === 1 ? 'week' : 'weeks'}`
                                        : 'Choose a subject and class.'}
                                </p>
                                {savedPlan && savedTermsForClass.length > 0 && genState.status !== 'running' && (
                                    <button type="button" onClick={() => openPlan(savedPlan.resources, `AI Plan: ${subject}`, savedTermsForClass.includes(termLabel) ? termLabel : savedTermsForClass[0])} className="mt-1 inline-flex items-center gap-1.5 min-h-[44px] text-sm font-semibold text-purple-700 hover:text-purple-800 text-left">
                                        <CheckCircleIcon className="w-4 h-4 shrink-0" />
                                        <span>Open saved plan ({savedTermsForClass.join(', ')})</span>
                                    </button>
                                )}
                            </div>

                            {genState.status === 'running' && (
                                <div role="status" aria-live="polite" className="space-y-2">
                                    <div className="flex items-center justify-between gap-2 text-sm">
                                        <span className="font-semibold text-gray-800">Writing lesson plans…</span>
                                        <span className="text-gray-600 tabular-nums">{genState.done} of {genState.total} weeks</span>
                                    </div>
                                    <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden" aria-hidden="true">
                                        <div className="h-full bg-gray-900 transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${Math.max(progressPct, 6)}%` }} />
                                    </div>
                                    <p className="text-xs text-gray-500">This usually takes under a minute.</p>
                                    <button type="button" onClick={handleCancel} className="w-full min-h-[44px] text-sm font-semibold text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100">Cancel</button>
                                </div>
                            )}

                            {genState.status === 'error' && (
                                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-3">
                                    <div className="flex gap-2">
                                        <ExclamationCircleIcon className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                                        <p className="text-sm text-red-800">{genState.message}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button type="button" onClick={() => handleGenerate(true)} className="min-h-[44px] text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-black">Retry</button>
                                        {genState.canOpen && savedPlan ? (
                                            <button type="button" onClick={() => openPlan(savedPlan.resources, `AI Plan: ${subject}`, termLabel)} className="min-h-[44px] text-sm font-semibold text-purple-700 border border-purple-300 bg-white rounded-lg hover:bg-purple-50">Open plan</button>
                                        ) : (
                                            <button type="button" onClick={() => setGenState({ status: 'idle' })} className="min-h-[44px] text-sm font-semibold text-gray-700 border border-gray-300 bg-white rounded-lg hover:bg-gray-100">Dismiss</button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {genState.status !== 'running' && (
                                <>
                                    <div className="space-y-2">
                                        <button
                                            type="button"
                                            onClick={() => handleGenerate(false)}
                                            disabled={!canGenerate}
                                            className="w-full flex justify-center items-center gap-2 min-h-[48px] px-4 font-bold text-white bg-gray-900 hover:bg-black rounded-xl shadow-lg disabled:bg-gray-400 disabled:shadow-none transition-all transform active:scale-[0.98]">
                                            <SparklesIcon className="h-5 w-5" />
                                            <span>Generate AI Resources</span>
                                        </button>
                                        {missingHint && <p className="text-sm text-gray-500">{missingHint}</p>}
                                    </div>

                                    <div className="border-t border-gray-100 pt-4 space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <button type="button" onClick={handleSaveScheme} disabled={isSaving || !subject.trim() || !className.trim()} className="w-full min-h-[44px] px-2 text-sm font-medium text-gray-800 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50">
                                                {isSaving ? 'Saving…' : 'Save Scheme'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleLocalGenerate}
                                                disabled={!canGenerate}
                                                aria-describedby="local-generate-help"
                                                className="w-full min-h-[44px] px-2 text-sm font-medium text-blue-800 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                                            >
                                                Generate Locally (No AI)
                                            </button>
                                        </div>
                                        <p id="local-generate-help" className="text-xs text-gray-500">
                                            Save Scheme keeps your topics for all three terms. Generate Locally instantly builds an editable lesson-note template from your topics, without AI.
                                        </p>
                                    </div>
                                </>
                            )}
                        </section>
                    </aside>
                </div>
            </main>

            <HistoryModal isOpen={isSchemeHistoryOpen} onClose={() => setIsSchemeHistoryOpen(false)} history={schemeHistory} onLoad={handleLoadFromSchemeHistory} />
            <GeneratedHistoryModal isOpen={isGeneratedHistoryOpen} onClose={() => setIsGeneratedHistoryOpen(false)} history={generatedHistory} onLoad={handleLoadFromGeneratedHistory} />
        </div>
    );
};

export default LessonPlannerScreen;
