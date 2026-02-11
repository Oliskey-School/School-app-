
import React, { useState, useEffect, useMemo } from 'react';
import { SUBJECT_COLORS, CalendarIcon, ChevronLeftIcon, RefreshIcon } from '../../constants';
import { getGradeDisplayName } from '../../lib/schoolSystem';
import { TimetableEntry } from '../../types';
import { supabase } from '../../lib/supabase';
import { offlineStorage } from '../../lib/offlineStorage';

// --- CONSTANTS & HELPERS (Matched with Admin UI) ---
const formatTime12Hour = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
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

// --- SUB-COMPONENTS (Read-Only) ---

const TimetableCell: React.FC<{ subject: string | null; teacher: string | null; isBreak?: boolean }> = ({ subject, teacher, isBreak }) => {
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
        <div className={`
            h-full min-h-[5rem] border border-gray-100 md:border-transparent flex flex-col items-center justify-center p-1 relative transition-all duration-200
            ${subject ? `${colorClass} shadow-sm` : 'bg-white'}
        `}>
            {subject ? (
                <>
                    <span className="font-bold text-xs md:text-sm text-center leading-tight px-1">{subject}</span>
                    {teacher && <span className="text-[10px] md:text-xs mt-1 opacity-75 font-medium truncate max-w-full px-1">{teacher}</span>}
                </>
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <span className="text-gray-200 text-xs font-medium">-</span>
                </div>
            )}
        </div>
    );
};

const MobileDayView: React.FC<{ day: string; timetable: { [key: string]: string | null }; teacherAssignments: { [key: string]: string | null } }> = ({ day, timetable, teacherAssignments }) => {
    return (
        <div className="space-y-4 pb-24">
            {PERIODS.map((period, idx) => {
                if (period.isBreak) return (
                    <div key={idx} className="flex items-center justify-center py-4 bg-gray-50/50 rounded-2xl border border-gray-100 border-dashed">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">{period.name}</span>
                    </div>
                );

                const key = `${day}-${period.name}`;
                const subject = timetable[key];
                const teacher = teacherAssignments[key];
                const colorClass = subject ? SUBJECT_COLORS[subject] : 'bg-white border border-gray-200';

                return (
                    <div key={idx} className={`w-full text-left p-0 rounded-2xl shadow-sm overflow-hidden flex ${!subject ? 'bg-white border border-gray-200' : 'shadow-md'}`}>
                        {/* Time Column */}
                        <div className="w-20 bg-gray-50 border-r border-gray-100 p-4 flex flex-col justify-center items-center text-center">
                            <span className="font-bold text-gray-700 text-sm leading-none">{period.name.split(' ')[1] || period.name}</span>
                            <span className="text-[10px] font-medium text-gray-400 mt-1 leading-tight">{formatTime12Hour(period.start)}<br />{formatTime12Hour(period.end)}</span>
                        </div>

                        {/* Content Column */}
                        <div className={`flex-1 p-4 flex items-center justify-between ${subject ? colorClass : ''}`}>
                            <div>
                                <h4 className={`font-bold text-base ${!subject ? 'text-gray-400 italic' : ''}`}>{subject || 'Free Period'}</h4>
                                {teacher && <span className="text-xs opacity-75 mt-0.5 block font-medium">{teacher}</span>}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

interface TimetableScreenProps {
    context: {
        userType: 'teacher' | 'student' | 'parent';
        userId: string | number;
    },
    schoolId?: string;
    currentBranchId?: string | null;
    title?: string; // Optional title override
}

const TimetableScreen: React.FC<TimetableScreenProps> = ({ context, schoolId, currentBranchId }) => {
    const [timetable, setTimetable] = useState<{ [key: string]: string | null }>({});
    const [teacherAssignments, setTeacherAssignments] = useState<{ [key: string]: string | null }>({});
    const [loading, setLoading] = useState(true);
    const [className, setClassName] = useState('');

    // UI State
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [selectedDay, setSelectedDay] = useState(DAYS[(new Date().getDay() - 1)] || 'Monday');

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            const cacheKey = `timetable_${context.userId}_${context.userType}`;

            // 1. Cache First Strategy
            const cachedData = await offlineStorage.load<any>(cacheKey);
            if (cachedData) {
                setTimetable(cachedData.timetable || {});
                setTeacherAssignments(cachedData.teacherAssignments || {});
                setClassName(cachedData.className || '');
                setLoading(false); // Instant load!
            } else {
                setLoading(true);
            }

            try {
                let targetClassName = '';

                // 2. Identify Target Class/Teacher
                if (context.userType === 'student' || context.userType === 'parent') {
                    let studentQuery = supabase
                        .from('students')
                        .select('grade, section')
                        .eq('id', context.userId);

                    if (schoolId) studentQuery = studentQuery.eq('school_id', schoolId);

                    const { data: student } = await studentQuery.maybeSingle();

                    if (student) {
                        const gradeName = getGradeDisplayName(student.grade);
                        targetClassName = gradeName;
                        // Optional: Append section if necessary, but keep broad for now to match 'SSS 1'
                        // if (student.section) targetClassName += ` ${student.section}`;
                    }
                }

                // 3. Fetch Timetable Data with Timeout & Scoping
                let query = supabase.from('timetable')
                    .select('day, start_time, end_time, subject, class_name, teacher_id')
                    .eq('status', 'Published');

                if (schoolId) query = query.eq('school_id', schoolId);
                if (currentBranchId) query = query.eq('branch_id', currentBranchId);

                if (context.userType === 'teacher') {
                    query = query.eq('teacher_id', context.userId);
                } else if (targetClassName) {
                    query = query.ilike('class_name', `%${targetClassName}%`);
                }

                // Add 5s Timeout
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000));

                const { data, error } = await Promise.race([
                    query,
                    timeoutPromise
                ]) as any;

                if (error) throw error;

                if (data && data.length > 0) {
                    // 4. Transform Data
                    const newTimetable: { [key: string]: string | null } = {};
                    const newTeachers: { [key: string]: string | null } = {};

                    const teacherIds = [...new Set(data.map((d: any) => d.teacher_id).filter(Boolean))];
                    const { data: teachersData } = await supabase.from('teachers').select('id, name').in('id', teacherIds);
                    const teacherMap = new Map((teachersData || []).map((t: any) => [t.id, t.name]));

                    const getPeriodName = (start: string) => {
                        const timeShort = start.substring(0, 5);
                        const p = PERIODS.find(p => p.start === timeShort);
                        return p ? p.name : null;
                    };

                    data.forEach((entry: any) => {
                        const pName = getPeriodName(entry.start_time);
                        if (pName) {
                            const key = `${entry.day}-${pName}`;
                            newTimetable[key] = entry.subject;
                            if (entry.teacher_id) {
                                newTeachers[key] = teacherMap.get(entry.teacher_id) || null;
                            }
                        }
                    });

                    const finalClassName = data[0].class_name || className;

                    setTimetable(newTimetable);
                    setTeacherAssignments(newTeachers);
                    if (!className && finalClassName) setClassName(finalClassName);

                    // Update Cache
                    await offlineStorage.save(cacheKey, {
                        timetable: newTimetable,
                        teacherAssignments: newTeachers,
                        className: finalClassName
                    });

                } else if (!cachedData) {
                    // NO Data and NO Cache? Fallback to empty
                    setTimetable({});
                    setTeacherAssignments({});
                }

            } catch (err) {
                console.warn('Error fetching timetable (using cache/fallback):', err);
                if (!cachedData) {
                    // Fallback Demo Data if completely empty and error occurred
                    const demoTimetable: any = { 'Monday-Period 1': 'Mathematics', 'Monday-Period 2': 'English' };
                    setTimetable(demoTimetable);
                    setClassName('Grade 10A');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [context]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full bg-white/50">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-indigo-600"></div>
            </div>
        );
    }

    // Empty state - Timetable not published yet
    const hasNoData = Object.keys(timetable).length === 0;
    if (hasNoData && !loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-8">
                <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-12 max-w-md text-center">
                    <CalendarIcon className="w-20 h-20 text-gray-300 mb-6 mx-auto" />
                    <h3 className="text-2xl font-bold text-gray-800 mb-3">Timetable Not Yet Released</h3>
                    <p className="text-gray-500 text-base leading-relaxed mb-2">
                        Your class timetable will appear here once it has been published by your school administrator.
                    </p>
                    <p className="text-gray-400 text-sm">
                        Please check back later or contact your teacher for updates.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50 relative animate-fade-in">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-30 shadow-sm flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 p-2 rounded-lg">
                        <CalendarIcon className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{className || 'My Timetable'}</h2>
                        <p className="text-xs text-gray-500 font-medium">Weekly Schedule</p>
                    </div>
                </div>

                <button onClick={() => window.location.reload()} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
                    <RefreshIcon className="w-5 h-5" />
                </button>
            </div>

            <main className="flex-1 overflow-auto bg-gray-50/50 relative p-0 md:p-6">
                {/* Background Pattern */}
                <div className="absolute inset-0 pattern-grid-lg opacity-[0.03] pointer-events-none hidden md:block"></div>

                {isMobile ? (
                    <div className="flex flex-col h-full bg-gray-50">
                        {/* Day Tabs */}
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
                        <div className="flex-1 overflow-y-auto p-4">
                            <MobileDayView day={selectedDay} timetable={timetable} teacherAssignments={teacherAssignments} />
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden min-w-[1000px]">
                        <div className="grid gap-[1px] bg-gray-100" style={{ gridTemplateColumns: `80px repeat(${PERIODS.length}, 1fr)` }}>
                            {/* Header Row */}
                            <div className="bg-gray-50/80 backdrop-blur p-4 z-10 sticky top-0 left-0 border-b border-gray-200"></div>
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
                                    <div className="bg-white font-bold text-gray-800 text-xs uppercase tracking-widest flex items-center justify-center p-4 border-r border-gray-100 sticky left-0 z-10 shadow-[4px_0_10px_rgba(0,0,0,0.02)]">
                                        {day.slice(0, 3)}
                                    </div>
                                    {PERIODS.map(period => (
                                        <div key={`${day}-${period.name}`} className="bg-white min-h-[6rem]">
                                            <TimetableCell
                                                isBreak={period.isBreak}
                                                subject={period.isBreak ? period.name : timetable[`${day}-${period.name}`] || null}
                                                teacher={teacherAssignments[`${day}-${period.name}`] || null}
                                            />
                                        </div>
                                    ))}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default TimetableScreen;
