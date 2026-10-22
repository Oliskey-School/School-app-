import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GeneratedResources, TermResources, GeneratedLessonPlan, GeneratedAssessment, DetailedNote } from '../../types';
import { ShareIcon, BookOpenIcon, ClipboardListIcon, ChevronRightIcon, SparklesIcon, CheckCircleIcon, RotateCcwIcon, ClockIcon } from '../../constants';
import { api } from '../../lib/api';
import { normalizeResources } from '../../utils/lessonPlanAI';

const Toast: React.FC<{ message: string; onClear: () => void; }> = ({ message, onClear }) => {
    useEffect(() => {
        const timer = setTimeout(onClear, 3000);
        return () => clearTimeout(timer);
    }, [onClear]);

    return (
        <div role="status" className="fixed bottom-24 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 animate-slide-in-up z-50">
            <CheckCircleIcon className="w-5 h-5 text-green-400" />
            <span>{message}</span>
        </div>
    );
};

// Single line breaks in AI notes (worked-example steps) must stay on their own
// lines; plain markdown would run them together into one paragraph.
const keepLineBreaks = (md: string) => (md || '').replace(/([^\n])\n(?!\n)/g, '$1  \n');

/** Readable markdown for generated notes — tables scroll sideways on phones. */
const NoteMarkdown: React.FC<{ children: string }> = ({ children }) => (
    <div className="text-sm leading-relaxed text-gray-800 space-y-3 break-words">
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                h1: ({ children }) => <h4 className="text-base font-bold text-gray-900 mt-4 first:mt-0">{children}</h4>,
                h2: ({ children }) => <h4 className="text-base font-bold text-gray-900 mt-4 first:mt-0">{children}</h4>,
                h3: ({ children }) => <h4 className="text-base font-bold text-gray-900 mt-4 first:mt-0">{children}</h4>,
                h4: ({ children }) => <h5 className="font-semibold text-gray-900 mt-3">{children}</h5>,
                p: ({ children }) => <p className="text-gray-800">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>,
                table: ({ children }) => <div className="overflow-x-auto -mx-1"><table className="min-w-full text-left border border-gray-200">{children}</table></div>,
                th: ({ children }) => <th className="px-3 py-2 bg-gray-50 font-semibold border-b border-gray-200">{children}</th>,
                td: ({ children }) => <td className="px-3 py-2 border-b border-gray-100 align-top">{children}</td>,
            }}
        >
            {keepLineBreaks(children)}
        </ReactMarkdown>
    </div>
);

const findNote = (notes: DetailedNote[] | undefined, term: string, plan: GeneratedLessonPlan) =>
    (notes || []).find(n => n.term === term && n.week === plan.week)
    || (notes || []).find(n => !n.term && n.topic === plan.topic);

const ListBlock: React.FC<{ title: string; items: string[]; ordered?: boolean }> = ({ title, items, ordered }) => {
    if (!items?.length) return null;
    const List = ordered ? 'ol' : 'ul';
    return (
        <div>
            <h5 className="text-sm font-bold text-gray-900 mb-1.5">{title}</h5>
            <List className={`${ordered ? 'list-decimal' : 'list-disc'} pl-5 space-y-1 text-sm text-gray-800`}>
                {items.map((it, i) => <li key={i}>{it}</li>)}
            </List>
        </div>
    );
};

const SchemeOfWorkTab: React.FC<{ term: TermResources }> = ({ term }) => {
    const rows = term.lessonPlans.length
        ? term.lessonPlans.map(p => ({ week: p.week, topic: p.topic, objectives: p.objectives }))
        : (term.schemeOfWork || []).filter(w => (w.topic || '').trim()).map(w => ({ week: w.week, topic: w.topic, objectives: w.subTopics || [] }));
    if (!rows.length) return <EmptyTab icon={<BookOpenIcon className="h-12 w-12 text-gray-300" />} title="No topics in this term" body="Add topics for this term in the Lesson Planner, then generate again." />;
    return (
        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
            <table className="min-w-[560px] w-full text-sm">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-700 w-20">Week</th>
                        <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-700 w-[35%]">Topic</th>
                        <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-700">{term.lessonPlans.length ? 'Objectives' : 'Sub-topics'}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {rows.map(item => (
                        <tr key={item.week} className="align-top">
                            <td className="px-4 py-3 font-bold text-gray-900">{item.week}</td>
                            <td className="px-4 py-3 font-medium text-gray-900">{item.topic}</td>
                            <td className="px-4 py-3 text-gray-700">
                                {item.objectives.length ? <ul className="list-disc pl-4 space-y-0.5">{item.objectives.map((o, i) => <li key={i}>{o}</li>)}</ul> : <span className="text-gray-400">—</span>}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const EmptyTab: React.FC<{ icon: React.ReactNode; title: string; body: string }> = ({ icon, title, body }) => (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center bg-white rounded-lg border border-gray-200">
        {icon}
        <p className="text-gray-700 font-semibold mt-3">{title}</p>
        <p className="text-gray-500 text-sm mt-1">{body}</p>
    </div>
);

const LessonPlanCard: React.FC<{
    plan: GeneratedLessonPlan;
    note?: DetailedNote;
    defaultOpen: boolean;
    onOpenFull: () => void;
    onSuggest: () => void;
}> = ({ plan, note, defaultOpen, onOpenFull, onSuggest }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <article className="bg-white rounded-lg border border-gray-200">
            <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="w-full min-h-[52px] flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg">
                <span className="min-w-0">
                    <span className="block text-xs font-semibold uppercase tracking-wide text-purple-700">Week {plan.week}{plan.duration ? ` · ${plan.duration}` : ''}</span>
                    <span className="block font-bold text-gray-900">{plan.topic}</span>
                </span>
                <ChevronRightIcon className={`h-5 w-5 shrink-0 text-gray-400 transition-transform motion-reduce:transition-none ${open ? 'rotate-90' : ''}`} />
            </button>
            {open && (
                <div className="px-4 pb-4 space-y-5 border-t border-gray-100 pt-4">
                    <div className="grid gap-5 md:grid-cols-2">
                        <ListBlock title="🎯 Objectives" items={plan.objectives} />
                        <ListBlock title="🧰 Materials" items={plan.materials} />
                    </div>
                    {plan.teachingSteps?.length > 0 && (
                        <div>
                            <h5 className="text-sm font-bold text-gray-900 mb-2">👩🏾‍🏫 Lesson steps</h5>
                            <ol className="space-y-2">
                                {plan.teachingSteps.map((s, i) => (
                                    <li key={i} className="flex gap-3 text-sm">
                                        <span className="shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                                        <span className="min-w-0 text-gray-800"><strong className="text-gray-900">{s.step}.</strong> {s.description}</span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}
                    {plan.keyVocabulary?.length > 0 && (
                        <div>
                            <h5 className="text-sm font-bold text-gray-900 mb-1.5">🔤 Key words</h5>
                            <div className="flex flex-wrap gap-2">
                                {plan.keyVocabulary.map((v, i) => <span key={i} className="text-sm bg-gray-100 text-gray-800 px-2.5 py-1 rounded-md">{v}</span>)}
                            </div>
                        </div>
                    )}
                    <ListBlock title="✅ Assessment" items={plan.assessmentMethods} />
                    {note?.note && (
                        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
                            <h5 className="text-sm font-bold text-gray-900 mb-2">📝 Lesson note</h5>
                            <NoteMarkdown>{note.note}</NoteMarkdown>
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2 print:hidden">
                        <button type="button" onClick={onOpenFull} className="min-h-[44px] px-4 text-sm font-semibold text-purple-700 bg-purple-50 border border-purple-100 rounded-lg hover:bg-purple-100">Open full lesson</button>
                        <button type="button" onClick={onSuggest} className="min-h-[44px] px-4 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100">
                            <SparklesIcon className="w-4 h-4" /><span>Suggest activities</span>
                        </button>
                    </div>
                </div>
            )}
        </article>
    );
};

const LessonPlansTab: React.FC<{ term: TermResources, notes?: DetailedNote[], context: any, subject: string, navigateTo: (view: string, title: string, props: any) => void; }> = ({ term, notes, context, subject, navigateTo }) => {
    const plans = term.lessonPlans;
    if (!plans || plans.length === 0) {
        return <EmptyTab icon={<BookOpenIcon className="h-12 w-12 text-gray-300" />} title="No lesson plans for this term yet" body="Go back to the Lesson Planner, add this term's topics and tap Generate AI Resources." />;
    }
    return (
        <div className="space-y-3">
            {[...plans].sort((a, b) => a.week - b.week).map((plan, i) => {
                const note = findNote(notes, term.term, plan);
                return (
                    <LessonPlanCard
                        key={`${plan.week}-${plan.topic}`}
                        plan={plan}
                        note={note}
                        defaultOpen={i === 0}
                        onOpenFull={() => navigateTo('lessonContent', `Week ${plan.week}`, { lessonPlan: plan, detailedNote: note, context })}
                        onSuggest={() => navigateTo('suggestActivity', 'AI Activity Ideas', { topic: plan.topic, subject })}
                    />
                );
            })}
        </div>
    );
};

const AssessmentDisplay: React.FC<{ assessment: GeneratedAssessment, subject: string, className: string, navigateTo: (view: string, title: string, props?: any) => void; }> = ({ assessment, subject, className, navigateTo }) => (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-baseline justify-between gap-3 mb-3">
            <h4 className="font-bold text-gray-900">{assessment.type}</h4>
            <span className="shrink-0 text-sm text-gray-600">{assessment.totalMarks} marks</span>
        </div>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-800">
            {assessment.questions.map(q => <li key={q.id}>{q.question}</li>)}
        </ol>
        <button
            onClick={() => navigateTo('assignmentView', `Assignment: ${assessment.type}`, { assessment, subject, className })}
            className="mt-4 w-full min-h-[44px] px-4 bg-purple-100 text-purple-700 font-semibold rounded-lg hover:bg-purple-200 transition-colors print:hidden"
        >
            View as Assignment
        </button>
    </div>
);

const AssessmentsTab: React.FC<{ assessments: TermResources['assessments'], subject: string, className: string, navigateTo: (view: string, title: string, props?: any) => void; }> = ({ assessments, subject, className, navigateTo }) => {
    const list = (assessments || []).filter(a => a.questions?.length);
    if (list.length === 0) {
        return <EmptyTab icon={<ClipboardListIcon className="h-12 w-12 text-gray-300" />} title="No evaluation questions yet" body="Questions are created with each week's lesson plan." />;
    }
    return (
        <div className="grid gap-4 md:grid-cols-2">
            {[...list].sort((a, b) => a.week - b.week).map((ass, index) => <AssessmentDisplay key={index} assessment={ass} subject={subject} className={className} navigateTo={navigateTo} />)}
        </div>
    );
};

const TAB_LABELS = { plans: '📘 Lesson Plans', scheme: '🗓️ Scheme', assessments: '✅ Assessments' } as const;

const TermContent: React.FC<{
    termResource: TermResources,
    resources: GeneratedResources,
    navigateTo: (view: string, title: string, props?: any) => void;
}> = ({ termResource, resources, navigateTo }) => {
    const [activeTab, setActiveTab] = useState<keyof typeof TAB_LABELS>('plans');

    // Context IDs passed in from LessonPlannerScreen
    const context = {
        subjectId: (resources as any).subjectId,
        classId: (resources as any).classId,
        teacherId: (resources as any).teacherId
    };

    return (
        <div>
            <div role="tablist" aria-label="Plan sections" className="grid grid-cols-3 gap-1 bg-gray-200 p-1 rounded-lg mb-4 print:hidden">
                {(Object.keys(TAB_LABELS) as Array<keyof typeof TAB_LABELS>).map(key => (
                    <button key={key} type="button" role="tab" aria-selected={activeTab === key} onClick={() => setActiveTab(key)} className={`min-h-[44px] px-1 text-sm font-semibold rounded-md transition-colors ${activeTab === key ? 'bg-white shadow text-black' : 'text-gray-600 hover:bg-gray-300/50'}`}>{TAB_LABELS[key]}</button>
                ))}
            </div>
            {activeTab === 'scheme' && <SchemeOfWorkTab term={termResource} />}
            {activeTab === 'plans' && <LessonPlansTab term={termResource} notes={resources.detailedNotes} context={context} subject={resources.subject} navigateTo={navigateTo} />}
            {activeTab === 'assessments' && <AssessmentsTab assessments={termResource.assessments} subject={resources.subject} className={resources.className} navigateTo={navigateTo} />}
        </div>
    );
};

const LessonPlanDetailScreen: React.FC<{ resources: GeneratedResources; initialTerm?: string; navigateTo: (view: string, title: string, props?: any) => void; }> = ({ resources, initialTerm, navigateTo }) => {
    const currentResources = useMemo(() => (resources ? normalizeResources(resources) : null), [resources]);
    const hasTerm = (t?: string) => !!t && !!currentResources?.terms.some(x => x.term === t);
    const defaultTerm = (hasTerm(initialTerm) ? initialTerm : '')
        || currentResources?.terms.find(t => t.lessonPlans.length > 0)?.term
        || currentResources?.terms[0]?.term || '';
    const [pickedTerm, setActiveTerm] = useState<string>(defaultTerm);
    // The screen can be re-opened with a different plan without remounting;
    // follow the newly requested term then.
    useEffect(() => { setActiveTerm(defaultTerm); }, [resources, initialTerm]); // eslint-disable-line react-hooks/exhaustive-deps
    // Never show a blank page: a term that is not in this plan falls back to the first available one.
    const activeTerm = hasTerm(pickedTerm) ? pickedTerm : defaultTerm;
    const [toastMessage, setToastMessage] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);

    if (!resources || !currentResources) return <div className="flex items-center justify-center min-h-[40vh] p-8 text-center text-gray-500">Open a lesson plan to view its details.</div>;

    const activeTermData = currentResources.terms.find(t => t.term === activeTerm);

    const handlePublish = async () => {
        setIsPublishing(true);
        try {
            const content = JSON.stringify(currentResources, null, 2);
            const fileName = `lesson-plan-${Date.now()}.json`;
            const file = new File([content], fileName, { type: 'application/json' });
            const { publicUrl } = await api.uploadFile('lesson-materials', `plans/${fileName}`, file);
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
            <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap justify-between items-center gap-3 flex-shrink-0 bg-white print:hidden">
                <div className="min-w-0">
                    <h2 className="text-lg font-bold text-gray-800">AI Plan: {currentResources.subject} ({currentResources.className})</h2>
                    <p className="text-sm text-gray-500">Lesson plans, notes and evaluation questions by week</p>
                </div>
                <button
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className="flex items-center gap-1.5 min-h-[44px] px-4 text-sm font-semibold text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 disabled:opacity-50"
                >
                    <ShareIcon className="w-4 h-4" />
                    <span>{isPublishing ? 'Publishing...' : 'Publish to Library'}</span>
                </button>
            </div>

            <main className="flex-grow overflow-y-auto p-4 pb-24 lg:p-6 printable-area">
                <div className="mx-auto w-full max-w-5xl">
                    <div role="tablist" aria-label="Term" className="grid grid-cols-3 gap-2 mb-4 sm:flex print:hidden">
                        {currentResources.terms.map(term => {
                            const count = term.lessonPlans.length;
                            return (
                                <button key={term.term} type="button" role="tab" aria-selected={activeTerm === term.term} onClick={() => setActiveTerm(term.term)} className={`min-w-0 min-h-[44px] px-2 sm:px-4 text-sm sm:text-base font-semibold rounded-lg ${activeTerm === term.term ? 'bg-purple-600 text-white shadow' : 'bg-white text-gray-900 hover:bg-gray-50'}`}>
                                    {term.term}{count ? <span className={`hidden sm:inline ml-1.5 text-sm font-normal ${activeTerm === term.term ? 'text-purple-100' : 'text-gray-500'}`}>· {count}</span> : null}
                                </button>
                            );
                        })}
                    </div>
                    {activeTermData ? <TermContent key={activeTermData.term} termResource={activeTermData} resources={currentResources} navigateTo={navigateTo} /> : <p className="text-gray-900">Select a term to view resources.</p>}
                </div>
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
                const ai = getAIClient();
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
