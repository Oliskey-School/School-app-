import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { XCircleIcon, SparklesIcon, BriefcaseIcon, CheckCircleIcon } from '../../constants';
import { SUBJECT_COLORS } from '../../constants';
import { mockSavedTimetable } from '../../data';

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

const DraggableSubject: React.FC<{ subjectName: string }> = ({ subjectName }) => {
    const [isDragging, setIsDragging] = useState(false);
    const colorClass = SUBJECT_COLORS[subjectName] || 'bg-gray-200 text-gray-800';
    return (
        <div
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData('subjectName', subjectName);
                setIsDragging(true);
            }}
            onDragEnd={() => setIsDragging(false)}
            className={`p-2 rounded-lg cursor-grab text-sm font-semibold text-center ${colorClass} shadow-sm hover:shadow-md transition-all ${isDragging ? 'opacity-50 scale-95 ring-2 ring-offset-2 ring-sky-400' : ''}`}
            aria-label={`Drag ${subjectName} subject`}
        >
            {subjectName}
        </div>
    );
};

const TimetableCell: React.FC<{ subject: string | null; teacher: string | null; onDrop: (e: React.DragEvent<HTMLDivElement>) => void; onClear: () => void; isBreak?: boolean }> = ({ subject, teacher, onDrop, onClear, isBreak }) => {
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
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className={`h-24 border-2 border-transparent rounded-lg flex flex-col items-center justify-center text-center p-1 relative transition-colors duration-150 ${subject ? colorClass : 'bg-gray-200/50'}`}
        >
            {subject ? (
                <>
                    <span className="font-bold text-sm">{subject}</span>
                    {teacher && <span className="text-xs mt-1 opacity-80">{teacher}</span>}
                    {isHovering && (
                         <button 
                            onClick={onClear} 
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

const AISummary: React.FC<{ suggestions: string[]; teacherLoad: TeacherLoad[] }> = ({ suggestions, teacherLoad }) => {
    if (suggestions.length === 0 && teacherLoad.length === 0) return null;

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800">AI Summary & Suggestions</h3>
            {teacherLoad.length > 0 && (
                <div className="bg-gray-50 p-3 rounded-lg">
                    <h4 className="font-semibold text-gray-700 mb-2 flex items-center"><BriefcaseIcon className="w-5 h-5 mr-2 text-indigo-600"/>Teacher Workload</h4>
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
                    <h4 className="font-semibold text-gray-700 mb-2 flex items-center"><SparklesIcon className="w-5 h-5 mr-2 text-indigo-600"/>AI Suggestions</h4>
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

    const handleDrop = (day: string, periodName: string, e: React.DragEvent<HTMLDivElement>) => {
        const subjectName = e.dataTransfer.getData('subjectName');
        if (subjectName) {
            const key = `${day}-${periodName}`;
            setTimetable(prev => ({ ...prev, [key]: subjectName }));
            
            const teachers: TeacherInfo[] = timetableData.teachers || [];
            const teacherForSubject = teachers.find(t => t.subjects.includes(subjectName));

            if (teacherForSubject) {
                setTeacherAssignments(prev => ({ ...prev, [key]: teacherForSubject.name }));
            } else {
                // If no teacher is found for this subject (edge case), clear the assignment
                setTeacherAssignments(prev => {
                    const newAssignments = { ...prev };
                    delete newAssignments[key];
                    return newAssignments;
                });
            }
        }
    };

    const clearCell = (day: string, periodName: string) => {
        const key = `${day}-${periodName}`;
        setTimetable(prev => {
            const newTimetable = {...prev};
            delete newTimetable[key];
            return newTimetable;
        });
        setTeacherAssignments(prev => {
            const newAssignments = {...prev};
            delete newAssignments[key];
            return newAssignments;
        })
    };

    const handleSave = () => {
        if (mockSavedTimetable.current) {
            mockSavedTimetable.current.timetable = timetable;
            mockSavedTimetable.current.teacherAssignments = teacherAssignments;
        }
        setToastMessage('Changes saved successfully!');
    };

    const handlePublish = () => {
        if (mockSavedTimetable.current) {
            mockSavedTimetable.current.timetable = timetable;
            mockSavedTimetable.current.teacherAssignments = teacherAssignments;
            mockSavedTimetable.current.status = 'Published';
            setStatus('Published');
        }
        setToastMessage('Timetable published!');
    };

    const handleRegenerate = () => {
        if (window.confirm("This will discard your current timetable and start a new generation. Are you sure?")) {
            mockSavedTimetable.current = null;
            handleBack(); // Go back to overview, user clicks card again to generate
        }
    };
    
    return (
        <div className="flex flex-col h-full bg-gray-100 relative">
            {toastMessage && <Toast message={toastMessage} onClear={() => setToastMessage('')} />}
            <header className="p-4 bg-white border-b border-gray-200 flex-shrink-0">
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Timetable Editor</h2>
                            <p className="font-semibold text-gray-600">{timetableData.className}</p>
                        </div>
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${status === 'Published' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                            {status}
                        </span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button onClick={handleRegenerate} className="px-3 py-2 text-sm font-semibold bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">
                            Re-generate
                        </button>
                        <button onClick={handleSave} className="px-3 py-2 text-sm font-semibold bg-sky-500 text-white rounded-lg hover:bg-sky-600">
                            Save Changes
                        </button>
                        {status !== 'Published' && (
                            <button onClick={handlePublish} className="px-3 py-2 text-sm font-semibold bg-green-500 text-white rounded-lg hover:bg-green-600">
                                Publish
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex-grow flex overflow-hidden">
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

                <main className="flex-1 overflow-auto bg-gray-200/50">
                    <div className="p-4 space-y-3">
                        <div className="grid gap-1.5" style={{ gridTemplateColumns: `min-content repeat(${PERIODS.length}, 1fr)`}}>
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
                                    <div className="sticky left-0 bg-gray-100 z-10 font-bold text-gray-600 text-sm flex items-center justify-center p-2 border-r border-gray-200">{day}</div>
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
                </main>
            </div>
        </div>
    );
};

export default TimetableEditor;