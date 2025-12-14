import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { XCircleIcon, SparklesIcon, BriefcaseIcon, CheckCircleIcon, PlusIcon, EditIcon } from '../../constants';
import { SUBJECT_COLORS } from '../../constants';
import { mockSavedTimetable } from '../../data';
import { TimetableEntry } from '../../types';
import { supabase } from '../../lib/supabase';

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
        <div className="fixed bottom-24 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 animate-slide-in-up z-50">
            <CheckCircleIcon className="w-5 h-5 text-green-400" />
            <span>{message}</span>
        </div>
    );
};

const DraggableSubject: React.FC<{ subjectName: string; onClick?: () => void }> = ({ subjectName, onClick }) => {
    const [isDragging, setIsDragging] = useState(false);
    const colorClass = SUBJECT_COLORS[subjectName] || 'bg-gray-200 text-gray-800';
    return (
        <div
            draggable
            onClick={onClick}
            onDragStart={(e) => {
                e.dataTransfer.setData('subjectName', subjectName);
                setIsDragging(true);
            }}
            onDragEnd={() => setIsDragging(false)}
            className={`p-2 rounded-lg cursor-grab text-sm font-semibold text-center ${colorClass} shadow-sm hover:shadow-md transition-all ${isDragging ? 'opacity-50 scale-95 ring-2 ring-offset-2 ring-sky-400' : ''}`}
            aria-label={`Drag or Select ${subjectName} subject`}
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
            e.currentTarget.classList.add('bg-sky-100', 'border-sky-300', 'border-dashed');
        }
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.currentTarget.classList.remove('bg-sky-100', 'border-sky-300', 'border-dashed');
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        handleDragLeave(e);
        if (!isBreak) onDrop(e);
    }

    if (isBreak) {
        return <div className="h-24 bg-gray-200 rounded-lg flex items-center justify-center font-semibold text-gray-500">{subject}</div>;
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
            className={`h-24 border-2 border-transparent rounded-lg flex flex-col items-center justify-center text-center p-1 relative transition-colors duration-150 ${subject ? colorClass : 'bg-gray-200/50 hover:bg-gray-300/50'}`}
        >
            {subject ? (
                <>
                    <span className="font-bold text-sm">{subject}</span>
                    {teacher && <span className="text-xs mt-1 opacity-80">{teacher}</span>}
                    {isHovering && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onClear(); }}
                            className="absolute top-1 right-1 text-gray-500 hover:text-red-500 transition-colors"
                            aria-label={`Clear ${subject} from this slot`}
                        >
                            <XCircleIcon className="w-4 h-4 bg-white/50 rounded-full" />
                        </button>
                    )}
                </>
            ) : <div className="w-full h-full rounded-lg"></div>}
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col animate-slide-in-up">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg">Select Subject</h3>
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                        <XCircleIcon className="w-6 h-6 text-gray-600" />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto grid grid-cols-2 gap-3">
                    {subjects.map(subject => (
                        <button
                            key={subject}
                            onClick={() => onSelect(subject)}
                            className={`p-3 rounded-xl font-bold text-sm text-left shadow-sm ${SUBJECT_COLORS[subject] || 'bg-gray-100 text-gray-800'}`}
                        >
                            {subject}
                        </button>
                    ))}
                    <button
                        onClick={() => onSelect('')}
                        className="p-3 rounded-xl font-bold text-sm text-center border-2 border-dashed border-red-300 text-red-500 bg-red-50"
                    >
                        Clear Slot
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
        <div className="space-y-3 pb-20">
            {periods.map((period, idx) => {
                if (period.isBreak) return (
                    <div key={idx} className="flex items-center justify-center p-2 bg-gray-100 rounded-lg">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{period.name}</span>
                    </div>
                );

                const key = `${day}-${period.name}`;
                const subject = timetable[key];
                const colorClass = subject ? SUBJECT_COLORS[subject] : 'bg-white border border-gray-200';

                return (
                    <button
                        key={idx}
                        onClick={() => onEditSlot(period.name)}
                        className={`w-full text-left p-4 rounded-xl shadow-sm flex items-center justify-between group transition-transform active:scale-[0.98] ${colorClass}`}
                    >
                        <div>
                            <p className="text-xs font-medium opacity-60 mb-1">{formatTime12Hour(period.start)} - {formatTime12Hour(period.end)}</p>
                            <h4 className={`font-bold ${!subject ? 'text-gray-400 italic' : ''}`}>{subject || 'Empty Slot'}</h4>
                        </div>
                        <div className={`p-2 rounded-full ${subject ? 'bg-white/30' : 'bg-gray-100'}`}>
                            {subject ? <EditIcon className="w-5 h-5 opacity-70" /> : <PlusIcon className="w-5 h-5 text-gray-400" />}
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
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800">AI Summary & Suggestions</h3>
            {teacherLoad.length > 0 && (
                <div className="bg-gray-50 p-3 rounded-lg">
                    <h4 className="font-semibold text-gray-700 mb-2 flex items-center"><BriefcaseIcon className="w-5 h-5 mr-2 text-indigo-600" />Teacher Workload</h4>
                    <ul className="text-sm space-y-1">
                        {teacherLoad.map(load => (
                            <li key={load.teacherName} className="flex justify-between">
                                <span>{load.teacherName}:</span>
                                <span className="font-bold">{load.totalPeriods} periods</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {suggestions.length > 0 && (
                <div className="bg-gray-50 p-3 rounded-lg">
                    <h4 className="font-semibold text-gray-700 mb-2 flex items-center"><SparklesIcon className="w-5 h-5 mr-2 text-indigo-600" />AI Suggestions</h4>
                    <div className="prose prose-sm max-w-none prose-ul:pl-4 prose-li:my-1 text-gray-700">
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
        try {
            // Save to mock for backward compatibility
            if (mockSavedTimetable.current) {
                mockSavedTimetable.current.timetable = timetable;
                mockSavedTimetable.current.teacherAssignments = teacherAssignments;
            }

            // Save to Supabase with Draft status
            await saveTimetableToDatabase('Draft');
            setToastMessage('Changes saved successfully!');
        } catch (error) {
            console.error('Error saving timetable:', error);
            setToastMessage('Error saving changes. Please try again.');
        }
    };

    const handlePublish = async () => {
        try {
            // Save to mock for backward compatibility
            if (mockSavedTimetable.current) {
                mockSavedTimetable.current.timetable = timetable;
                mockSavedTimetable.current.teacherAssignments = teacherAssignments;
                mockSavedTimetable.current.status = 'Published';
            }

            // Save to Supabase with Published status
            await saveTimetableToDatabase('Published');
            setStatus('Published');
            setToastMessage('Timetable published! Now visible to teachers and students.');
        } catch (error) {
            console.error('Error publishing timetable:', error);
            setToastMessage('Error publishing timetable. Please try again.');
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
        if (window.confirm("This will discard your current timetable and start a new generation. Are you sure?")) {
            mockSavedTimetable.current = null;
            handleBack(); // Go back to overview, user clicks card again to generate
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
        <div className="flex flex-col h-full bg-gray-100 relative">
            {toastMessage && <Toast message={toastMessage} onClear={() => setToastMessage('')} />}

            <MobileSubjectPicker
                isOpen={!!editingSlot}
                onClose={() => setEditingSlot(null)}
                onSelect={handleMobileSubjectSelect}
                subjects={timetableData.subjects}
            />

            <header className="p-4 bg-white border-b border-gray-200 flex-shrink-0">
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                    <div className="flex items-center justify-between w-full lg:w-auto">
                        <div className="flex items-center space-x-3">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Timetable Editor</h2>
                                <p className="font-semibold text-gray-600 text-sm">{timetableData.className}</p>
                            </div>
                            <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${status === 'Published' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                {status}
                            </span>
                        </div>
                        {/* Mobile Actions Overlay Trigger could go here */}
                    </div>

                    <div className="flex items-center space-x-2 overflow-x-auto pb-1 lg:pb-0">
                        <button onClick={handleRegenerate} className="flex-shrink-0 px-3 py-2 text-sm font-semibold bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">
                            Re-generate
                        </button>
                        <button onClick={handleSave} className="flex-shrink-0 px-3 py-2 text-sm font-semibold bg-sky-500 text-white rounded-lg hover:bg-sky-600">
                            Save Changes
                        </button>
                        {status !== 'Published' && (
                            <button onClick={handlePublish} className="flex-shrink-0 px-3 py-2 text-sm font-semibold bg-green-500 text-white rounded-lg hover:bg-green-600">
                                Publish
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex-grow flex flex-col lg:flex-row overflow-hidden">
                {/* Sidebar (Desktop only for Drag sources, Mobile hides this or moves it) */}
                {!isMobile && (
                    <aside className="w-64 flex-shrink-0 p-4 bg-white border-r border-gray-200 overflow-y-auto space-y-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Subjects Palette</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {timetableData.subjects.map((subjectName: string) => (
                                    <DraggableSubject key={subjectName} subjectName={subjectName} />
                                ))}
                            </div>
                        </div>
                        <AISummary suggestions={timetableData.suggestions} teacherLoad={timetableData.teacherLoad} />
                    </aside>
                )}

                <main className="flex-1 overflow-auto bg-gray-50">
                    {isMobile ? (
                        // Mobile View
                        <div className="flex flex-col h-full">
                            <div className="flex overflow-x-auto p-4 space-x-3 bg-white border-b border-gray-200 snap-x">
                                {DAYS.map(day => (
                                    <button
                                        key={day}
                                        onClick={() => setSelectedDay(day)}
                                        className={`flex-shrink-0 snap-start px-6 py-2 rounded-full font-bold text-sm transition-all ${selectedDay === day ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-gray-100 text-gray-500'}`}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 overflow-y-auto p-4">
                                <MobileDayEditor
                                    day={selectedDay}
                                    periods={PERIODS}
                                    timetable={timetable}
                                    onEditSlot={handleMobileSlotClick}
                                />
                            </div>
                        </div>
                    ) : (
                        // Desktop Grid View
                        <div className="p-4 space-y-3 min-w-[1000px]">
                            <div className="grid gap-1.5" style={{ gridTemplateColumns: `min-content repeat(${PERIODS.length}, 1fr)` }}>
                                {/* Top-left empty cell */}
                                <div className="sticky top-0 left-0 bg-gray-100 z-30 border-b border-r border-gray-200"></div>

                                {/* Period headers */}
                                {PERIODS.map(period => (
                                    <div key={period.name} className="text-center font-bold text-gray-600 text-sm py-2 sticky top-0 bg-gray-100 z-20 border-b border-gray-200">
                                        {period.name}
                                        <div className="font-normal text-xs text-gray-500">{formatTime12Hour(period.start)} - {formatTime12Hour(period.end)}</div>
                                    </div>
                                ))}

                                {/* Rows for each day */}
                                {DAYS.map(day => (
                                    <React.Fragment key={day}>
                                        <div className="sticky left-0 bg-gray-100 z-10 font-bold text-gray-600 text-sm flex items-center justify-center p-2 border-r border-gray-200 min-w-[80px]">{day}</div>
                                        {PERIODS.map(period => (
                                            <TimetableCell
                                                key={`${day}-${period.name}`}
                                                isBreak={period.isBreak}
                                                subject={period.isBreak ? period.name : timetable[`${day}-${period.name}`] || null}
                                                teacher={teacherAssignments[`${day}-${period.name}`] || null}
                                                onDrop={(e) => handleDrop(day, period.name, e)}
                                                onClear={() => clearCell(day, period.name)}
                                            />
                                        ))}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default TimetableEditor;