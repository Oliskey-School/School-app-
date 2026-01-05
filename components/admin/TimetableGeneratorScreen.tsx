import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getAIClient, AI_MODEL_NAME, SchemaType as Type } from '../../lib/ai';
import { AIIcon, SparklesIcon, TrashIcon, PlusIcon, XCircleIcon, ChevronRightIcon, CalendarIcon, UserGroupIcon, BookOpenIcon, ClockIcon, EditIcon } from '../../constants';
import { supabase } from '../../lib/supabase';
import { checkTimetableExists, fetchTimetableForClass, fetchTeachers } from '../../lib/database';

// --- TYPES ---
interface TeacherInfo {
    name: string;
    subjects: string[];
}
interface SubjectPeriod {
    name: string;
    periods: number;
}
interface TimetableGeneratorScreenProps {
    navigateTo: (view: string, title: string, props: any) => void;
}

// --- SUB-COMPONENTS ---
const GeneratingScreen: React.FC = () => (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center z-50 animate-fade-in">
        <div className="relative">
            <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
            <SparklesIcon className="w-16 h-16 text-indigo-600 animate-spin-slow relative z-10" />
        </div>
        <h3 className="text-2xl font-bold mt-6 text-gray-800 tracking-tight">Crafting Schedule...</h3>
        <p className="text-gray-500 mt-2 text-center max-w-sm px-4">Our AI is analyzing constraints, balancing teacher loads, and optimizing the timetable for Class success.</p>
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
                <span key={tag} className="flex items-center gap-1.5 pl-3 pr-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full group">
                    {tag}
                    <button type="button" onClick={() => handleRemoveTag(tag)} className="p-0.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-200 rounded-full transition-colors">
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
                className="flex-grow bg-transparent p-1 text-sm focus:outline-none min-w-[120px] placeholder:text-gray-400 text-gray-700"
            />
        </div>
    );
};

// --- MAIN COMPONENT ---
const TimetableGeneratorScreen: React.FC<TimetableGeneratorScreenProps> = ({ navigateTo }) => {
    const [className, setClassName] = useState('');
    const [classes, setClasses] = useState<{ id: string; name: string; grade: number; section: string; }[]>([]);
    const [isLoadingClasses, setIsLoadingClasses] = useState(true);
    const [showClassPicker, setShowClassPicker] = useState(false);

    // Existing timetable state
    const [existingTimetableFound, setExistingTimetableFound] = useState(false);
    const [isLoadingExisting, setIsLoadingExisting] = useState(false);

    const [teachers, setTeachers] = useState<TeacherInfo[]>([
        { name: 'Mr. Adeoye', subjects: ['Mathematics'] },
        { name: 'Mrs. Akintola', subjects: ['English'] },
        { name: 'Dr. Bello', subjects: ['Basic Technology'] },
        { name: 'Ms. Sani', subjects: ['Basic Science'] },
    ]);
    const [subjectPeriods, setSubjectPeriods] = useState<SubjectPeriod[]>([
        { name: 'Mathematics', periods: 5 },
        { name: 'English', periods: 5 },
        { name: 'Basic Science', periods: 4 },
        { name: 'Basic Technology', periods: 4 },
        { name: 'Social Studies', periods: 3 },
    ]);
    const [customRules, setCustomRules] = useState("Fridays must end early, after the 6th period.\nNo double periods for any subject.");
    const [isGenerating, setIsGenerating] = useState(false);

    // Fetch classes from database
    useEffect(() => {
        const fetchClasses = async () => {
            setIsLoadingClasses(true);
            try {
                const { data, error } = await supabase
                    .from('classes')
                    .select('id, subject, grade, section, department')
                    .order('grade', { ascending: true })
                    .order('section', { ascending: true });

                if (error) {
                    console.error('Supabase error:', error);
                    throw error;
                }

                if (data) {
                    // Import the helper function
                    const { getGradeDisplayName } = await import('../../lib/schoolSystem');

                    const uniqueClassesMap = new Map();

                    data.forEach((cls: any) => {
                        const gradeName = getGradeDisplayName(cls.grade);
                        let displayName = `${gradeName} - Section ${cls.section}`;

                        // Add department for SSS classes
                        if (cls.department && cls.grade >= 10) {
                            displayName += ` (${cls.department})`;
                        }

                        // Use a composite key to ensure uniqueness
                        const key = `${cls.grade}-${cls.section}-${cls.department || ''}`;

                        if (!uniqueClassesMap.has(key)) {
                            uniqueClassesMap.set(key, {
                                id: cls.id,
                                name: displayName,
                                grade: cls.grade,
                                section: cls.section,
                            });
                        }
                    });

                    const formattedClasses = Array.from(uniqueClassesMap.values());
                    setClasses(formattedClasses);

                    // Set first class as default if available
                    if (formattedClasses.length > 0 && !className) {
                        setClassName(formattedClasses[0].name);
                    }
                }
            } catch (error) {
                console.error('Error fetching classes:', error);
                toast.error('Failed to load classes.');
            } finally {
                setIsLoadingClasses(false);
            }
        };

        fetchClasses();
    }, []);

    // Check for existing timetable when className changes
    // Check for existing timetable when className changes
    useEffect(() => {
        const checkExistence = () => {
            if (className) {
                checkTimetableExists(className).then(exists => {
                    setExistingTimetableFound(exists);
                });
            }
        };

        checkExistence();

        const channel = supabase.channel(`timetable_check_${className}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'timetable' }, (payload) => {
                // Ideally filter by payload.new.class_name or payload.old.class_name if possible,
                // but for now, just re-check if ANY timetable change happens.
                // Optimally we would inspect payload, but Supabase realtime payloads might be partial.
                checkExistence();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [className]);

    const handleLoadExisting = async () => {
        setIsLoadingExisting(true);
        try {
            const data = await fetchTimetableForClass(className);
            const dbTeachers = await fetchTeachers();

            // Reconstruct timetable map
            const timetableMap: { [key: string]: string } = {};
            const teacherAssignmentsMap: { [key: string]: string } = {};
            const subjectsSet = new Set<string>();

            // Helper to find teacher name
            const getTeacherName = (id: number) => {
                const t = dbTeachers.find(dt => dt.id === id);
                return t ? t.name : 'Unknown Teacher';
            };

            data.forEach((entry) => {
                // Map database format to UI format: "Monday-Period 1"
                // Assuming entry has day, start_time/end_time in periods format
                // We need to map time to Period Name or use logic
                // Simple mapping based on index or time for now, or just use stored values if we align schema.
                // Since we store strict starts, we can match.

                const PERIODS = [
                    { name: 'Period 1', start: '09:00' },
                    { name: 'Period 2', start: '09:45' },
                    { name: 'Period 3', start: '10:30' },
                    { name: 'Period 4', start: '11:30' },
                    { name: 'Period 5', start: '12:15' },
                    { name: 'Period 6', start: '13:45' },
                    { name: 'Period 7', start: '14:30' },
                    { name: 'Period 8', start: '15:15' },
                ];

                const period = PERIODS.find(p => p.start === entry.start_time);
                if (period) {
                    const key = `${entry.day}-${period.name}`;
                    timetableMap[key] = entry.subject;
                    subjectsSet.add(entry.subject);

                    if (entry.teacher_id) {
                        teacherAssignmentsMap[key] = getTeacherName(entry.teacher_id);
                    }
                }
            });

            const timetableData = {
                className,
                subjects: Array.from(subjectsSet),
                timetable: timetableMap,
                teacherAssignments: teacherAssignmentsMap,
                suggestions: [],
                teacherLoad: [],
                status: data.length > 0 ? data[0].status : 'Draft',
                teachers: dbTeachers.map(t => ({ name: t.name, subjects: t.subjects }))
            };

            // mockSavedTimetable.current = timetableData; // Removed mock dependency
            navigateTo('timetableEditor', 'Edit Timetable', { timetableData: timetableData });

        } catch (error) {
            console.error("Error loading existing timetable:", error);
            toast.error("Failed to load existing timetable.");
        } finally {
            setIsLoadingExisting(false);
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        // ... (existing generation logic) ...
        try {
            const ai = getAIClient(import.meta.env.VITE_GEMINI_API_KEY || '');
            const prompt = `
                You are an expert school administrator. Generate a balanced weekly timetable for:
                - Class: ${className}
                - Teachers & Subjects: ${JSON.stringify(teachers)}
                - Subject weekly period requirements: ${JSON.stringify(subjectPeriods)}
                - Rules: ${customRules}

                The periods are named 'Period 1' through 'Period 8'. Days are Monday to Friday.
                
                IMPORTANT: For 'timetable' and 'teacherAssignments', you MUST return an array of objects, not a direct map. Each object must have a 'slot' key (e.g., 'Monday-Period 1') and a corresponding 'subject' or 'teacher' key.
                
                Generate the timetable and associated data according to the provided JSON schema.
                Ensure all teacher assignments are filled and the teacher load is calculated correctly.
            `;

            const responseSchema = {
                type: Type.OBJECT,
                properties: {
                    className: { type: Type.STRING },
                    subjects: { type: Type.ARRAY, items: { type: Type.STRING } },
                    timetable: {
                        type: Type.ARRAY,
                        description: "List of all class periods and their assigned subjects.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                slot: { type: Type.STRING, description: "The time slot in 'Day-Period Name' format (e.g., 'Monday-Period 1')." },
                                subject: { type: Type.STRING, description: "The subject assigned to this slot." }
                            },
                            required: ["slot", "subject"]
                        }
                    },
                    teacherAssignments: {
                        type: Type.ARRAY,
                        description: "List of all class periods and their assigned teachers.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                slot: { type: Type.STRING, description: "The time slot in 'Day-Period Name' format." },
                                teacher: { type: Type.STRING, description: "The teacher assigned to this slot." }
                            },
                            required: ["slot", "teacher"]
                        }
                    },
                    suggestions: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "Provide suggestions for improving the timetable or pointing out any constraint violations."
                    },
                    teacherLoad: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                teacherName: { type: Type.STRING },
                                totalPeriods: { type: Type.INTEGER }
                            },
                            required: ["teacherName", "totalPeriods"]
                        }
                    }
                },
                required: ["className", "subjects", "timetable", "teacherAssignments", "suggestions", "teacherLoad"]
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: responseSchema
                }
            });

            let rawData;
            try {
                const text = response.text.trim();
                // Safety check: if AI returns a plain error message instead of JSON
                if (text.startsWith("Error") || text.startsWith("AI Error") || text.includes("I'm having trouble")) {
                    throw new Error(text);
                }

                // specific cleanup for potential markdown code blocks
                const jsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();
                rawData = JSON.parse(jsonText);
            } catch (parseError) {
                console.error("Failed to parse AI response:", response.text);
                throw new Error("The AI generated an invalid schedule format. Please try again.");
            }

            // Transform arrays to maps for the editor component
            const timetableMap = rawData.timetable.reduce((acc: { [key: string]: string }, item: { slot: string; subject: string }) => {
                acc[item.slot] = item.subject;
                return acc;
            }, {});

            const teacherAssignmentsMap = rawData.teacherAssignments.reduce((acc: { [key: string]: string }, item: { slot: string; teacher: string }) => {
                acc[item.slot] = item.teacher;
                return acc;
            }, {});

            const timetableData = {
                ...rawData,
                timetable: timetableMap,
                teacherAssignments: teacherAssignmentsMap,
                // Pass full teacher objects for reference
                teachers: teachers
            };

            // mockSavedTimetable.current = { ...timetableData, status: 'Draft' };
            navigateTo('timetableEditor', 'Edit Timetable', { timetableData: { ...timetableData, status: 'Draft' } });

        } catch (error: any) {
            console.error("Timetable generation error:", error);
            const errorMessage = error.message || "An unknown error occurred.";

            if (errorMessage.includes("API Key")) {
                toast.error("Configuration Error: API Key is missing.");
            } else {
                toast.error(errorMessage.length < 100 ? errorMessage : "AI generation failed. Please simplify constraints and try again.");
            }
        } finally {
            setIsGenerating(false);
        }
    };

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

    return (
        <div className="flex flex-col h-full bg-gray-50/50 relative">
            {isGenerating && <GeneratingScreen />}
            <main className="flex-grow p-4 md:p-8 space-y-8 overflow-y-auto pb-32">

                {/* Header Section */}
                <div className="flex items-center space-x-4 mb-4">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-2xl shadow-lg shadow-indigo-200">
                        <CalendarIcon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">AI Timetable Creator</h1>
                        <p className="text-gray-500">Intelligent scheduling optimized for your school.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* STEP 1: CLASS SELECTION */}
                    <div className="bg-white p-6 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)] transition-all duration-300 border border-gray-100/50">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-3">
                            <span className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm">1</span>
                            Target Class
                        </h3>


                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowClassPicker(!showClassPicker)}
                                className={`w-full p-4 text-left border rounded-2xl flex items-center justify-between group transition-all duration-200 ${showClassPicker
                                    ? 'border-indigo-500 ring-4 ring-indigo-500/10 bg-white shadow-md'
                                    : 'border-gray-200 bg-gray-50 hover:bg-white hover:border-gray-300'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <UserGroupIcon className={`w-5 h-5 ${className ? 'text-indigo-600' : 'text-gray-400'}`} />
                                    <span className={className ? 'text-gray-900 font-bold text-base' : 'text-gray-400 font-medium'}>
                                        {isLoadingClasses ? 'Loading classes...' : (className || 'Select a class')}
                                    </span>
                                </div>
                                <ChevronRightIcon className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${showClassPicker ? 'rotate-90 text-indigo-500' : 'group-hover:text-gray-600'}`} />
                            </button>

                            {/* Class Picker Dropdown */}
                            {showClassPicker && (
                                <div className="absolute z-20 mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl shadow-indigo-900/10 max-h-80 overflow-y-auto animate-slide-in-up origin-top p-2">
                                    {isLoadingClasses ? (
                                        <div className="p-8 text-center text-gray-500">
                                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent mx-auto mb-2"></div>
                                            <p className="text-xs font-medium">Loading...</p>
                                        </div>
                                    ) : classes.length === 0 ? (
                                        <div className="p-6 text-center text-gray-500">
                                            <p className="font-bold text-gray-800 text-sm">No classes found</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            {classes.map((cls) => (
                                                <button
                                                    key={cls.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setClassName(cls.name);
                                                        setShowClassPicker(false);
                                                    }}
                                                    className={`w-full px-4 py-3 text-left rounded-xl transition-all flex items-center justify-between group ${className === cls.name
                                                        ? 'bg-indigo-50 text-indigo-700'
                                                        : 'text-gray-700 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    <div>
                                                        <p className="font-bold text-sm tracking-tight">{cls.name}</p>
                                                        <p className="text-[10px] text-gray-400 font-medium uppercase mt-0.5 group-hover:text-gray-500 tracking-wide">Grade {cls.grade} • Section {cls.section}</p>
                                                    </div>
                                                    {className === cls.name && (
                                                        <CheckCircleIcon className="w-5 h-5 text-indigo-600" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Existing Timetable Alert */}
                        {existingTimetableFound && (
                            <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-slide-in-up">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white border border-indigo-100 flex items-center justify-center flex-shrink-0">
                                        <CalendarIcon className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-800 text-sm">Timetable Exists</h4>
                                        <p className="text-xs text-gray-500">A timetable is already saved for this class.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleLoadExisting}
                                    disabled={isLoadingExisting}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 whitespace-nowrap w-full sm:w-auto justify-center disabled:opacity-70"
                                >
                                    {isLoadingExisting ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <EditIcon className="w-4 h-4" />
                                    )}
                                    Edit Existing
                                </button>
                            </div>
                        )}
                    </div>

                    {/* STEP 4: CUSTOM RULES */}
                    <div className="bg-white p-6 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)] transition-all duration-300 border border-gray-100/50 flex flex-col">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-3">
                            <span className="bg-pink-100 text-pink-600 w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm">4</span>
                            Rules & Constraints
                        </h3>
                        <div className="flex-grow flex flex-col">
                            <p className="text-xs text-gray-400 mb-3 ml-1">Instruct the AI on specific school policies.</p>
                            <textarea
                                value={customRules}
                                onChange={e => setCustomRules(e.target.value)}
                                className="flex-grow w-full p-4 text-gray-700 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all placeholder:text-gray-400 resize-none text-sm leading-relaxed min-h-[140px]"
                                placeholder="e.g. No math after lunch..."
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* STEP 2: TEACHERS */}
                    <div className="bg-white p-6 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] transition-all duration-300 border border-gray-100/50 col-span-1 md:col-span-2">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-3">
                                <span className="bg-emerald-100 text-emerald-600 w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm">2</span>
                                Faculty & Subjects
                            </h3>
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">{teachers.length} Teachers</span>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {teachers.map((teacher, index) => (
                                <div key={index} className="p-4 bg-gray-50/50 border border-gray-200 rounded-2xl space-y-4 relative transition-all hover:bg-white hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-900/5 group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 flex-shrink-0 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm shadow-sm border border-emerald-200">
                                            {index + 1}
                                        </div>
                                        <input
                                            type="text"
                                            value={teacher.name}
                                            onChange={e => handleTeacherChange(index, 'name', e.target.value)}
                                            placeholder="Teacher Name"
                                            className="flex-1 p-2 bg-transparent text-gray-800 font-bold placeholder:text-gray-400 placeholder:font-normal focus:outline-none border-b-2 border-transparent focus:border-emerald-500 transition-all"
                                        />
                                        <button
                                            onClick={() => handleRemoveTeacher(index)}
                                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="pl-14">
                                        <TagInput
                                            tags={teacher.subjects}
                                            setTags={(newSubjects) => handleTeacherChange(index, 'subjects', newSubjects)}
                                            placeholder="Type subject..."
                                        />
                                    </div>
                                </div>
                            ))}

                            <button
                                onClick={handleAddTeacher}
                                className="p-6 border-2 border-dashed border-gray-200 rounded-2xl hover:bg-gray-50 hover:border-emerald-300 hover:text-emerald-600 transition-all flex flex-col items-center justify-center gap-2 text-gray-400 font-bold group min-h-[140px]"
                            >
                                <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-emerald-100 group-hover:text-emerald-600 flex items-center justify-center transition-colors">
                                    <PlusIcon className="w-5 h-5" />
                                </div>
                                <span>Add Teacher</span>
                            </button>
                        </div>
                    </div>

                    {/* STEP 3: SUBJECT LOAD */}
                    <div className="bg-white p-6 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] transition-all duration-300 border border-gray-100/50 col-span-1 md:col-span-2">
                        <div className="mb-6">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-3">
                                <span className="bg-orange-100 text-orange-600 w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm">3</span>
                                Subject Distribution
                            </h3>
                            <p className="text-xs text-gray-400 mt-1 ml-11">Sessions per week for each subject.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {subjectPeriods.map((subject, index) => (
                                <div key={index} className="flex items-center gap-2 p-2 pr-3 bg-gray-50 rounded-xl border border-gray-100 focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-400 transition-all hover:bg-white hover:shadow-sm group">
                                    <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 text-orange-400 flex flex-shrink-0 items-center justify-center font-bold text-xs">
                                        {index + 1}
                                    </div>
                                    <input
                                        type="text"
                                        value={subject.name}
                                        onChange={e => handleSubjectPeriodChange(index, 'name', e.target.value)}
                                        placeholder="Subject"
                                        className="flex-grow w-full bg-transparent font-semibold text-gray-700 outline-none text-sm placeholder:font-normal"
                                    />
                                    <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 px-2 py-1 shadow-sm">
                                        <ClockIcon className="w-3 h-3 text-gray-400" />
                                        <input
                                            type="number"
                                            min="1"
                                            value={subject.periods}
                                            onChange={e => handleSubjectPeriodChange(index, 'periods', parseInt(e.target.value, 10) || 1)}
                                            className="w-6 text-center font-bold text-gray-800 outline-none bg-transparent text-sm"
                                        />
                                    </div>
                                    <button onClick={() => handleRemoveSubjectPeriod(index)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><TrashIcon className="w-3.5 h-3.5" /></button>
                                </div>
                            ))}
                            <button
                                onClick={handleAddSubjectPeriod}
                                className="h-full min-h-[50px] border-2 border-dashed border-gray-200 text-gray-400 font-bold rounded-xl hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 transition-all flex items-center justify-center gap-2 text-sm"
                            >
                                <PlusIcon className="w-4 h-4" />
                                <span>Add Subject</span>
                            </button>
                        </div>
                    </div>
                </div>

            </main>

            <footer className="p-4 bg-white/80 backdrop-blur-xl border-t border-gray-200 sticky bottom-0 z-30">
                <div className="max-w-4xl mx-auto">
                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="w-full flex justify-center items-center space-x-3 py-4 px-6 font-bold text-lg text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-600 active:scale-[0.99] disabled:opacity-70 disabled:grayscale rounded-2xl shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all duration-300 border border-white/20"
                    >
                        <SparklesIcon className={`w-6 h-6 ${isGenerating ? 'animate-spin' : 'animate-pulse'}`} />
                        <span>{isGenerating ? 'Generating Magic...' : 'Generate Optimized Timetable'}</span>
                    </button>
                </div>
            </footer>
        </div>
    );
};

// Simple icon wrapper if needed for specific icons not in constants
const CheckCircleIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export default TimetableGeneratorScreen;
