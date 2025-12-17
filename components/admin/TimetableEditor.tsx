import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { XCircleIcon, SparklesIcon, BriefcaseIcon, CheckCircleIcon, PlusIcon, EditIcon, CalendarIcon, SaveIcon, CloudUploadIcon, RefreshIcon, ChevronLeftIcon } from '../../constants';
import { SUBJECT_COLORS } from '../../constants';
import { mockSavedTimetable } from '../../data';
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
        handleDragLeave(e);
        if (!isBreak) onDrop(e);
    }

    if (isBreak) {
        return (
            <div className="h-full min-h-[5rem] bg-gray-100/50 flex items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 pattern-diagonal-lines opacity-10"></div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest -rotate-90 md:rotate-0 whitespace-nowrap z-10">{subject}</span>
            </div>
        );
    }

    const colorClass = subject ? SUBJECT_COLORS[subject] : 'bg-white';

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={onClick}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className={`
                h-full min-h-[5rem] border border-gray-100 md:border-transparent flex flex-col items-center justify-center p-1 relative transition-all duration-200
                ${subject
                    ? `${colorClass} shadow-sm`
                    : 'bg-white hover:bg-gray-50'
                }
            `}
        >
            {subject ? (
                <>
                    <span className="font-bold text-xs md:text-sm text-center leading-tight px-1">{subject}</span>
                    {teacher && <span className="text-[10px] md:text-xs mt-1 opacity-75 font-medium truncate max-w-full px-1">{teacher}</span>}

                    {/* Hover Overlay for Delete */}
                    <div className={`absolute inset-0 bg-black/5 backdrop-blur-[1px] flex items-center justify-center transition-opacity duration-200 ${isHovering ? 'opacity-100' : 'opacity-0'}`}>
                        <button
                            onClick={(e) => { e.stopPropagation(); onClear(); }}
                            className="bg-white text-red-500 p-1.5 rounded-full shadow-lg hover:bg-red-50 hover:scale-110 transition-all transform"
                            aria-label={`Clear ${subject}`}
                        >
                            <XCircleIcon className="w-4 h-4" />
                        </button>
                    </div>
                </>
            ) : (
                <div className="w-full h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <PlusIcon className="w-4 h-4 text-gray-300" />
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

                const key = `${day}-${period.name}`;
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
    const [timetable, setTimetable] = useState<Timetable>(timetableData.timetable || {});
    const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignments>(timetableData.teacherAssignments || {});
    const [status, setStatus] = useState<'Draft' | 'Published'>(timetableData.status || 'Draft');
    const [toastMessage, setToastMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Mobile State
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [selectedDay, setSelectedDay] = useState(DAYS[(new Date().getDay() - 1)] || 'Monday');
    const [editingSlot, setEditingSlot] = useState<{ day: string, period: string } | null>(null);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleDrop = (day: string, periodName: string, e: React.DragEvent<HTMLDivElement>) => {
        const subjectName = e.dataTransfer.getData('subjectName');
        if (subjectName) {
            updateTimetable(day, periodName, subjectName);
        }
    };

    const updateTimetable = (day: string, periodName: string, subjectName: string) => {
        const key = `${day}-${periodName}`;

        if (!subjectName) {
            clearCell(day, periodName);
            return;
        }

        setTimetable(prev => ({ ...prev, [key]: subjectName }));

        const teachers: TeacherInfo[] = timetableData.teachers || [];
        const teacherForSubject = teachers.find(t => t.subjects.includes(subjectName));

        if (teacherForSubject) {
            setTeacherAssignments(prev => ({ ...prev, [key]: teacherForSubject.name }));
        } else {
            setTeacherAssignments(prev => {
                const newAssignments = { ...prev };
                delete newAssignments[key];
                return newAssignments;
            });
        }
    };

    const clearCell = (day: string, periodName: string) => {
        const key = `${day}-${periodName}`;
        setTimetable(prev => {
            const newTimetable = { ...prev };
            delete newTimetable[key];
            return newTimetable;
        });
        setTeacherAssignments(prev => {
            const newAssignments = { ...prev };
            delete newAssignments[key];
            return newAssignments;
        })
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (mockSavedTimetable.current) {
                mockSavedTimetable.current.timetable = timetable;
                mockSavedTimetable.current.teacherAssignments = teacherAssignments;
            }
            await saveTimetableToDatabase('Draft');
            setToastMessage('Changes saved to Draft');
        } catch (error) {
            console.error('Error saving timetable:', error);
            setToastMessage('Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePublish = async () => {
        setIsSaving(true);
        try {
            if (mockSavedTimetable.current) {
                mockSavedTimetable.current.timetable = timetable;
                mockSavedTimetable.current.teacherAssignments = teacherAssignments;
                mockSavedTimetable.current.status = 'Published';
            }
            await saveTimetableToDatabase('Published');

            // Send Notification to Students
            // We do this asynchronously to not block the UI
            notifyClass(
                timetableData.className,
                'New Timetable Published',
                `The timetable for ${timetableData.className} has been updated. Check it out now!`
            ).catch(err => console.error("Failed to notify class:", err));

            setStatus('Published');
            setToastMessage('Timetable Published & Students Notified!');
        } catch (error) {
            console.error('Error publishing timetable:', error);
            setToastMessage('Failed to publish');
        } finally {
            setIsSaving(false);
        }
    };

    const saveTimetableToDatabase = async (statusToSave: 'Draft' | 'Published') => {
        const teachers: TeacherInfo[] = timetableData.teachers || [];

        // First, delete existing timetable entries for this class
        await supabase
            .from('timetable')
            .delete()
            .eq('class_name', timetableData.className);

        // Convert timetable object to array of entries
        const entries = [];
        const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const PERIODS = [
            { name: 'Period 1', start: '09:00', end: '09:45' },
            { name: 'Period 2', start: '09:45', end: '10:30' },
            { name: 'Period 3', start: '10:30', end: '11:15' },
            { name: 'Period 4', start: '11:30', end: '12:15' },
            { name: 'Period 5', start: '12:15', end: '13:00' },
            { name: 'Period 6', start: '13:45', end: '14:30' },
            { name: 'Period 7', start: '14:30', end: '15:15' },
            { name: 'Period 8', start: '15:15', end: '16:00' },
        ];

        for (const day of DAYS) {
            for (const period of PERIODS) {
                const key = `${day}-${period.name}`;
                const subject = timetable[key];
                const teacherName = teacherAssignments[key];

                if (subject) {
                    // Find teacher ID from teacher name
                    let teacherId = null;
                    if (teacherName) {
                        const { data: teacherData } = await supabase
                            .from('teachers')
                            .select('id')
                            .ilike('name', teacherName)
                            .single();

                        if (teacherData) {
                            teacherId = teacherData.id;
                        }
                    }

                    entries.push({
                        day,
                        start_time: period.start,
                        end_time: period.end,
                        subject,
                        class_name: timetableData.className,
                        teacher_id: teacherId,
                        status: statusToSave,
                    });
                }
            }
        }

        // Insert all entries
        if (entries.length > 0) {
            const { error } = await supabase
                .from('timetable')
                .insert(entries);

            if (error) {
                throw error;
            }
        }
    };

    const handleRegenerate = () => {
        if (window.confirm("Start over? Unsaved changes will be lost.")) {
            mockSavedTimetable.current = null;
            handleBack();
        }
    };

    // Mobile specific handlers
    const handleMobileSlotClick = (periodName: string) => {
        setEditingSlot({ day: selectedDay, period: periodName });
    };

    const handleMobileSubjectSelect = (subject: string) => {
        if (editingSlot) {
            updateTimetable(editingSlot.day, editingSlot.period, subject);
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
                subjects={timetableData.subjects}
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
                                    {timetableData.className}
                                    <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${status === 'Published' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                                        {status}
                                    </span>
                                </h2>
                                <p className="text-gray-500 text-xs md:text-sm font-medium">Drag subjects to slots or tap to edit</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
                        <button
                            onClick={handleRegenerate}
                            disabled={isSaving}
                            className="flex-shrink-0 px-4 py-2 text-sm font-bold bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 hover:text-gray-800 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            <RefreshIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Reset</span>
                        </button>
                        <div className="h-8 w-[1px] bg-gray-200 mx-2 hidden sm:block"></div>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex-shrink-0 px-5 py-2.5 text-sm font-bold bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSaving && status === 'Draft' ? (
                                <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <SaveIcon className="w-4 h-4 text-gray-500" />
                            )}
                            {isSaving && status === 'Draft' ? 'Saving...' : 'Save Draft'}
                        </button>
                        {status !== 'Published' && (
                            <button
                                onClick={handlePublish}
                                disabled={isSaving}
                                className="flex-shrink-0 px-6 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all flex items-center gap-2 transform active:scale-95 disabled:opacity-70 disabled:scale-100"
                            >
                                {isSaving && status !== 'Draft' ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <CloudUploadIcon className="w-4 h-4" />
                                )}
                                {isSaving && status !== 'Draft' ? 'Publishing...' : 'Publish Live'}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex-grow flex flex-col lg:flex-row overflow-hidden relative">
                {/* TOOLBAR SIDEBAR (Desktop) */}
                {!isMobile && (
                    <aside className="w-72 flex-shrink-0 p-6 bg-white border-r border-gray-200 overflow-y-auto space-y-8 z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Subjects Palette</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {timetableData.subjects.map((subjectName: string) => (
                                    <DraggableSubject key={subjectName} subjectName={subjectName} />
                                ))}
                            </div>
                        </div>
                        <div className="border-t border-gray-100 pt-6">
                            <AISummary suggestions={timetableData.suggestions} teacherLoad={timetableData.teacherLoad} />
                        </div>
                    </aside>
                )}

                {/* MAIN GRID AREA */}
                <main className="flex-1 overflow-auto bg-gray-50/50 relative">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 pattern-grid-lg opacity-[0.03] pointer-events-none"></div>

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
                        <div className="p-8 min-w-[1000px] h-full overflow-visible">
                            <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
                                <div className="grid gap-[1px] bg-gray-100" style={{ gridTemplateColumns: `80px repeat(${PERIODS.length}, 1fr)` }}>

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
                                            {PERIODS.map(period => (
                                                <div key={`${day}-${period.name}`} className="bg-white min-h-[6rem]">
                                                    <TimetableCell
                                                        isBreak={period.isBreak}
                                                        subject={period.isBreak ? period.name : timetable[`${day}-${period.name}`] || null}
                                                        teacher={teacherAssignments[`${day}-${period.name}`] || null}
                                                        onDrop={(e) => handleDrop(day, period.name, e)}
                                                        onClear={() => clearCell(day, period.name)}
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