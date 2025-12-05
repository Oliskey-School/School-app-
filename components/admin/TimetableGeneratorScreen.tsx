import React, { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { AIIcon, SparklesIcon, TrashIcon, PlusIcon, XCircleIcon } from '../../constants';
import { mockSavedTimetable } from '../../data';

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
        <div className="flex flex-wrap items-center gap-1.5 p-2 border border-gray-300 rounded-md bg-white">
            {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1.5 bg-sky-100 text-sky-800 text-xs font-semibold px-2 py-1 rounded">
                    {tag}
                    <button type="button" onClick={() => handleRemoveTag(tag)} className="text-sky-600 hover:text-sky-800">
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
                placeholder={placeholder}
                className="flex-grow bg-transparent p-1 text-sm focus:outline-none"
            />
        </div>
    );
};

// --- MAIN COMPONENT ---
const TimetableGeneratorScreen: React.FC<TimetableGeneratorScreenProps> = ({ navigateTo }) => {
    const [className, setClassName] = useState('Grade 9A');
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
                     <input id="className" type="text" value={className} onChange={e => setClassName(e.target.value)} required className="w-full p-2 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg"/>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                    <h3 className="text-lg font-bold text-gray-800">2. Teachers & Subjects</h3>
                    {teachers.map((teacher, index) => (
                        <div key={index} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                            <input type="text" value={teacher.name} onChange={e => handleTeacherChange(index, 'name', e.target.value)} placeholder="Teacher's Name" className="p-2 border rounded-md" />
                            <div className="flex-grow">
                                <TagInput tags={teacher.subjects} setTags={(newSubjects) => handleTeacherChange(index, 'subjects', newSubjects)} placeholder="Add subject & press Enter" />
                            </div>
                            <button onClick={() => handleRemoveTeacher(index)} className="p-2 text-gray-400 hover:text-red-500"><TrashIcon /></button>
                        </div>
                    ))}
                    <button onClick={handleAddTeacher} className="flex items-center justify-center w-full py-2 space-x-1 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"><PlusIcon className="w-4 h-4" /><span>Add Teacher</span></button>
                </div>

                 <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                    <h3 className="text-lg font-bold text-gray-800">3. Weekly Periods per Subject</h3>
                    {subjectPeriods.map((subject, index) => (
                         <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                            <input type="text" value={subject.name} onChange={e => handleSubjectPeriodChange(index, 'name', e.target.value)} placeholder="Subject Name" className="p-2 border rounded-md flex-grow" />
                            <input type="number" min="1" value={subject.periods} onChange={e => handleSubjectPeriodChange(index, 'periods', parseInt(e.target.value, 10) || 1)} className="p-2 border rounded-md w-20" />
                            <button onClick={() => handleRemoveSubjectPeriod(index)} className="p-2 text-gray-400 hover:text-red-500"><TrashIcon /></button>
                        </div>
                    ))}
                     <button onClick={handleAddSubjectPeriod} className="flex items-center justify-center w-full py-2 space-x-1 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"><PlusIcon className="w-4 h-4" /><span>Add Subject</span></button>
                 </div>

                 <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                    <h3 className="text-lg font-bold text-gray-800">4. Custom Rules & Constraints</h3>
                    <textarea value={customRules} onChange={e => setCustomRules(e.target.value)} rows={4} className="w-full p-2 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg" />
                 </div>

            </main>
            <footer className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-200 sticky bottom-0">
                <button 
                    type="button" 
                    onClick={handleGenerate} 
                    disabled={isGenerating}
                    className="w-full flex justify-center items-center space-x-2 py-3 px-4 font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg shadow-md">
                    <SparklesIcon className="h-5 h-5" /><span>Generate Timetable</span>
                </button>
            </footer>
        </div>
    );
};

export default TimetableGeneratorScreen;