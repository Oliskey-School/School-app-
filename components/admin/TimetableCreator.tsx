
import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { generateTimetableLocal, AlgoInput, GeneratedScheduleResult } from '../../lib/timetableAlgorithm';
import {
    CalendarIcon,
    SparklesIcon,
    SaveIcon,
    FilterIcon,
    ChevronDownIcon,
    XIcon,
    PlusIcon,
    RefreshIcon,
    UserIcon,
    BookOpenIcon,
    CheckCircleIcon,
    AlertTriangleIcon,
    TrashIcon,
    ExclamationIcon,
    SUBJECT_COLORS
} from '../../constants';

// --- TYPES ---

interface ClassOption {
    id: string;
    name: string;
    grade: number;
}

interface TeacherOption {
    id: string;
    name: string;
    subjects: string[];
    available_days?: string[];
}

interface TimetableCellData {
    subject: string;
    teacher: string;
    room?: string;
}

// Map: ClassName -> "Day-Period" -> CellData
type MasterSchedule = {
    [className: string]: {
        [key: string]: TimetableCellData; // key: "Monday-0"
    };
};

// Constants (Local for now to ensure self-containment)
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
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


const TimetableCreator: React.FC<{ navigateTo: (path: string) => void, initialClasses?: ClassOption[], schoolId?: string }> = ({ navigateTo, initialClasses, schoolId }) => {
    // --- STATE ---

    // Configuration
    const [selectedSession, setSelectedSession] = useState('2025/2026');
    const [selectedTerm, setSelectedTerm] = useState('First Term');
    const [selectedClasses, setSelectedClasses] = useState<ClassOption[]>(initialClasses || []);

    // Data
    const [allClasses, setAllClasses] = useState<ClassOption[]>([]);
    const [allTeachers, setAllTeachers] = useState<TeacherOption[]>([]);
    const [subjectsList, setSubjectsList] = useState<string[]>(Object.keys(SUBJECT_COLORS));

    // Schedule State
    const [masterSchedule, setMasterSchedule] = useState<MasterSchedule>({});
    const [activeClassTab, setActiveClassTab] = useState<string>(''); // Name of class currently being viewed

    // UI State
    const [isGenerating, setIsGenerating] = useState(false);
    const [showClassSelector, setShowClassSelector] = useState(false);

    // Manual Edit Popup
    // Manual Edit Popup
    const [editingCell, setEditingCell] = useState<{ day: string, periodIndex: number, className: string } | null>(null);
    const [popupSubject, setPopupSubject] = useState('');
    const [popupTeacher, setPopupTeacher] = useState('');
    const [conflictStatus, setConflictStatus] = useState<string | null>(null);
    const [isCheckingConflict, setIsCheckingConflict] = useState(false);

    // --- EFFECTS ---

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (initialClasses && initialClasses.length > 0) {
            setSelectedClasses(initialClasses);
        }
    }, [initialClasses]);

    useEffect(() => {
        // If active tab is invalid (e.g. class removed), reset it
        if (selectedClasses.length > 0) {
            if (!activeClassTab || !selectedClasses.find(c => c.name === activeClassTab)) {
                setActiveClassTab(selectedClasses[0].name);
            }
        } else {
            setActiveClassTab('');
        }
    }, [selectedClasses, activeClassTab]);

    // --- DATA FETCHING ---

    const fetchInitialData = async () => {
        try {
            // Fetch Classes
            const { data: classesData } = await supabase.from('classes').select('id, name, grade').order('grade');
            if (classesData) setAllClasses(classesData);

            // Fetch Teachers
            const { data: teachersData } = await supabase.from('teachers').select('id, name, subjects, available_days');
            if (teachersData) setAllTeachers(teachersData);

        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to load initial data.");
        }
    };

    // --- LOGIC: SAVE TO DB ---

    const handleSave = async () => {
        if (!schoolId) {
            toast.error("School ID missing. Cannot save.");
            return;
        }
        if (Object.keys(masterSchedule).length === 0) {
            toast.error("No schedule to save.");
            return;
        }

        if (!window.confirm("This will overwrite existing timetables for the selected classes. Continue?")) return;

        const toastId = toast.loading("Saving timetables...");

        try {
            // Prepare batch operations
            const classesToSave = Object.keys(masterSchedule);

            // 1. Get Class IDs for the names
            const classMap = new Map(allClasses.map(c => [c.name, c.id]));
            const teacherMap = new Map(allTeachers.map(t => [t.name, t.id]));

            const entriesToInsert: any[] = [];

            for (const className of classesToSave) {
                const classId = classMap.get(className);
                if (!classId) continue;

                const schedule = masterSchedule[className];

                // Iterate cells
                for (const key of Object.keys(schedule)) {
                    const cell = schedule[key];
                    const [day, pIdxStr] = key.split('-');
                    const pIdx = parseInt(pIdxStr);
                    const period = PERIODS[pIdx];

                    if (!period || period.isBreak) continue;

                    const teacherId = teacherMap.get(cell.teacher);

                    entriesToInsert.push({
                        school_id: schoolId,
                        class_id: classId,
                        class_name: className,
                        day: day,
                        period_index: pIdx,
                        start_time: period.start,
                        end_time: period.end,
                        subject: cell.subject,
                        teacher_id: teacherId,
                        status: 'Published',
                        created_at: new Date().toISOString()
                    });
                }
            }

            // 2. Delete existing for these classes
            const { error: deleteError } = await supabase
                .from('timetable')
                .delete()
                .in('class_name', classesToSave)
                .eq('school_id', schoolId);

            if (deleteError) throw deleteError;

            // 3. Insert new
            if (entriesToInsert.length > 0) {
                const { error: insertError } = await supabase
                    .from('timetable')
                    .insert(entriesToInsert);

                if (insertError) throw insertError;
            }

            toast.success("Timetables saved and published!", { id: toastId });

        } catch (error: any) {
            console.error("Save error:", error);
            toast.error(`Failed to save: ${error.message}`, { id: toastId });
        }
    };

    // --- LOGIC: AUTO GENERATE ---

    const handleAutoGenerate = async () => {
        if (selectedClasses.length === 0) {
            toast.error("Please select at least one class.");
            return;
        }

        setIsGenerating(true);
        // Small delay to let UI render the loading state
        setTimeout(() => {
            try {
                // 1. Prepare Input for Algorithm
                const algoInput: AlgoInput = {
                    classes: selectedClasses.map(cls => ({
                        id: cls.id,
                        name: cls.name,
                        subjects: subjectsList.slice(0, 8).map(subj => ({ // Simulating subject requirements
                            name: subj,
                            weeklyFrequency: 3 // Default 3 periods per week per subject
                        }))
                    })),
                    teachers: allTeachers.map(t => ({
                        id: t.id,
                        name: t.name,
                        subjectSpecialization: t.subjects || [],
                        availableDays: t.available_days
                    })),
                    days: DAYS,
                    periods: PERIODS.filter(p => !p.isBreak).length
                };

                // 2. Run Local Algorithm
                const result: GeneratedScheduleResult = generateTimetableLocal(algoInput);

                if (result.success) {
                    // 3. Map Result to State
                    const newMasterSchedule: MasterSchedule = {};

                    result.schedules.forEach(sched => {
                        const classSchedule: { [key: string]: TimetableCellData } = {};

                        Object.entries(sched.schedule).forEach(([key, subject]) => {
                            // key is "Day-PeriodIndex" (0-based index of teaching periods)
                            // We need to map teaching period index back to our GRID index (which includes breaks)
                            // Algorithm used 0-7 indexes. Grid uses 0-n including breaks.

                            // Let's create a mapping of "Teaching Index" -> "Grid Index"
                            let gridIndex = -1;


                            // We need to parse the key "Monday-2"
                            const [day, pIdxStr] = key.split('-');
                            const pIdx = parseInt(pIdxStr);

                            // Find the corresponding Grid Index
                            let currentTeachingCount = 0;
                            for (let i = 0; i < PERIODS.length; i++) {
                                if (!PERIODS[i].isBreak) {
                                    if (currentTeachingCount === pIdx) {
                                        gridIndex = i;
                                        break;
                                    }
                                    currentTeachingCount++;
                                }
                            }

                            if (gridIndex !== -1) {
                                const teacherName = sched.assignments[key] || "Unassigned";
                                classSchedule[`${day}-${gridIndex}`] = {
                                    subject: subject,
                                    teacher: teacherName
                                };
                            }
                        });

                        newMasterSchedule[sched.className] = classSchedule;
                    });

                    setMasterSchedule(newMasterSchedule);
                    toast.success("Schedule Auto-Generated Successfully!");
                } else {
                    toast.error("Could not fully resolve schedule. Some conflicts may exist.");
                }

            } catch (error) {
                console.error("Auto-gen error:", error);
                toast.error("An error occurred during generation.");
            } finally {
                setIsGenerating(false);
            }
        }, 100);
    };

    // --- LOGIC: MANUAL EDIT ---

    const handleCellClick = (day: string, periodIndex: number) => {
        if (!activeClassTab) return;
        const cellKey = `${day}-${periodIndex}`;
        const existing = masterSchedule[activeClassTab]?.[cellKey];

        setEditingCell({ day, periodIndex, className: activeClassTab });
        setPopupSubject(existing?.subject || '');
        setPopupTeacher(existing?.teacher || '');
        setConflictStatus(null);
    };

    const checkDBConflict = async (day: string, periodIndex: number, teacherName: string, currentClassName: string) => {
        if (!teacherName || !schoolId) return null;
        const teacher = allTeachers.find(t => t.name === teacherName);
        if (!teacher) return null;

        const { data, error } = await supabase
            .from('timetable')
            .select('class_name')
            .eq('school_id', schoolId)
            .eq('teacher_id', teacher.id)
            .eq('day', day)
            .eq('period_index', periodIndex)
            .neq('class_name', currentClassName);

        if (error) {
            console.error("Conflict check error:", error);
            return null;
        }

        if (data && data.length > 0) {
            return `Busy in ${data[0].class_name} (Database)`;
        }
        return null;
    };

    const handleTeacherChange = async (newTeacher: string) => {
        setPopupTeacher(newTeacher);
        setConflictStatus(null);

        if (!newTeacher || !editingCell) return;

        // 1. Local Check
        const localConflict = checkTeacherConflict(editingCell.day, editingCell.periodIndex, newTeacher, editingCell.className);
        if (localConflict) {
            setConflictStatus(`Busy in ${localConflict} (Unsaved Draft)`);
            return;
        }

        // 2. DB Check
        setIsCheckingConflict(true);
        const dbConflict = await checkDBConflict(editingCell.day, editingCell.periodIndex, newTeacher, editingCell.className);
        setIsCheckingConflict(false);

        if (dbConflict) {
            setConflictStatus(dbConflict);
        }
    };

    const handleCellUpdate = () => {
        if (!editingCell) return;

        const subject = popupSubject;
        const teacher = popupTeacher;

        if (!subject || !teacher) return;

        const newSchedule = { ...masterSchedule };
        if (!newSchedule[editingCell.className]) newSchedule[editingCell.className] = {};

        newSchedule[editingCell.className][`${editingCell.day}-${editingCell.periodIndex}`] = {
            subject,
            teacher
        };

        setMasterSchedule(newSchedule);
        setEditingCell(null);
        setConflictStatus(null);
    };

    const handleCellClear = () => {
        if (!editingCell) return;
        const newSchedule = { ...masterSchedule };
        if (newSchedule[editingCell.className]) {
            delete newSchedule[editingCell.className][`${editingCell.day}-${editingCell.periodIndex}`];
        }
        setMasterSchedule(newSchedule);
        setEditingCell(null);
        setConflictStatus(null);
    };

    const checkTeacherConflict = (day: string, periodIndex: number, teacherName: string, excludeClass: string): string | null => {
        // Iterate all other classes
        for (const clsName of Object.keys(masterSchedule)) {
            if (clsName === excludeClass) continue;

            const cell = masterSchedule[clsName][`${day}-${periodIndex}`];
            if (cell && cell.teacher === teacherName) {
                return clsName;
            }
        }
        return null;
    };

    // --- LOGIC: SELECTORS ---

    const toggleClassSelection = (cls: ClassOption) => {
        if (selectedClasses.find(c => c.id === cls.id)) {
            setSelectedClasses(selectedClasses.filter(c => c.id !== cls.id));
        } else {
            setSelectedClasses([...selectedClasses, cls]);
        }
    };

    // --- RENDER ---

    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-hidden">

            {/* 1. HEADER (Configuration) */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Timetable Creator</h1>
                        <p className="text-sm text-gray-500">Create global schedules manually or using local AI logic.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Session/Term Selectors */}
                        <div className="flex bg-gray-100 rounded-lg p-1">
                            {['First Term', 'Second Term', 'Third Term'].map(term => (
                                <button
                                    key={term}
                                    onClick={() => setSelectedTerm(term)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${selectedTerm === term ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    {term.split(' ')[0]}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Class Multi-Selector */}
                <div className="relative z-50">
                    <button
                        onClick={() => setShowClassSelector(!showClassSelector)}
                        className="w-full flex items-center justify-between p-3 bg-white border border-gray-300 rounded-xl hover:border-indigo-500 transition-colors group"
                    >
                        <div className="flex items-center gap-2 overflow-hidden flex-wrap">
                            <FilterIcon className="w-5 h-5 text-gray-400 group-hover:text-indigo-500" />
                            {selectedClasses.length === 0 ? (
                                <span className="text-gray-500 font-medium">Select Classes to Schedule...</span>
                            ) : (
                                selectedClasses.map(c => (
                                    <span key={c.id} onClick={(e) => { e.stopPropagation(); toggleClassSelection(c); }} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-red-50 hover:text-red-700 hover:border-red-100 cursor-pointer transition-colors">
                                        {c.name}
                                        <XIcon className="w-3 h-3 ml-1" />
                                    </span>
                                ))
                            )}
                        </div>
                        <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                    </button>

                    {showClassSelector && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 max-h-64 overflow-y-auto p-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                            {allClasses.map(cls => (
                                <button
                                    key={cls.id}
                                    onClick={() => toggleClassSelection(cls)}
                                    className={`px-3 py-2 rounded-lg text-sm font-bold text-left transition-colors ${selectedClasses.find(c => c.id === cls.id) ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                                >
                                    {cls.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </header>

            {/* 2. ACTIONS & TABS */}
            <div className="bg-white border-b border-gray-200 px-6 py-2 flex items-center justify-between sticky top-0 z-30 shadow-sm">

                {/* Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-2xl">
                    {selectedClasses.length === 0 && <span className="text-sm text-gray-400 italic">No classes selected.</span>}
                    {selectedClasses.map(cls => (
                        <button
                            key={cls.id}
                            onClick={() => setActiveClassTab(cls.name)}
                            className={`px-4 py-2 text-sm font-bold rounded-lg border-b-2 transition-all whitespace-nowrap ${activeClassTab === cls.name ? 'border-indigo-600 text-indigo-600 bg-indigo-50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
                        >
                            {cls.name}
                        </button>
                    ))}
                </div>

                {/* Primary Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleAutoGenerate}
                        disabled={isGenerating || selectedClasses.length === 0}
                        className={`px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm flex items-center gap-2 transition-all ${isGenerating ? 'opacity-75 cursor-not-allowed' : ''}`}
                    >
                        {isGenerating ? <RefreshIcon className="w-4 h-4 animate-spin" /> : <SparklesIcon className="w-4 h-4" />}
                        {isGenerating ? 'Solving...' : 'Auto-Fill Schedule'}
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold rounded-lg shadow-sm flex items-center gap-2"
                    >
                        <SaveIcon className="w-4 h-4" />
                        Save to Database
                    </button>
                </div>
            </div>

            {/* 3. MAIN WORKSPACE (Grid) */}
            <main className="flex-1 overflow-auto p-6 relative">
                {/* Background Pattern */}
                <div className="absolute inset-0 pattern-grid-lg opacity-[0.03] pointer-events-none"></div>

                {selectedClasses.length > 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-w-[800px]">
                        {/* Grid Header */}
                        <div className="grid grid-cols-[80px_repeat(5,1fr)] bg-gray-50 border-b border-gray-200">
                            <div className="p-4 border-r border-gray-200 flex items-center justify-center">
                                <span className="font-bold text-gray-400 text-xs uppercase">Time</span>
                            </div>
                            {DAYS.map(day => (
                                <div key={day} className="p-4 border-r border-gray-200 text-center last:border-r-0">
                                    <span className="font-bold text-gray-800 text-sm uppercase tracking-wide">{day}</span>
                                </div>
                            ))}
                        </div>

                        {/* Grid Body */}
                        {PERIODS.map((period, pIdx) => (
                            <div key={period.name} className={`grid grid-cols-[80px_repeat(5,1fr)] ${period.isBreak ? 'bg-orange-50/50' : 'bg-white'} border-b border-gray-100 last:border-none`}>
                                {/* Time Column */}
                                <div className="p-3 border-r border-gray-200 flex flex-col items-center justify-center text-xs font-medium text-gray-500">
                                    <span>{period.start}</span>
                                    <span className="h-4 w-[1px] bg-gray-300 my-1"></span>
                                    <span>{period.end}</span>
                                </div>

                                {/* Days Columns */}
                                {period.isBreak ? (
                                    <div className="col-span-5 flex items-center justify-center p-2 text-xs font-bold text-orange-400 tracking-widest uppercase">
                                        {period.name}
                                    </div>
                                ) : (
                                    DAYS.map(day => {
                                        const cellKey = `${day}-${pIdx}`;
                                        const cellData = activeClassTab && masterSchedule[activeClassTab]?.[cellKey];

                                        return (
                                            <div
                                                key={cellKey}
                                                onClick={() => !period.isBreak && handleCellClick(day, pIdx)}
                                                className="border-r border-gray-100 last:border-r-0 p-2 min-h-[100px] relative hover:bg-gray-50 transition-colors cursor-pointer group"
                                            >
                                                {cellData ? (
                                                    <div className={`h-full w-full rounded-lg p-3 flex flex-col justify-between ${SUBJECT_COLORS[cellData.subject] || 'bg-gray-100 text-gray-800'} border shadow-sm`}>
                                                        <span className="font-extrabold text-xs line-clamp-2">{cellData.subject}</span>
                                                        <div className="flex items-center gap-1 mt-2 text-[10px] font-bold opacity-80">
                                                            <UserIcon className="w-3 h-3" />
                                                            <span className="truncate">{cellData.teacher}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                        <PlusIcon className="w-6 h-6 text-gray-300" />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                            <CalendarIcon className="w-10 h-10 text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-600">No Class Selected</h3>
                        <p className="mt-2 max-w-md text-center">Select classes from the dropdown above to start creating your timetable.</p>
                    </div>
                )}
            </main>

            {/* EDIT CELL POPUP (Simple MVP) */}
            {/* EDIT CELL POPUP */}
            {editingCell && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-96 transform scale-100 transition-all">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-900">
                                Edit {editingCell.day} - {PERIODS[editingCell.periodIndex]?.name}
                            </h3>
                            <button onClick={() => setEditingCell(null)} className="p-2 hover:bg-gray-100 rounded-full">
                                <XIcon className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Subject</label>
                                <select
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={popupSubject}
                                    onChange={(e) => setPopupSubject(e.target.value)}
                                >
                                    <option value="">Select Subject...</option>
                                    {subjectsList.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Teacher</label>
                                <select
                                    className={`w-full p-3 bg-gray-50 border rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${conflictStatus ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                                    value={popupTeacher}
                                    onChange={(e) => handleTeacherChange(e.target.value)}
                                >
                                    <option value="">Select Teacher...</option>
                                    {allTeachers.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                                </select>
                                {isCheckingConflict && <p className="text-xs text-indigo-500 mt-1 animate-pulse">Checking availability...</p>}
                                {conflictStatus && (
                                    <div className="flex items-start gap-2 mt-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">
                                        <ExclamationIcon className="w-4 h-4 shrink-0" />
                                        <span>{conflictStatus}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-8 flex gap-3">
                            <button
                                onClick={handleCellClear}
                                className="mr-auto py-3 px-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors"
                                title="Clear Slot"
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                            <button onClick={() => setEditingCell(null)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleCellUpdate}
                                disabled={!popupSubject || !popupTeacher}
                                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default TimetableCreator;
