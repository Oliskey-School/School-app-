import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { AIIcon, SparklesIcon, TrashIcon, PlusIcon, XCircleIcon, ChevronRightIcon } from '../../constants';
import { mockSavedTimetable } from '../../data';
import { supabase } from '../../lib/supabase';

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
    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-50">
        <SparklesIcon className="w-16 h-16 text-white animate-spin" />
        <p className="text-white font-semibold mt-4 text-lg">Generating Timetable...</p>
        <p className="text-white/80 mt-2 text-sm max-w-xs text-center">This may take a moment. The AI is arranging over 40 classes!</p>
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
        <div className="flex flex-wrap items-center gap-2 p-3 border border-gray-200 rounded-xl bg-white shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all min-h-[50px]">
            {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 bg-indigo-50 text-indigo-700 text-sm font-bold rounded-lg border border-indigo-100 group">
                    {tag}
                    <button type="button" onClick={() => handleRemoveTag(tag)} className="p-0.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-full transition-colors">
                        <XCircleIcon className="w-4 h-4" />
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
                className="flex-grow bg-transparent p-1 text-sm focus:outline-none min-w-[140px] placeholder:text-gray-400"
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

                if (error) throw error;

                if (data) {
                    const formattedClasses = data.map((cls: any) => ({
                        id: cls.id,
                        name: `Grade ${cls.grade}${cls.section}${cls.department ? ` (${cls.department})` : ''}`,
                        grade: cls.grade,
                        section: cls.section,
                    }));
                    setClasses(formattedClasses);

                    // Set first class as default if available
                    if (formattedClasses.length > 0 && !className) {
                        setClassName(formattedClasses[0].name);
                    }
                }
            } catch (error) {
                console.error('Error fetching classes:', error);
            } finally {
                setIsLoadingClasses(false);
            }
        };

        fetchClasses();
    }, []);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: responseSchema
                }
            });

            const rawData = JSON.parse(response.text.trim());

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
            };

            mockSavedTimetable.current = { ...timetableData, status: 'Draft', teachers };
            navigateTo('timetableEditor', 'Edit Timetable', { timetableData: mockSavedTimetable.current });

        } catch (error) {
            console.error("Timetable generation error:", error);
            alert("An error occurred. The AI might be busy or the request was too complex. Please simplify your rules or teacher constraints and try again.");
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
        <div className="flex flex-col h-full bg-gray-100 relative">
            {isGenerating && <GeneratingScreen />}
            <main className="flex-grow p-4 space-y-5 overflow-y-auto pb-24">
                <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                    <h3 className="text-lg font-bold text-gray-800">1. Class Details</h3>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowClassPicker(!showClassPicker)}
                            className="w-full p-3 text-left text-gray-700 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between"
                        >
                            <span className={className ? 'text-gray-800 font-medium' : 'text-gray-400'}>
                                {isLoadingClasses ? 'Loading classes...' : (className || 'Select a class')}
                            </span>
                            <ChevronRightIcon className={`w-5 h-5 text-gray-400 transition-transform ${showClassPicker ? 'rotate-90' : ''}`} />
                        </button>

                        {/* Class Picker Dropdown */}
                        {showClassPicker && (
                            <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                                {isLoadingClasses ? (
                                    <div className="p-4 text-center text-gray-500">
                                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent mx-auto mb-2"></div>
                                        Loading classes...
                                    </div>
                                ) : classes.length === 0 ? (
                                    <div className="p-4 text-center text-gray-500">
                                        <p className="font-medium">No classes found</p>
                                        <p className="text-sm mt-1">Please add classes in the system first.</p>
                                    </div>
                                ) : (
                                    <div className="py-2">
                                        {classes.map((cls) => (
                                            <button
                                                key={cls.id}
                                                type="button"
                                                onClick={() => {
                                                    setClassName(cls.name);
                                                    setShowClassPicker(false);
                                                }}
                                                className={`w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors flex items-center justify-between ${className === cls.name ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                                                    }`}
                                            >
                                                <div>
                                                    <p className="font-medium">{cls.name}</p>
                                                    <p className="text-xs text-gray-500">Grade {cls.grade} • Section {cls.section}</p>
                                                </div>
                                                {className === cls.name && (
                                                    <span className="text-indigo-600 font-bold">✓</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Show selected class info */}
                    {className && !showClassPicker && (
                        <p className="text-sm text-gray-500">
                            Timetable will be generated for <span className="font-semibold text-indigo-600">{className}</span>
                        </p>
                    )}
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <span className="bg-indigo-100 text-indigo-600 w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-sm">2</span>
                            Teachers & Subjects
                        </h3>
                        <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">{teachers.length} added</span>
                    </div>

                    <div className="space-y-4">
                        {teachers.map((teacher, index) => (
                            <div key={index} className="p-4 bg-gray-50/50 border border-gray-200 rounded-2xl space-y-3 relative transition-colors hover:bg-white hover:border-indigo-200 hover:shadow-sm group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 shadow-sm font-bold text-xs group-hover:border-indigo-100 group-hover:text-indigo-500 transition-colors">
                                        {index + 1}
                                    </div>
                                    <input
                                        type="text"
                                        value={teacher.name}
                                        onChange={e => handleTeacherChange(index, 'name', e.target.value)}
                                        placeholder="Teacher's Name (e.g. Mr. Smith)"
                                        className="flex-1 p-2 bg-transparent text-gray-800 font-bold placeholder:text-gray-400 placeholder:font-normal focus:outline-none border-b border-gray-200 focus:border-indigo-500 transition-all"
                                    />
                                    <button
                                        onClick={() => handleRemoveTeacher(index)}
                                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        title="Remove Teacher"
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="pl-[3.25rem]">
                                    <TagInput
                                        tags={teacher.subjects}
                                        setTags={(newSubjects) => handleTeacherChange(index, 'subjects', newSubjects)}
                                        placeholder="Add subjects..."
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleAddTeacher}
                        className="mt-4 w-full py-3.5 border-2 border-dashed border-gray-200 text-gray-500 font-bold rounded-xl hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                    >
                        <PlusIcon className="w-5 h-5" />
                        <span>Add Another Teacher</span>
                    </button>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="bg-indigo-100 text-indigo-600 w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-sm">3</span>
                        Subject Load
                    </h3>
                    <div className="space-y-3">
                        {subjectPeriods.map((subject, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-300 transition-all">
                                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs ring-2 ring-white">
                                    {subject.periods}
                                </div>
                                <input
                                    type="text"
                                    value={subject.name}
                                    onChange={e => handleSubjectPeriodChange(index, 'name', e.target.value)}
                                    placeholder="Subject Name"
                                    className="flex-grow bg-transparent font-medium text-gray-700 outline-none placeholder:text-gray-400 placeholder:font-normal"
                                />
                                <div className="flex items-center gap-1.5 bg-white rounded-lg border border-gray-200 px-2 py-1 shadow-sm">
                                    <span className="text-[10px] uppercase font-bold text-gray-400">Prds</span>
                                    <input
                                        type="number"
                                        min="1"
                                        value={subject.periods}
                                        onChange={e => handleSubjectPeriodChange(index, 'periods', parseInt(e.target.value, 10) || 1)}
                                        className="w-8 text-center font-bold text-gray-800 outline-none"
                                    />
                                </div>
                                <button onClick={() => handleRemoveSubjectPeriod(index)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><TrashIcon className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={handleAddSubjectPeriod}
                        className="mt-4 w-full py-3.5 border-2 border-dashed border-gray-200 text-gray-500 font-bold rounded-xl hover:bg-gray-50 hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                    >
                        <PlusIcon className="w-5 h-5" />
                        <span>Add Subject</span>
                    </button>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-3">
                        <span className="bg-indigo-100 text-indigo-600 w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-sm">4</span>
                        Custom Rules
                    </h3>
                    <textarea
                        value={customRules}
                        onChange={e => setCustomRules(e.target.value)}
                        rows={4}
                        className="w-full p-4 text-gray-700 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400 resize-none text-sm leading-relaxed"
                        placeholder="e.g. No math after lunch..."
                    />
                </div>

            </main>
            <footer className="p-4 bg-white/90 backdrop-blur-md border-t border-gray-200 sticky bottom-0 z-30">
                <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full flex justify-center items-center space-x-2 py-4 px-4 font-bold text-lg text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 active:scale-[0.98] disabled:from-indigo-400 disabled:to-indigo-400 rounded-2xl shadow-lg shadow-indigo-200 transition-all disabled:shadow-none">
                    <SparklesIcon className="w-6 h-6 animate-pulse" /><span>Generate Timetable</span>
                </button>
            </footer>
        </div>
    );
};

export default TimetableGeneratorScreen;