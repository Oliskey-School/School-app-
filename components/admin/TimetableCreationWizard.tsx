import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getAIClient, SchemaType as Type } from '../../lib/ai';
import { SparklesIcon, XCircleIcon, ClockIcon, UserGroupIcon, ExclamationCircleIcon, CheckCircleIcon, CalendarIcon } from '../../constants';
import { fetchTeachers } from '../../lib/database';
import MultiClassSelector from '../shared/MultiClassSelector';

// --- TYPES ---
interface TimetableCreationWizardProps {
    isOpen: boolean;
    onClose: () => void;
    availableClasses: { id: string; name: string; grade: number; section: string; }[];
    initialSelectedClasses?: string[];
    navigateTo: (view: string, title: string, props: any) => void;
    schoolId?: string;
}

interface TeacherInfo {
    name: string;
    subjects: string[];
}

interface SubjectPeriod {
    name: string;
    periods: number;
}

// --- SUB-COMPONENTS ---
const GeneratingScreen: React.FC = () => (
    <div className="absolute inset-0 bg-white/95 backdrop-blur-xl flex flex-col items-center justify-center z-[60] animate-fade-in">
        <div className="relative">
            <div className="absolute inset-0 bg-indigo-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
            <SparklesIcon className="w-20 h-20 text-indigo-600 animate-spin-slow relative z-10" />
        </div>
        <h3 className="text-3xl font-extrabold mt-8 text-gray-900 tracking-tight">Crafting Schedule...</h3>
        <p className="text-gray-500 mt-3 text-center max-w-md px-6 text-lg">
            Our AI is analyzing constraints, balancing teacher loads, and optimizing the timetable for student success.
        </p>
    </div>
);

const TagInput: React.FC<{ tags: string[]; setTags: (newTags: string[]) => void; placeholder: string }> = ({ tags, setTags, placeholder }) => {
    const [input, setInput] = useState('');

    const handleAddTag = () => {
        const newTag = input.trim();
        if (newTag && !tags.includes(newTag)) {
            setTags([...tags, newTag]);
            setInput('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            handleAddTag();
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-2 p-3 border border-gray-200 rounded-xl bg-gray-50/50 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all min-h-[50px]">
            {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-white border border-indigo-100 text-indigo-700 text-xs font-semibold rounded-full shadow-sm">
                    {tag}
                    <button type="button" onClick={() => handleRemoveTag(tag)} className="p-0.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors">
                        <XCircleIcon className="w-3.5 h-3.5" />
                    </button>
                </span>
            ))}
            <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleAddTag}
                placeholder={tags.length === 0 ? placeholder : ''}
                className="flex-grow bg-transparent p-1 text-sm focus:outline-none min-w-[100px] placeholder:text-gray-400 text-gray-800"
            />
        </div>
    );
};

// --- MAIN COMPONENT ---
const TimetableCreationWizard: React.FC<TimetableCreationWizardProps> = ({ isOpen, onClose, availableClasses, initialSelectedClasses, navigateTo, schoolId }) => {
    // --- STATE ---
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    const [sessionTerm, setSessionTerm] = useState('2025/2026 - 1st Term');
    const [description, setDescription] = useState('');
    const [teachers, setTeachers] = useState<TeacherInfo[]>([]);
    const [subjectPeriods, setSubjectPeriods] = useState<SubjectPeriod[]>([
        { name: 'Mathematics', periods: 5 },
        { name: 'English', periods: 5 },
        { name: 'Science', periods: 4 }
    ]);
    const [customRules, setCustomRules] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Initial Load
    useEffect(() => {
        if (isOpen && schoolId) {
            fetchTeachers(schoolId).then(data => {
                if (data) {
                    setTeachers(data.map(t => ({ name: t.name, subjects: t.subjects || [] })));
                }
            });
        }
    }, [isOpen, schoolId]);

    useEffect(() => {
        if (isOpen && initialSelectedClasses) setSelectedClasses(initialSelectedClasses);
    }, [isOpen, initialSelectedClasses]);

    // --- HANDLERS ---
    const handleAddTeacher = () => setTeachers([...teachers, { name: '', subjects: [] }]);
    const handleRemoveTeacher = (index: number) => setTeachers(teachers.filter((_, i) => i !== index));
    const handleTeacherChange = (index: number, field: 'name' | 'subjects', value: string | string[]) => {
        const newTeachers = [...teachers];
        (newTeachers[index] as any)[field] = value;
        setTeachers(newTeachers);
    };

    const handleAddSubjectPeriod = () => setSubjectPeriods([...subjectPeriods, { name: '', periods: 1 }]);
    const handleRemoveSubjectPeriod = (index: number) => setSubjectPeriods(subjectPeriods.filter((_, i) => i !== index));
    const handleSubjectPeriodChange = (index: number, field: 'name' | 'periods', value: string | number) => {
        const newSubjects = [...subjectPeriods];
        (newSubjects[index] as any)[field] = value;
        setSubjectPeriods(newSubjects);
    }

    const handleGenerate = async () => {
        if (selectedClasses.length === 0) return toast.error("Please select at least one class.");
        if (subjectPeriods.length === 0) return toast.error("Please add at least one subject.");
        if (teachers.length === 0) return toast.error("Please add at least one teacher.");

        setIsGenerating(true);
        try {
            const ai = getAIClient(import.meta.env.VITE_GEMINI_API_KEY || '');
            const classList = selectedClasses.join(', ');

            const prompt = `
                Generate balanced weekly timetables for: ${classList}
                Resources:
                - Teachers: ${JSON.stringify(teachers)}
                - Subjects: ${JSON.stringify(subjectPeriods)}
                Constraints:
                1. NO teacher conflicts (same slot).
                2. Meet weekly period counts.
                3. Spread subjects evenly.
                4. Custom Rules: ${customRules}
                Format: Period 1-8, Mon-Fri.
                Output JSON with schedule for EACH class.
            `;

            const responseSchema = {
                type: Type.OBJECT,
                properties: {
                    schedules: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                className: { type: Type.STRING },
                                timetable: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            slot: { type: Type.STRING },
                                            subject: { type: Type.STRING },
                                            teacher: { type: Type.STRING }
                                        },
                                        required: ["slot", "subject", "teacher"]
                                    }
                                },
                                validationIssues: { type: Type.ARRAY, items: { type: Type.STRING } }
                            },
                            required: ["className", "timetable"]
                        }
                    },
                    globalConflicts: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["schedules", "globalConflicts"]
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: prompt,
                config: { responseMimeType: "application/json", responseSchema: responseSchema }
            });

            // Parse & Transform Logic
            let rawData;
            try {
                const text = response.text.trim();
                const jsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();
                rawData = JSON.parse(jsonText);
            } catch (e) {
                throw new Error("Invalid AI response format.");
            }

            const processedSchedules = rawData.schedules.map((sch: any) => {
                const timetableMap: { [key: string]: string } = {};
                const teacherMap: { [key: string]: string } = {};
                sch.timetable.forEach((slot: any) => {
                    timetableMap[slot.slot] = slot.subject;
                    teacherMap[slot.slot] = slot.teacher;
                });
                return {
                    className: sch.className,
                    timetable: timetableMap,
                    teacherAssignments: teacherMap,
                    issues: sch.validationIssues || []
                };
            });

            onClose();
            navigateTo('timetableEditor', 'Edit Timetables', {
                mode: 'multi',
                schedules: processedSchedules,
                globalConflicts: rawData.globalConflicts,
                generatedAt: new Date().toISOString()
            });

        } catch (error: any) {
            console.error("Timetable generation error:", error);
            toast.error("AI generation failed. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen) return null;

    const totalPeriods = subjectPeriods.reduce((acc, curr) => acc + curr.periods, 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="relative w-full max-w-6xl h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
                {isGenerating && <GeneratingScreen />}

                {/* HEADER */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-white z-20">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <SparklesIcon className="w-6 h-6 text-indigo-600" />
                            AI Timetable Creator
                        </h2>
                        <p className="text-sm text-gray-500">Configure parameters and generate schedules for multiple classes instantly.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
                        <XCircleIcon className="w-8 h-8" />
                    </button>
                </div>

                {/* SCROLLABLE BODY */}
                <div className="flex-grow overflow-y-auto bg-gray-50/50 p-8">
                    <div className="max-w-5xl mx-auto space-y-6">

                        {/* SECTION 1: CONFIGURATION */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4" /> Configuration
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                <div className="md:col-span-6">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Target Classes</label>
                                    <MultiClassSelector classes={availableClasses} selectedClasses={selectedClasses} onChange={setSelectedClasses} />
                                </div>
                                <div className="md:col-span-3">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Academic Session</label>
                                    <select
                                        value={sessionTerm}
                                        onChange={(e) => setSessionTerm(e.target.value)}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                                    >
                                        <option>2025/2026 - 1st Term</option>
                                        <option>2025/2026 - 2nd Term</option>
                                        <option>2025/2026 - 3rd Term</option>
                                    </select>
                                </div>
                                <div className="md:col-span-3">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                                    <input
                                        type="text"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="e.g. Draft 1"
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: RESOURCES */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                            {/* SUBJECTS COLUMN */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-[500px]">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                        <ClockIcon className="w-4 h-4" /> Subjects & Load
                                    </h3>
                                    <button onClick={handleAddSubjectPeriod} className="text-indigo-600 text-xs font-bold hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                                        + Add Subject
                                    </button>
                                </div>
                                <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar space-y-3">
                                    {subjectPeriods.map((subject, index) => (
                                        <div key={index} className="flex gap-2 items-center group">
                                            <input
                                                type="text"
                                                value={subject.name}
                                                onChange={(e) => handleSubjectPeriodChange(index, 'name', e.target.value)}
                                                placeholder="Subject Name"
                                                className="flex-grow p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium text-gray-700"
                                            />
                                            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">Periods</span>
                                                <input
                                                    type="number"
                                                    value={subject.periods}
                                                    onChange={(e) => handleSubjectPeriodChange(index, 'periods', parseInt(e.target.value) || 0)}
                                                    className="w-10 bg-transparent text-center font-bold text-indigo-600 text-sm focus:outline-none"
                                                />
                                            </div>
                                            <button onClick={() => handleRemoveSubjectPeriod(index)} className="text-gray-300 hover:text-red-500 p-1.5 opacity-0 group-hover:opacity-100 transition-all">
                                                <XCircleIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Total Weekly Periods:</span>
                                    <span className={`font-bold ${totalPeriods > 40 ? 'text-red-500' : 'text-gray-900'}`}>{totalPeriods} / 40</span>
                                </div>
                            </div>

                            {/* TEACHERS COLUMN */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-[500px]">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                        <UserGroupIcon className="w-4 h-4" /> Teachers
                                    </h3>
                                    <button onClick={handleAddTeacher} className="text-purple-600 text-xs font-bold hover:bg-purple-50 px-3 py-1.5 rounded-lg transition-colors">
                                        + Add Teacher
                                    </button>
                                </div>
                                <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar space-y-3">
                                    {teachers.map((teacher, index) => (
                                        <div key={index} className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-sm transition-all group">
                                            <div className="flex justify-between mb-2">
                                                <input
                                                    type="text"
                                                    value={teacher.name}
                                                    onChange={(e) => handleTeacherChange(index, 'name', e.target.value)}
                                                    placeholder="Teacher Name"
                                                    className="font-bold text-sm bg-transparent focus:bg-white focus:ring-2 focus:ring-purple-100 rounded px-1.5 py-0.5 outline-none w-full text-gray-800"
                                                />
                                                <button onClick={() => handleRemoveTeacher(index)} className="text-gray-300 hover:text-red-500 transition-colors">
                                                    <XCircleIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <TagInput
                                                tags={teacher.subjects}
                                                setTags={(newTags) => handleTeacherChange(index, 'subjects', newTags)}
                                                placeholder="Add subjects..."
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Total Teachers:</span>
                                    <span className="font-bold text-gray-900">{teachers.length}</span>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 3: CONSTRAINTS */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <ExclamationCircleIcon className="w-4 h-4" /> Custom Rules
                            </h3>
                            <textarea
                                value={customRules}
                                onChange={(e) => setCustomRules(e.target.value)}
                                rows={4}
                                placeholder="e.g. No Math on Friday afternoons, maximize free periods for Mrs. Johnson..."
                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none text-sm text-gray-700 leading-relaxed"
                            />
                        </div>
                    </div>
                </div>

                {/* STICKY FOOTER */}
                <div className="px-8 py-5 bg-white border-t border-gray-100 z-20 flex justify-end gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={selectedClasses.length === 0}
                        className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:shadow-xl transition-all transform active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <SparklesIcon className="w-5 h-5" />
                        Generate Timetable
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TimetableCreationWizard;
