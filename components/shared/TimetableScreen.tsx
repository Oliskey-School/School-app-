
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAutoSync } from '../../hooks/useAutoSync';
import { DEFAULT_AVATAR } from '../../lib/avatar';
import { SUBJECT_COLORS, CalendarIcon, ChevronLeftIcon, RefreshIcon, THEME_CONFIG } from '../../constants';
import { getGradeDisplayName } from '../../lib/schoolSystem';
import { TimetableEntry, DashboardType } from '../../types';
import { offlineStorage } from '../../lib/offlineStorage';
import { api } from '../../lib/api';
import { loadSchedule, loadDaySchedule, dayName, PeriodDef } from '../../lib/timetableSchedule';

const DEPARTMENTS = ['Science', 'Art', 'Commercial'];

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

// Period structure comes from the SHARED schedule (set by the admin in the
// Timetable Builder) so students/teachers/parents see the published times.

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// --- SUB-COMPONENTS (Read-Only) ---

const TimetableCell: React.FC<{ subject: string | null; teacher: string | null; isBreak?: boolean }> = ({ subject, teacher, isBreak }) => {
    if (isBreak) {
        return (
            <div className="h-full min-h-[5rem] bg-gray-100/50 flex items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 pattern-diagonal-lines opacity-10"></div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest -rotate-90 md:rotate-0 whitespace-nowrap z-10">{subject}</span>
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
                    {teacher && <span className="text-xs mt-1 opacity-75 font-medium truncate max-w-full px-1">{teacher}</span>}
                </>
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <span className="text-gray-200 text-xs font-medium">-</span>
                </div>
            )}
        </div>
    );
};

const MobileDayView: React.FC<{ day: string; periods: PeriodDef[]; timetable: { [key: string]: string | null }; teacherAssignments: { [key: string]: string | null } }> = ({ day, periods, timetable, teacherAssignments }) => {
    return (
        <div className="space-y-4 pb-24">
            {periods.map((period, idx) => {
                if (period.isBreak) return (
                    <div key={idx} className="flex items-center justify-center py-4 bg-gray-50/50 rounded-2xl border border-gray-100 border-dashed">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">{period.name}</span>
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
    students?: any[];
    student?: any;
    schoolId?: string;
    currentBranchId?: string | null;
    title?: string; // Optional title override
}

const TimetableScreen: React.FC<TimetableScreenProps> = ({ context, schoolId, currentBranchId, students, student }) => {
    const [timetable, setTimetable] = useState<{ [key: string]: string | null }>({});
    const [teacherAssignments, setTeacherAssignments] = useState<{ [key: string]: string | null }>({});
    const [loading, setLoading] = useState(true);
    const [className, setClassName] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<any>(null);

    // UI State
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [selectedDay, setSelectedDay] = useState(DAYS[(new Date().getDay() - 1)] || 'Monday');

    // Period structure from the shared schedule (published by the admin). The
    // selected day may have its own custom times.
    const periods = useMemo(() => loadSchedule(schoolId), [schoolId]);
    const dayPeriods = useMemo(() => loadDaySchedule(schoolId, selectedDay), [schoolId, selectedDay]);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (context?.userType === 'parent' && students && students.length > 0 && !selectedStudent) {
            setSelectedStudent(students[0]);
        }
    }, [students, context?.userType]);

    const fetchData = useCallback(async () => {
        if (!context) return;
        if (context.userType === 'student' && !student) return;
        if (context.userType === 'parent' && !selectedStudent) return;
        const studentIdContext = context.userType === 'parent' && selectedStudent ? selectedStudent.id : context.userId;
        const cacheKey = `timetable_${studentIdContext}_${context.userType}`;

        // 1. Cache First Strategy
        const cachedData = await offlineStorage.load<any>(cacheKey);
        if (cachedData) {
            setTimetable(cachedData.timetable || {});
            setTeacherAssignments(cachedData.teacherAssignments || {});
            setClassName(cachedData.className || '');
            setLoading(false);
        } else {
            setLoading(true);
        }

        try {
            let targetClassName = '';
            let targetTeacherId = '';
            // Student's department for filtering departmental (SSS) periods to the right subject.
            let resolvedStudentDept: string | null = null;

            // Resolve a student's REAL class name from their actual class record
            // (match grade + section), since the timetable is stored by the class
            // name the admin typed — which may not equal getGradeDisplayName(grade).
            const resolveClassName = async (sid: string | undefined, grade: any, section: any): Promise<string> => {
                try {
                    const classes = await api.getClasses(sid, currentBranchId || undefined);
                    const list = Array.isArray(classes) ? classes : [];
                    const match = list.find(c => Number(c.grade) === Number(grade) && String(c.section || '') === String(section || ''))
                        || list.find(c => Number(c.grade) === Number(grade));
                    if (match?.name) return match.name;
                } catch { /* fall back below */ }
                return getGradeDisplayName(grade);
            };

            // 2. Identify Target Class/Teacher
            if (context.userType === 'student') {
                const studentProfile = await api.getMyStudentProfile();
                if (studentProfile) {
                    targetClassName = await resolveClassName(studentProfile.school_id || schoolId, studentProfile.grade, studentProfile.section);
                    resolvedStudentDept = studentProfile.department || null;
                }
            } else if (context.userType === 'parent' && selectedStudent) {
                targetClassName = await resolveClassName(selectedStudent.school_id || schoolId, selectedStudent.grade, selectedStudent.section);
            } else if (context.userType === 'teacher') {
                targetTeacherId = String(context.userId);
            }

            // 3. Fetch Timetable Data via Central API
            const data = await api.getTimetable(
                currentBranchId || undefined,
                targetClassName,
                targetTeacherId
            );

            if (data && data.length > 0) {
                // 4. Transform Data — map each saved row to its day + teaching period
                //    by ORDER (robust to exact times), via the shared schedule. Tag
                //    department rows (SSS Science/Art/Commercial) into one cell.
                const newTimetable: { [key: string]: string | null } = {};
                const newTeachers: { [key: string]: string | null } = {};

                const schedule = loadSchedule(schoolId);
                const teaching = schedule.filter(p => !p.isBreak);
                const byDay: { [d: string]: { [st: string]: any[] } } = {};
                data.forEach((e: any) => {
                    const d = e.day_of_week ? dayName(Number(e.day_of_week)) : (e.day || 'Monday');
                    const st = (e.start_time || '').slice(0, 5);
                    byDay[d] = byDay[d] || {};
                    byDay[d][st] = byDay[d][st] || [];
                    byDay[d][st].push(e);
                });
                Object.keys(byDay).forEach((d) => {
                    const times = Object.keys(byDay[d]).sort();
                    times.forEach((st, order) => {
                        if (order >= teaching.length) return;
                        const key = `${d}-${teaching[order].name}`;
                        const rows = byDay[d][st];
                        const teacherName = (r: any) => r.teacher?.full_name || r.teacher?.name || r.teacher_name || null;
                        const deptRows = rows.filter(r => DEPARTMENTS.includes(r.notes));
                        if (deptRows.length > 0) {
                            // For students: show only their department's subject (or first if unknown).
                            // For teachers: show all departments so they see the full picture.
                            // For admins/parents: show all departments.
                            const isStudentView = context.userType === 'student';
                            if (isStudentView) {
                                const match = resolvedStudentDept
                                    ? deptRows.find(r => r.notes === resolvedStudentDept) || deptRows[0]
                                    : deptRows[0];
                                newTimetable[key] = match.subject;
                                newTeachers[key] = teacherName(match);
                            } else {
                                newTimetable[key] = deptRows.map(r => `${r.notes}: ${r.subject}`).join(' · ');
                                newTeachers[key] = null;
                            }
                        } else {
                            const entry = rows[rows.length - 1];
                            newTimetable[key] = entry.subject;
                            // For teacher view: show which class this period belongs to
                            // so they can distinguish SSS 2 vs SSS 3 for the same subject.
                            newTeachers[key] = context.userType === 'teacher'
                                ? (entry.class_name || entry.class?.name || null)
                                : teacherName(entry);
                        }
                    });
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
                setTimetable({});
                setTeacherAssignments({});
            }

        } catch (err) {
            console.warn('Error fetching timetable:', err);
        } finally {
            setLoading(false);
        }
    }, [context.userId, context.userType, schoolId, currentBranchId, selectedStudent?.id, className]);

    // Real-time synchronization
    useAutoSync(['timetables'], fetchData);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const theme = useMemo(() => {
        const roleMap: Record<string, DashboardType> = {
            teacher: DashboardType.Teacher,
            student: DashboardType.Student,
            parent: DashboardType.Parent
        };
        const role = roleMap[context?.userType] || DashboardType.Student;
        return THEME_CONFIG[role];
    }, [context?.userType]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full bg-white/50">
                <div className={`animate-spin rounded-full h-10 w-10 border-4 border-gray-200 ${((theme as any).accentColor || theme.iconColor || 'text-gray-400').replace('text-', 'border-t-')}`}></div>
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
                    <div className={`${((theme as any).bgColor ? (theme as any).bgColor.replace('bg-', 'bg-').replace('600', '100') : (theme.activeNav?.split(' ')[0] || 'bg-gray-100'))} p-2 rounded-lg`}>
                        <CalendarIcon className={`w-6 h-6 ${theme.iconColor}`} />
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

                {/* Child Switcher for Parents */}
                {context.userType === 'parent' && students && students.length > 1 && (
                    <div className="flex space-x-3 overflow-x-auto p-4 bg-white border-b border-gray-200 scrollbar-hide mb-4 shadow-sm">
                        {students.map(s => (
                            <button
                                key={s.id}
                                onClick={() => setSelectedStudent(s)}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-xl border-2 transition-all flex-shrink-0 ${selectedStudent?.id === s.id ? `${theme.mainBg} text-white border-transparent shadow-sm` : 'bg-white text-gray-700 border-gray-100 hover:border-indigo-300'
                                    }`}
                            >
                                <img src={s.avatarUrl || DEFAULT_AVATAR} className="w-6 h-6 rounded-full" alt={s.name} />
                                <span className="font-semibold text-sm">{s.name}</span>
                            </button>
                        ))}
                    </div>
                )}

                {isMobile ? (
                    <div className="flex flex-col h-full bg-gray-50">
                        {/* Day Tabs */}
                        <div className="flex overflow-x-auto p-4 space-x-3 bg-white border-b border-gray-200 snap-x sticky top-0 z-20 shadow-sm no-scrollbar">
                            {DAYS.map(day => (
                                <button
                                    key={day}
                                    onClick={() => setSelectedDay(day)}
                                    className={`flex-shrink-0 snap-start px-5 py-2.5 rounded-full font-bold text-sm transition-all border ${selectedDay === day ? `${theme.mainBg} border-transparent text-white shadow-md` : 'bg-white border-gray-200 text-gray-500'}`}
                                >
                                    {day.slice(0, 3)}
                                </button>
                            ))}
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            <MobileDayView day={selectedDay} periods={periods} timetable={timetable} teacherAssignments={teacherAssignments} />
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                    <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden min-w-[1000px]">
                        <div className="grid gap-[1px] bg-gray-100" style={{ gridTemplateColumns: `80px repeat(${periods.length}, 1fr)` }}>
                            {/* Header Row */}
                            <div className="bg-gray-50/80 backdrop-blur p-4 z-10 sticky top-0 left-0 border-b border-gray-200"></div>
                            {periods.map(period => (
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
                                    {periods.map(period => (
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
                    </div>
                )}
            </main>
        </div>
    );
};

export default TimetableScreen;
