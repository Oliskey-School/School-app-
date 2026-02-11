import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { XCircleIcon, SparklesIcon, BriefcaseIcon, CheckCircleIcon, PlusIcon, EditIcon, CalendarIcon, SaveIcon, CloudUploadIcon, RefreshIcon, ChevronLeftIcon } from '../../constants';
import { SUBJECT_COLORS } from '../../constants';
import { TimetableEntry } from '../../types';
import { supabase } from '../../lib/supabase';
import { notifyClass } from '../../lib/database';

// --- TYPES ---
type Timetable = { [key: string]: string | null };
type TeacherAssignments = { [key: string]: string | null };
type TeacherLoad = { teacherName: string; totalPeriods: number };
interface TeacherInfo { name: string; subjects: string[]; }

interface TimetableEditorProps {
    timetableData: any; // The whole object from the generator/save
    navigateTo: (view: string, title: string, props?: any) => void;
    handleBack: () => void;
}


// --- CONSTANTS & HELPERS ---
const formatTime12Hour = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; // the hour '0' should be '12'
    return `${h}:${minutes} ${ampm}`;
};

const PERIODS = [
    { name: 'Period 1', start: '09:00', end: '09:45' },
    { name: 'Period 2', start: '09:45', end: '10:30' },
    { name: 'Period 3', start: '10:30', end: '11:15' },
    { name: 'Short Break', start: '11:15', end: '11:30', isBreak: true },
    { name: 'Period 4', start: '11:30', end: '12:15' },
    { name: 'Period 5', start: '12:15', end: '13:00' },
    { name: 'Long Break', start: '13:00', end: '13:45', isBreak: true },
    { name: 'Period 6', start: '13:45', end: '14:30' },
    { name: 'Period 7', start: '14:30', end: '15:15' },
    { name: 'Period 8', start: '15:15', end: '16:00' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// --- SUB-COMPONENTS ---

const Toast: React.FC<{ message: string; onClear: () => void; }> = ({ message, onClear }) => {
    useEffect(() => {
        const timer = setTimeout(onClear, 3000);
        return () => clearTimeout(timer);
    }, [onClear]);

    return (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-900/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 animate-slide-in-up z-[100] border border-white/10">
            <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
            <span className="font-medium">{message}</span>
        </div>
    );
};

const DraggableSubject: React.FC<{ subjectName: string; onClick?: () => void }> = ({ subjectName, onClick }) => {
    const [isDragging, setIsDragging] = useState(false);
    const colorClass = SUBJECT_COLORS[subjectName] || 'bg-gray-100 text-gray-700';

    return (
        <div
            draggable
            onClick={onClick}
            onDragStart={(e) => {
                e.dataTransfer.setData('subjectName', subjectName);
                setIsDragging(true);
            }}
            onDragEnd={() => setIsDragging(false)}
            className={`p-3 rounded-xl cursor-grab text-sm font-bold text-center shadow-sm hover:shadow-md transition-all active:cursor-grabbing border-b-2 border-black/5
                ${colorClass} 
                ${isDragging ? 'opacity-50 scale-95 ring-2 ring-offset-2 ring-indigo-400' : 'hover:-translate-y-0.5'}
            `}
        >
            {subjectName}
        </div>
    );
};

const TimetableCell: React.FC<{ subject: string | null; teacher: string | null; onDrop: (e: React.DragEvent<HTMLDivElement>) => void; onClear: () => void; onClick?: () => void; isBreak?: boolean }> = ({ subject, teacher, onDrop, onClear, onClick, isBreak }) => {
    const [isHovering, setIsHovering] = useState(false);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (isBreak) {
            e.dataTransfer.dropEffect = "none";
        } else {
            e.dataTransfer.dropEffect = "move";
            e.currentTarget.classList.add('bg-indigo-50', 'ring-2', 'ring-indigo-400', 'ring-inset');
        }
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.currentTarget.classList.remove('bg-indigo-50', 'ring-2', 'ring-indigo-400', 'ring-inset');
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.currentTarget.classList.remove('bg-indigo-50', 'ring-2', 'ring-indigo-400', 'ring-inset');
        if (!isBreak) onDrop(e);
    };

    if (isBreak) {
        return (
            <div className="h-full bg-gray-100/50 border border-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest transform -rotate-0">Break</span>
            </div>
        );
    }

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={onClick}
            className={`h-full min-h-[80px] rounded-xl border transition-all duration-200 relative group
                ${subject
                    ? `${SUBJECT_COLORS[subject] || 'bg-white'} border-transparent shadow-sm hover:shadow-md`
                    : 'bg-white border-dashed border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30'
                }
            `}
        >
            {subject ? (
                <div className="h-full px-2 py-1.5 flex flex-col justify-center text-center">
                    <span className="text-[13px] font-bold text-gray-800 leading-tight line-clamp-2">
                        {subject}
                    </span>
                    {teacher && (
                        <div className="flex items-center justify-center mt-1 space-x-1">
                            <BriefcaseIcon className="w-3 h-3 text-gray-500/70" />
                            <span className="text-[10px] text-gray-600 font-medium truncate max-w-full">
                                {teacher}
                            </span>
                        </div>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); onClear(); }}
                        className="absolute -top-1.5 -right-1.5 p-0.5 bg-white rounded-full shadow-sm text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 hover:bg-red-50"
                    >
                        <XCircleIcon className="w-4 h-4" />
                    </button>
                    {/* Hover Tooltip (Simulated) */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 rounded-xl transition-colors pointer-events-none" />
                </div>
            ) : (
                <div className="flex items-center justify-center h-full text-indigo-200/50 group-hover:text-indigo-400 transition-colors">
                    <PlusIcon className="w-6 h-6" />
                </div>
            )}
        </div>
    );
};



// --- MOBILE EDITING SUB-COMPONENTS ---

const MobileSubjectPicker: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSelect: (subject: string) => void;
    subjects: string[]
}> = ({ isOpen, onClose, onSelect, subjects }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col animate-slide-in-up shadow-2xl">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-3xl">
                    <div>
                        <h3 className="font-bold text-xl text-gray-900">Assign Subject</h3>
                        <p className="text-xs text-gray-500 font-medium">Choose a subject for this slot</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-200/50 rounded-full hover:bg-gray-200 transition-colors">
                        <XCircleIcon className="w-6 h-6 text-gray-500" />
                    </button>
                </div>
                <div className="p-5 overflow-y-auto grid grid-cols-2 gap-3 pb-safe">
                    {subjects.map(subject => (
                        <button
                            key={subject}
                            onClick={() => onSelect(subject)}
                            className={`p-4 rounded-2xl font-bold text-sm text-left shadow-sm border border-black/5 hover:scale-[1.02] transition-transform active:scale-95 ${SUBJECT_COLORS[subject] || 'bg-gray-100 text-gray-800'}`}
                        >
                            {subject}
                        </button>
                    ))}
                    <button
                        onClick={() => onSelect('')}
                        className="p-4 rounded-2xl font-bold text-sm text-center border-2 border-dashed border-red-200 text-red-500 bg-red-50 hover:bg-red-100 active:scale-95 transition-all col-span-2"
                    >
                        Clear This Slot
                    </button>
                </div>
            </div>
        </div>
    );
}

const MobileDayEditor: React.FC<{
    day: string;
    periods: typeof PERIODS;
    timetable: Timetable;
    onEditSlot: (period: string) => void;
}> = ({ day, periods, timetable, onEditSlot }) => {
    return (
        <div className="space-y-4 pb-24">
            {periods.map((period, idx) => {
                if (period.isBreak) return (
                    <div key={idx} className="flex items-center justify-center py-4 bg-gray-50/50 rounded-2xl border border-gray-100 border-dashed">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">{period.name}</span>
                    </div>
                );

                const key = `${day}-${idx}`;
                const subject = timetable[key];
                const colorClass = subject ? SUBJECT_COLORS[subject] : 'bg-white border border-gray-200';

                return (
                    <button
                        key={idx}
                        onClick={() => onEditSlot(period.name)}
                        className={`w-full text-left p-0 rounded-2xl shadow-sm overflow-hidden flex transition-all active:scale-[0.98] ${!subject ? 'bg-white border border-gray-200' : 'shadow-md ring-1 ring-black/5'}`}
                    >
                        {/* Time Column */}
                        <div className="w-20 bg-gray-50 border-r border-gray-100 p-4 flex flex-col justify-center items-center text-center">
                            <span className="font-bold text-gray-700 text-sm leading-none">{period.name.split(' ')[1] || period.name}</span>
                            <span className="text-[10px] font-medium text-gray-400 mt-1 leading-tight">{formatTime12Hour(period.start)}<br />{formatTime12Hour(period.end)}</span>
                        </div>

                        {/* Content Column */}
                        <div className={`flex-1 p-4 flex items-center justify-between ${subject ? colorClass : ''}`}>
                            <div>
                                <h4 className={`font-bold text-base ${!subject ? 'text-gray-400 italic' : ''}`}>{subject || 'Free Period'}</h4>
                                {subject && <span className="text-xs opacity-75 mt-0.5 block font-medium">Assigned</span>}
                            </div>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${subject ? 'bg-black/10' : 'bg-gray-100'}`}>
                                <EditIcon className={`w-4 h-4 ${subject ? 'opacity-70' : 'text-gray-400'}`} />
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
};

const AISummary: React.FC<{ suggestions: string[]; teacherLoad: TeacherLoad[] }> = ({ suggestions, teacherLoad }) => {
    if (suggestions.length === 0 && teacherLoad.length === 0) return null;

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-indigo-600" />
                AI Insights
            </h3>

            {teacherLoad.length > 0 && (
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <h4 className="font-bold text-xs text-gray-400 uppercase tracking-wider mb-4 flex items-center"><BriefcaseIcon className="w-4 h-4 mr-2" />Faculty Workload</h4>
                    <ul className="space-y-3">
                        {teacherLoad.map(load => (
                            <li key={load.teacherName} className="flex justify-between items-center text-sm">
                                <span className="text-gray-700 font-medium">{load.teacherName}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${load.totalPeriods > 20 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                    {load.totalPeriods} hrs
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {suggestions.length > 0 && (
                <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                    <h4 className="font-bold text-xs text-indigo-400 uppercase tracking-wider mb-3">Suggestions</h4>
                    <div className="prose prose-sm max-w-none prose-p:text-indigo-900/80 prose-li:text-indigo-900/80 prose-li:marker:text-indigo-400">
                        <ReactMarkdown>{suggestions.map(s => `- ${s}`).join('\n')}</ReactMarkdown>
                    </div>
                </div>
            )}
        </div>
    );
};


// --- MAIN COMPONENT ---
const TimetableEditor: React.FC<TimetableEditorProps> = ({ timetableData, navigateTo, handleBack }) => {
    // --- STATE ---
    // Unified state for multi-class support
    const [schedules, setSchedules] = useState<any[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);

    // Derived state for current view
    const currentSchedule = schedules[activeIndex] || {};
    const timetable = currentSchedule.timetable || {};
    const teacherAssignments = currentSchedule.teacherAssignments || {};
    const selectedClass = currentSchedule.className || '';
    const status = currentSchedule.status || 'Draft';

    const [teachers, setTeachers] = useState<string[]>(['Mr. Anderson', 'Ms. Davis', 'Mrs. Wilson', 'Mr. Brown', 'Dr. Clark']);
    const [toastMessage, setToastMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    // AI Generation prompt state
    const [aiPrompt, setAiPrompt] = useState('');
    const [showAiModal, setShowAiModal] = useState(false);

    // Mobile State
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [selectedDay, setSelectedDay] = useState(DAYS[(new Date().getDay() - 1)] || 'Monday');
    const [editingSlot, setEditingSlot] = useState<{ day: string, period: string } | null>(null);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        // Initialize state from props
        if (timetableData) {
            if (timetableData.schedules) {
                // Multi-class mode
                setSchedules(timetableData.schedules.map((s: any) => ({
                    ...s,
                    status: s.status || 'Draft'
                })));
            } else {
                // Single-class legacy mode
                setSchedules([{
                    className: timetableData.className || '',
                    timetable: timetableData.schedule || {},
                    teacherAssignments: timetableData.teacherAssignments || {},
                    status: timetableData.status || 'Draft',
                    issues: timetableData.suggestions || []
                }]);
            }
        }
    }, [timetableData]);

    const [userSchoolId, setUserSchoolId] = useState<string | null>(null);

    // Fetch teachers and user school_id
    useEffect(() => {
        const fetchContext = async () => {
            // Get user's school_id
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('school_id')
                    .eq('id', user.id)
                    .single();
                if (profile) setUserSchoolId(profile.school_id);
            }

            // Get teachers
            const { data } = await supabase
                .from('teachers')
                .select('id, name, employment_type, available_days, subject_specialization, school_id');
            if (data) {
                setTeachers(data.map(t => t.name));
                (window as any).__teacherData = data;
            }
        };
        fetchContext();
    }, []);

    // ... (rest of code)

    // In saveIndividualTimetable:
    // ...




    const handleDrop = (day: string, periodIndex: number, e: React.DragEvent<HTMLDivElement>) => {
        const subjectName = e.dataTransfer.getData('subjectName');
        if (subjectName) {
            updateTimetable(day, periodIndex, subjectName);
        }
    };

    // Updated to accept number index
    // Updated to update the specific schedule in the array
    const updateTimetable = async (day: string, periodIndex: number, subjectName: string) => {
        const key = `${day}-${periodIndex}`;

        // Create deep copy of schedules to mutate
        const newSchedules = [...schedules];
        const currentSched = { ...newSchedules[activeIndex] };
        const newTimetable = { ...currentSched.timetable };
        const newAssignments = { ...currentSched.teacherAssignments };

        if (!subjectName) {
            delete newTimetable[key];
            delete newAssignments[key];
        } else {
            newTimetable[key] = subjectName;

            // Auto-assign teacher if needed
            if (!newAssignments[key]) {
                newAssignments[key] = teachers[Math.floor(Math.random() * teachers.length)];
            }

            // Real-time conflict check (optimized)
            const assignedTeacherName = newAssignments[key];
            const teacher = (window as any).__teacherData?.find((t: any) => t.name === assignedTeacherName);

            if (teacher) {
                // We should also check client-side against OTHER schedules being edited
                const clientConflict = schedules.some((s, idx) =>
                    idx !== activeIndex &&
                    s.teacherAssignments?.[key] === assignedTeacherName
                );

                if (clientConflict) {
                    setToastMessage(`⚠️ Multi-Class Conflict: ${assignedTeacherName} is assigned in another class at this time!`);
                } else {
                    // DB check
                    const { data: conflictData } = await supabase.rpc('check_teacher_conflict', {
                        p_teacher_id: teacher.id,
                        p_day: day,
                        p_start_time: PERIODS[periodIndex].start,
                        p_end_time: PERIODS[periodIndex].end,
                        p_exclude_class_name: selectedClass
                    });

                    if (conflictData?.conflict) {
                        setToastMessage(`⚠️ DB Conflict: ${assignedTeacherName} is busy in ${conflictData.class_name}`);
                    }
                }
            }
        }

        currentSched.timetable = newTimetable;
        currentSched.teacherAssignments = newAssignments;
        newSchedules[activeIndex] = currentSched;
        setSchedules(newSchedules);
    };

    const clearCell = (day: string, periodIndex: number) => {
        updateTimetable(day, periodIndex, '');
    };

    const saveTimetable = async () => {
        setIsSaving(true);
        try {
            // Bulk save all schedules
            // Using Promise.allSettled to attempt saving all
            const results = await Promise.allSettled(schedules.map(async (sched) => {
                return saveIndividualTimetable(sched, sched.status || 'Draft');
            }));

            const failures = results.filter(r => r.status === 'rejected');
            if (failures.length > 0) {
                throw new Error(`${failures.length} schedules failed to save. Check conflicts.`);
            }

            setToastMessage('All timetables saved successfully!');
        } catch (error: any) {
            console.error('Error saving timetable:', error);
            setToastMessage('Save Failed: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const [showPublishModal, setShowPublishModal] = useState(false);

    const handlePublishClick = () => {
        setShowPublishModal(true);
    };

    const confirmPublish = async () => {
        setShowPublishModal(false);
        setIsSaving(true);
        try {
            const results = await Promise.all(schedules.map(async (sched) => {
                return saveIndividualTimetable(sched, 'Published');
            }));

            setToastMessage('All timetables Published!');
            // Notify for each
            schedules.forEach(s => {
                notifyClass(s.className, 'Timetable Published', `Timetable for ${s.className} is now live.`).catch(console.error);
            });

        } catch (err: any) {
            setToastMessage("Error: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const saveIndividualTimetable = async (sched: any, statusToSave: 'Draft' | 'Published') => {
        const entries = [];
        const { className, timetable: schedTimetable, teacherAssignments: schedAssignments } = sched;

        if (!className) throw new Error("Class name missing");

        // 1. Prepare entries and validate conflicts first
        for (const day of DAYS) {
            for (let i = 0; i < PERIODS.length; i++) {
                if (PERIODS[i].isBreak) continue;
                const key = `${day}-${i}`;
                const subject = schedTimetable[key];
                const teacherName = schedAssignments[key];

                if (subject) {
                    let teacherId = null;
                    let schoolId = userSchoolId; // Default to user's school_id

                    if (teacherName) {
                        const teacher = (window as any).__teacherData?.find((t: any) => t.name === teacherName);
                        if (teacher) {
                            teacherId = teacher.id;
                            schoolId = teacher.school_id || userSchoolId;

                            // BACKEND CHECK
                            const { data: conflictData, error: conflictErr } = await supabase.rpc('check_teacher_conflict', {
                                p_teacher_id: teacher.id,
                                p_day: day,
                                p_start_time: PERIODS[i].start,
                                p_end_time: PERIODS[i].end,
                                p_exclude_class_name: className
                            });

                            if (conflictErr) console.error('Error checking conflict:', conflictErr);
                            else if (conflictData?.conflict) {
                                if (statusToSave === 'Published') throw new Error(`Conflict for ${className}: ${conflictData.message}`);
                            }
                        }
                    }

                    // For now, if no teacher found, we still save the subject slot? 
                    // Or require teacher? The UI allows just subject.

                    entries.push({
                        day: day,
                        period_index: i,
                        start_time: PERIODS[i].start,
                        end_time: PERIODS[i].end,
                        subject,
                        class_name: className,
                        teacher_id: teacherId,
                        status: statusToSave,
                        school_id: schoolId // Ensure this is handled if null (RLS might handle it or default)
                    });
                }
            }
        }

        // Database interaction (Batch insert via RPC or basic upsert loop)
        // Corrected table name from 'timetable_entries' to 'timetable'

        const { error: deleteError } = await supabase
            .from('timetable')
            .delete()
            .eq('class_name', className); // Delete ALL for this class (dangerous? should filter by term?)

        if (deleteError) throw deleteError;

        if (entries.length > 0) {
            const { error: insertError } = await supabase.from('timetable').insert(entries);
            if (insertError) throw insertError;
        }

        return true;
    };



    const handleAiGenerate = async () => {
        if (!teachers.length || Object.keys(SUBJECT_COLORS).length === 0) {
            setToastMessage("Please ensure teachers and subjects are loaded.");
            return;
        }

        setIsGenerating(true);
        try {
            const { generateTimetableAI } = await import('../../lib/gemini');

            // Get full teacher data with PT/FT info
            const teacherData = (window as any).__teacherData || teachers.map(t => ({ id: 'unknown', name: t }));

            const result = await generateTimetableAI({
                className: selectedClass || "Grade X",
                subjects: Object.keys(SUBJECT_COLORS),
                teachers: teacherData, // Now includes employment_type, available_days, subject_specialization
                days: DAYS,
                periodsPerDay: PERIODS.length
            });

            if (result && result.schedule) {
                // Update current schedule with AI results
                const newSchedules = [...schedules];
                if (newSchedules[activeIndex]) {
                    newSchedules[activeIndex].timetable = result.schedule;
                    newSchedules[activeIndex].teacherAssignments = result.assignments;
                    setSchedules(newSchedules);
                }

                // Check validation from AI
                if (result.validation) {
                    const val = result.validation;

                    if (val.pt_teachers_scheduled_correctly === false ||
                        val.all_pt_on_available_days === false) {
                        const warnings = val.warnings?.join(', ') || 'PT teacher constraints may not be satisfied';
                        setToastMessage(`⚠️ Schedule generated with warnings: ${warnings}`);
                    } else if (val.warnings && val.warnings.length > 0) {
                        setToastMessage(`✅ Schedule generated! Note: ${val.warnings[0]}`);
                    } else {
                        setToastMessage("✅ AI Schedule Generated with PT/FT Constraints!");
                    }
                } else {
                    setToastMessage("✅ AI Schedule Generated Successfully!");
                }

                setShowAiModal(false);
            }
        } catch (error: any) {
            console.error(error);
            setToastMessage("AI Error: " + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    // Mobile specific handlers
    const handleMobileSlotClick = (periodName: string) => {
        // Map name to index
        const idx = PERIODS.findIndex(p => p.name === periodName);
        if (idx !== -1) {
            setEditingSlot({ day: selectedDay, period: idx.toString() });
        }
    };

    const handleMobileSubjectSelect = (subject: string) => {
        if (editingSlot) {
            const idx = parseInt(editingSlot.period);
            updateTimetable(editingSlot.day, idx, subject);
            setEditingSlot(null);
        }
    }

    return (
        <div className="flex flex-col h-full bg-gray-50 relative">
            {toastMessage && <Toast message={toastMessage} onClear={() => setToastMessage('')} />}

            <MobileSubjectPicker
                isOpen={!!editingSlot}
                onClose={() => setEditingSlot(null)}
                onSelect={handleMobileSubjectSelect}
                subjects={Object.keys(SUBJECT_COLORS)}
            />

            {/* HEADER */}
            <header className="px-4 py-3 md:px-8 md:py-5 bg-white border-b border-gray-200 flex-shrink-0 z-40 sticky top-0">
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                    <div className="flex items-center justify-between w-full lg:w-auto">
                        <div className="flex items-center space-x-4">
                            <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors lg:hidden">
                                <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
                            </button>
                            <div>
                                <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                                    Timetable Editor
                                    <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${status === 'Published' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                                        {status}
                                    </span>
                                </h2>
                                <p className="text-gray-500 text-xs md:text-sm font-medium">Drag subjects, AI Auto-Fill, or Tap to edit</p>
                            </div>
                        </div>
                    </div>

                    {/* Class Name Input */}
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
                        <span className="text-xs font-bold text-gray-400 uppercase">Class:</span>
                        <input
                            type="text"
                            value={selectedClass}
                            onChange={(e) => {
                                const newSchedules = [...schedules];
                                if (newSchedules[activeIndex]) {
                                    newSchedules[activeIndex].className = e.target.value;
                                    setSchedules(newSchedules);
                                }
                            }}
                            placeholder="e.g. Grade 5A"
                            className="bg-transparent text-sm font-bold text-gray-800 focus:outline-none w-32"
                        />
                    </div>

                    <div className="flex items-center space-x-3 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
                        <button
                            onClick={() => setShowAiModal(true)}
                            className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 font-bold text-xs"
                        >
                            <SparklesIcon className="w-4 h-4" /> AI Auto-Fill
                        </button>

                        <div className="h-8 w-[1px] bg-gray-200 mx-2 hidden sm:block"></div>

                        <button
                            onClick={handlePublishClick}
                            disabled={isSaving}
                            className={`flex-shrink-0 px-5 py-2.5 text-sm font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 ${status === 'Published' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-900 text-white hover:bg-gray-800'}`}
                        >
                            {isSaving ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <CloudUploadIcon className="w-4 h-4" />
                            )}
                            {isSaving ? 'Saving...' : (status === 'Published' ? 'Update Live' : 'Publish Live')}
                        </button>
                    </div>
                </div>
            </header>

            {/* Custom Publish Confirmation Modal */}
            {showPublishModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 animate-scale-up border border-gray-100">
                        <div className="flex justify-center mb-4">
                            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                                <CloudUploadIcon className="w-6 h-6 text-indigo-600" />
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Publish Timetable?</h3>
                        <p className="text-gray-500 text-center text-sm mb-6">
                            This will make the timetable visible to all students and parents in <strong>{schedules.map(s => s.className).join(', ')}</strong> immediately.
                        </p>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setShowPublishModal(false)}
                                className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmPublish}
                                className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                            >
                                Confirm Publish
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-grow flex flex-col lg:flex-row overflow-hidden relative">

                {/* MULTI-CLASS TABS */}
                {schedules.length > 1 && (
                    <div className="lg:hidden w-full bg-white border-b border-gray-200 flex items-center overflow-x-auto no-scrollbar z-30">
                        {schedules.map((sched, idx) => (
                            <button
                                key={idx}
                                onClick={() => setActiveIndex(idx)}
                                className={`flex-shrink-0 py-3 px-6 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeIndex === idx
                                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                {sched.className}
                                {sched.issues?.length > 0 && <span className="ml-2 w-2 h-2 rounded-full bg-red-500 inline-block mb-0.5" />}
                            </button>
                        ))}
                    </div>
                )}

                {/* TOOLBAR SIDEBAR (Desktop) */}
                {!isMobile && (
                    <aside className="w-64 flex-shrink-0 p-6 bg-white border-r border-gray-200 overflow-y-auto space-y-8 z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Subjects Palette</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {Object.keys(SUBJECT_COLORS).map(subject => (
                                    <DraggableSubject key={subject} subjectName={subject} />
                                ))}
                            </div>
                        </div>
                        {/* Teachers List could go here */}
                    </aside>
                )}

                {/* MAIN GRID AREA */}
                <main className="flex-1 overflow-auto bg-gray-50/50 relative flex flex-col">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 pattern-grid-lg opacity-[0.03] pointer-events-none"></div>

                    {/* DESKTOP TABS */}
                    {!isMobile && schedules.length > 1 && (
                        <div className="px-8 pt-6 pb-0 z-10 relative">
                            <div className="flex items-center gap-2 border-b border-gray-200">
                                {schedules.map((sched, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveIndex(idx)}
                                        className={`px-6 py-3 font-bold text-sm rounded-t-xl transition-all border-t border-x border-b-0 translate-y-[1px] leading-none ${activeIndex === idx
                                            ? 'bg-white text-indigo-600 border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]'
                                            : 'bg-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50 border-transparent'
                                            }`}
                                    >
                                        {sched.className}
                                        {sched.issues?.length > 0 && <span className="ml-2 w-2 h-2 rounded-full bg-red-500 inline-block" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {isMobile ? (
                        // MOBILE VIEW
                        <div className="flex flex-col h-full bg-gray-50">
                            <div className="flex overflow-x-auto p-4 space-x-3 bg-white border-b border-gray-200 snap-x sticky top-0 z-20 shadow-sm no-scrollbar">
                                {DAYS.map(day => (
                                    <button
                                        key={day}
                                        onClick={() => setSelectedDay(day)}
                                        className={`flex-shrink-0 snap-start px-5 py-2.5 rounded-full font-bold text-sm transition-all border ${selectedDay === day ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-500'}`}
                                    >
                                        {day.slice(0, 3)}
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 md:p-6">
                                <MobileDayEditor
                                    day={selectedDay}
                                    periods={PERIODS}
                                    timetable={timetable}
                                    onEditSlot={handleMobileSlotClick}
                                />
                            </div>
                        </div>
                    ) : (
                        // DESKTOP GRID VIEW
                        <div className="p-8 h-full overflow-visible pr-16 min-w-max pt-6">
                            <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden inline-block min-w-full rounded-tl-none">
                                <div className="grid gap-[1px] bg-gray-100" style={{ gridTemplateColumns: `100px repeat(${PERIODS.length}, minmax(130px, 1fr))` }}>

                                    {/* Header Row */}
                                    <div className="bg-gray-50/80 backdrop-blur p-4 z-10 sticky top-0 left-0 border-b border-gray-200"></div> {/* Corner */}
                                    {PERIODS.map(period => (
                                        <div key={period.name} className="text-center py-4 px-2 bg-gray-50/80 backdrop-blur z-10 sticky top-0 border-b border-gray-200">
                                            <div className="font-bold text-gray-700 text-xs uppercase tracking-wider mb-1">{period.name}</div>
                                            <div className="text-[10px] font-medium text-gray-400 bg-white inline-block px-2 py-0.5 rounded-full border border-gray-100 shadow-sm">
                                                {formatTime12Hour(period.start)} - {formatTime12Hour(period.end)}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Data Rows */}
                                    {DAYS.map(day => (
                                        <React.Fragment key={day}>
                                            <div className="bg-white font-bold text-gray-800 text-xs uppercase tracking-widest flex items-center justify-center p-4 border-r border-gray-100 writing-vertical-lr rotate-180 md:rotate-0 md:writing-horizontal-tb sticky left-0 z-10 shadow-[4px_0_10px_rgba(0,0,0,0.02)]">
                                                {day.slice(0, 3)}
                                            </div>
                                            {PERIODS.map((period, index) => (
                                                <div key={`${day}-${period.name}`} className="bg-white min-h-[6rem]">
                                                    <TimetableCell
                                                        isBreak={period.isBreak}
                                                        subject={period.isBreak ? period.name : timetable[`${day}-${index}`] || null}
                                                        teacher={teacherAssignments[`${day}-${index}`] || null}
                                                        onDrop={(e) => handleDrop(day, index, e)}
                                                        onClear={() => clearCell(day, index)}
                                                    />
                                                </div>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default TimetableEditor;