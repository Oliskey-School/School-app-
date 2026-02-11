
import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import {
    CalendarIcon,
    SparklesIcon,
    PlusIcon,
    EditIcon
} from '../../constants';

// --- TYPES ---
interface TimetableStatus {
    class_name: string;
    status: 'Draft' | 'Published' | null;
    last_updated?: string;
}

interface TimetableData {
    day: string;
    start_time: string;
    end_time: string;
    subject: string;
    teacher_id?: number;
    room?: string;
}

interface TimetableGeneratorScreenProps {
    schoolId: string;
    navigateTo: (screen: string, title?: string, data?: any) => void;
    initialSelectedClasses?: string[];
}

// --- SUBCOMPONENTS ---
const GeneratingScreen = () => (
    <div className="flex flex-col items-center justify-center p-12 space-y-6 bg-white rounded-2xl shadow-xl max-w-lg mx-auto border border-indigo-100">
        <div className="relative">
            <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20"></div>
            <div className="relative p-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full shadow-lg">
                <SparklesIcon className="w-12 h-12 text-white animate-pulse" />
            </div>
        </div>
        <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold text-gray-900">Generating Schedules</h3>
            <p className="text-gray-500">Our AI is analyzing constraints and optimizing the timetable...</p>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div className="bg-indigo-600 h-2 rounded-full animate-progress"></div>
        </div>
    </div>
);

const TagInput = ({ label, tags, onAdd, onRemove, placeholder }: any) => {
    const [input, setInput] = useState('');
    return (
        <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                {tags.map((tag: string) => (
                    <span key={tag} className="inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-medium bg-white text-indigo-700 shadow-sm border border-indigo-100 group">
                        {tag}
                        <button onClick={() => onRemove(tag)} className="ml-1.5 text-indigo-400 hover:text-indigo-600 focus:outline-none">×</button>
                    </span>
                ))}
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && input.trim()) {
                            e.preventDefault();
                            onAdd(input.trim());
                            setInput('');
                        }
                    }}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm min-w-[120px]"
                    placeholder={placeholder}
                />
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const TimetableGeneratorScreen: React.FC<TimetableGeneratorScreenProps> = ({ schoolId, navigateTo, initialSelectedClasses = [] }) => {
    // Dashboard State
    const [classes, setClasses] = useState<any[]>([]);
    const [timetableStatuses, setTimetableStatuses] = useState<{ [key: string]: string | null }>({});

    // Loading States
    const [isLoadingClasses, setIsLoadingClasses] = useState(true);
    const [isLoadingStatuses, setIsLoadingStatuses] = useState(true);
    const [isLoadingExisting, setIsLoadingExisting] = useState(false);

    // --- FETCH DATA ---
    const fetchClasses = async (id: string) => {
        const { data, error } = await supabase.from('classes').select('*').eq('school_id', id).order('grade').order('name');
        if (error) { toast.error("Failed to load classes"); return []; }
        return data || [];
    };

    const fetchTeachers = async (id: string) => {
        const { data, error } = await supabase.from('teachers').select('*').eq('school_id', id);
        if (error) { toast.error("Failed to load teachers"); return []; }
        return data || [];
    };

    const fetchTimetableStatuses = async () => {
        setIsLoadingStatuses(true);
        try {
            const { data, error } = await supabase
                .from('timetable')
                .select('class_id, status, classes(name)')
                .eq('school_id', schoolId);

            if (error) throw error;

            const statusMap: { [key: string]: string | null } = {};
            // Group by class and determine overall status
            data?.forEach((row: any) => {
                // Handle potential array return for joined relation
                const className = Array.isArray(row.classes) ? row.classes[0]?.name : row.classes?.name;

                if (className) {
                    const current = statusMap[className];
                    // If any entry is Published, it's Published.
                    if (current !== 'Published') {
                        statusMap[className] = row.status || 'Draft';
                    }
                }
            });
            setTimetableStatuses(statusMap);

        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingStatuses(false);
        }
    };

    const fetchTimetableForClass = async (className: string, id: string) => {
        // Get class ID first
        const { data: cls } = await supabase.from('classes').select('id').eq('name', className).eq('school_id', id).single();
        if (!cls) throw new Error("Class not found");

        const { data, error } = await supabase.from('timetable').select('*').eq('class_id', cls.id);
        if (error) throw error;
        return data || [];
    };

    useEffect(() => {
        if (!schoolId) return;

        const init = async () => {
            try {
                const cls = await fetchClasses(schoolId);
                setClasses(cls);
                setIsLoadingClasses(false);
                await fetchTimetableStatuses();
            } catch (e) {
                console.error(e);
            }
        };

        init();

        // Subscribe to timetable changes
        const channel = supabase.channel('dashboard_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'timetable' }, () => {
                fetchTimetableStatuses();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };

    }, [schoolId]);



    // --- HELPERS ---
    const loadTimetable = async (targetClassName: string) => {
        if (!schoolId) return;
        setIsLoadingExisting(true);
        try {
            const data = await fetchTimetableForClass(targetClassName, schoolId);
            const dbTeachers = await fetchTeachers(schoolId); // Fetch fresh teachers list

            // Reconstruct timetable map
            const timetableMap: { [key: string]: string } = {};
            const teacherAssignmentsMap: { [key: string]: string } = {};
            const subjectsSet = new Set<string>();

            // Helper to find teacher name
            const getTeacherName = (id: string | number) => {
                const t = dbTeachers.find(dt => dt.id === id);
                return t ? t.name : 'Unknown Teacher';
            };

            data.forEach((entry) => {
                // Map database format to UI format: "Monday-Period 1"
                // Assuming simple mapping for now as per previous logic
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
                className: targetClassName,
                subjects: Array.from(subjectsSet),
                timetable: timetableMap,
                teacherAssignments: teacherAssignmentsMap,
                suggestions: [],
                teacherLoad: [],
                status: data.length > 0 ? data[0].status : 'Draft',
                teachers: dbTeachers.map(t => ({ name: t.name, subjects: t.subjects || [] }))
            };

            navigateTo('timetableEditor', 'Edit Timetable', { timetableData: timetableData });

        } catch (error) {
            console.error("Error loading existing timetable:", error);
            toast.error("Failed to load existing timetable.");
        } finally {
            setIsLoadingExisting(false);
        }
    };

    const handleOpenWizard = (targetClass?: string) => {
        navigateTo('aiTimetableCreator', 'AI Timetable Creator', {
            availableClasses: classes,
            initialSelectedClasses: targetClass ? [targetClass] : [],
        });
    };

    return (
        <div className="flex flex-col h-full bg-gray-50/50 relative">
            <main className="flex-grow p-4 md:p-8 space-y-8 overflow-y-auto">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center space-x-4">
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-2xl shadow-lg shadow-indigo-200">
                            <CalendarIcon className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Timetable Dashboard</h1>
                            <p className="text-gray-500">Manage and create schedules for your school.</p>
                        </div>
                    </div>

                    <button
                        onClick={() => handleOpenWizard()}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-200 transition-all flex items-center gap-2"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Create Global Timetable
                    </button>
                </div>

                {/* DASHBOARD GRID */}
                <div className="bg-white p-6 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-gray-100/50">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                            <CalendarIcon className="w-6 h-6 text-indigo-600" />
                            All Classes
                        </h2>
                        <div className="flex items-center gap-4 text-xs font-semibold">
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Published</div>
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Draft</div>
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-gray-300"></div> No Timetable</div>
                        </div>
                    </div>

                    {isLoadingClasses || isLoadingStatuses ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                <div key={i} className="h-40 bg-gray-50 rounded-2xl animate-pulse"></div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {classes.map(cls => {
                                const status = timetableStatuses[cls.name];
                                return (
                                    <div
                                        key={cls.id}
                                        className={`p-5 rounded-2xl border transition-all duration-300 group flex flex-col justify-between h-full min-h-[160px] ${status
                                            ? 'border-indigo-100 bg-white shadow-sm hover:shadow-md'
                                            : 'border-gray-100 bg-gray-50 hover:bg-white hover:border-indigo-100 hover:shadow-sm'
                                            }`}
                                    >
                                        <div>
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="bg-indigo-50 text-indigo-700 font-bold text-xs px-2 py-1 rounded-lg uppercase tracking-wider">
                                                    Grade {cls.grade}
                                                </div>
                                                <div className={`w-3 h-3 rounded-full ${status === 'Published' ? 'bg-emerald-500' : status === 'Draft' ? 'bg-orange-500' : 'bg-gray-300'}`} />
                                            </div>
                                            <h4 className="font-bold text-gray-900 text-lg tracking-tight mb-1">{cls.name}</h4>
                                            <p className="text-xs text-gray-500 font-medium uppercase">Section {cls.section}</p>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                                            {status ? (
                                                <div className="flex gap-2 w-full">
                                                    <button
                                                        onClick={() => loadTimetable(cls.name)}
                                                        className="flex-1 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        <EditIcon className="w-4 h-4" />
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (window.confirm(`Delete timetable for ${cls.name}?`)) {
                                                                const deleteTimetable = async () => {
                                                                    const { error } = await supabase.from('timetable').delete().eq('class_id', cls.id);
                                                                    if (error) toast.error("Failed to delete");
                                                                    else {
                                                                        toast.success("Deleted");
                                                                        fetchTimetableStatuses();
                                                                    }
                                                                };
                                                                deleteTimetable();
                                                            }
                                                        }}
                                                        className="px-3 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors"
                                                        title="Delete Timetable"
                                                    >
                                                        <span className="sr-only">Delete</span>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M4 7l16 0" /><path d="M10 11l0 6" /><path d="M14 11l0 6" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" /><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" /></svg>
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => navigateTo('timetableCreator', 'Create Timetable', { initialClasses: [cls] })}
                                                    className="w-full py-2.5 bg-white border border-gray-200 hover:border-indigo-200 hover:text-indigo-600 text-gray-600 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                                                >
                                                    <SparklesIcon className="w-4 h-4" />
                                                    Create New
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            {isLoadingExisting && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
                </div>
            )}
        </div>
    );
};

export default TimetableGeneratorScreen;

// Simple icon wrapper if needed for specific icons not in constants

