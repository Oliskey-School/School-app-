import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  BookOpenIcon,
  ChevronRightIcon,
  ViewGridIcon,
  TeacherAttendanceIcon,
  ClipboardListIcon,
  BriefcaseIcon,
  SparklesIcon,
  CalendarPlusIcon,
  VideoIcon,
  CheckCircleIcon,
  EditIcon,
  CalculatorIcon,
  ChartBarIcon,
  SUBJECT_COLORS,
  UserGroupIcon,
  getFormattedClassName
} from '../../constants';
import { DashboardType } from '../../types';
import { THEME_CONFIG } from '../../constants';
import { useTeacherStats } from '../../hooks/useTeacherStats';
import EmailVerificationPrompt from '../auth/EmailVerificationPrompt';
import { useTeacherClasses } from '../../hooks/useTeacherClasses';
import { useAutoSync } from '../../hooks/useAutoSync';
import { api } from '../../lib/api';
import { loadSchedule } from '../../lib/timetableSchedule';

interface TeacherOverviewProps {
  navigateTo: (view: string, title: string, props?: any) => void;
  currentUser?: any;
  profile?: any;
  teacherProfile?: any;
  teacherId?: string | null;
  schoolId: string;
  currentBranchId: string | null;
}

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactElement<{ className?: string }>; }> = ({ label, value, icon }) => {
  const theme = THEME_CONFIG[DashboardType.Teacher];
  return (
    <div className={`${theme.cardBg} p-3 sm:p-4 rounded-xl flex items-center space-x-3`}>
      <div className={`${theme.cardIconBg} p-1.5 sm:p-2 rounded-full flex-shrink-0`}>
        {React.cloneElement(icon, { className: `h-5 w-5 sm:h-6 sm:w-6 ${theme.iconColor}` })}
      </div>
      <div className="min-w-0">
        <p className={`text-xl sm:text-2xl font-bold ${theme.textColor} truncate`}>{value}</p>
        <p className="text-xs sm:text-sm text-gray-600 truncate">{label}</p>
      </div>
    </div>
  );
};

const parseClassName = (name: string) => {
  const clean = name.trim();
  let grade = 0;
  let section = '';
  const standardMatch = clean.match(/^(?:Grade|Year)?\s*(\d+)\s*(.*)$/i);
  const jsMatch = clean.match(/^JSS\s*(\d+)\s*(.*)$/i);
  const ssMatch = clean.match(/^S{2,3}\s*(\d+)\s*(.*)$/i);
  const primaryMatch = clean.match(/^Primary\s*(\d+)\s*(.*)$/i);

  if (standardMatch) {
    grade = parseInt(standardMatch[1]);
    section = standardMatch[2];
  } else if (jsMatch) {
    grade = 6 + parseInt(jsMatch[1]);
    section = jsMatch[2];
  } else if (ssMatch) {
    grade = 9 + parseInt(ssMatch[1]);
    section = ssMatch[2];
  } else if (primaryMatch) {
    grade = parseInt(primaryMatch[1]);
    section = primaryMatch[2];
  }
  section = section.replace(/^[-–]\s*/, '').trim();
  return { grade, section };
};

const TeacherOverview: React.FC<TeacherOverviewProps> = ({ navigateTo, currentUser, profile, teacherProfile, teacherId, schoolId, currentBranchId }) => {
  const theme = THEME_CONFIG[DashboardType.Teacher];

  const { classes: teacherClasses, loading: classesLoading, teacherId: resolvedTeacherId, schoolId: resolvedSchoolId } = useTeacherClasses(teacherId);
  const { stats, loading: statsLoading } = useTeacherStats(resolvedTeacherId || teacherId || currentUser?.id, resolvedSchoolId || schoolId, currentBranchId, teacherClasses);

  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [ungradedAssignments, setUngradedAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const forceUpdate = () => setVersion(v => v + 1);

  // Live clock — refreshes every minute so the schedule reacts to time changes
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

    useEffect(() => {
        const fetchData = async () => {
            const actualTeacherId = resolvedTeacherId || teacherId;
            const actualSchoolId = resolvedSchoolId || schoolId;

            if (!actualSchoolId || !actualTeacherId) return;

            try {
                setLoading(true);
                const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
                const [scheduleRes, assignmentsRes] = await Promise.all([
                    api.getTimetable(
                        currentBranchId && currentBranchId !== 'all' ? currentBranchId : undefined,
                        undefined, 
                        actualTeacherId
                    ),
                    api.getAssignments(actualSchoolId, {
                        teacherId: actualTeacherId,
                        branchId: currentBranchId && currentBranchId !== 'all' ? currentBranchId : undefined
                    })
                ]);

                // "Today's Schedule" = only the lessons assigned to THIS teacher for
                // the current weekday. getTimetable returns the teacher's whole week, so
                // filter to today's day (1=Mon..7=Sun), drop duplicate rows, and sort by time.
                const todayNum = (() => { const d = new Date().getDay(); return d === 0 ? 7 : d; })();
                const seen = new Set<string>();
                const todays = (Array.isArray(scheduleRes) ? scheduleRes : [])
                    .filter((e: any) => Number(e.day_of_week) === todayNum)
                    .filter((e: any) => {
                        const k = `${e.class_id || e.class_name}|${e.start_time}|${e.subject}|${e.notes || ''}`;
                        if (seen.has(k)) return false;
                        seen.add(k);
                        return true;
                    })
                    .sort((a: any, b: any) => String(a.start_time || '').localeCompare(String(b.start_time || '')));

                // Remap stored start/end times to the actual period times from
                // the shared schedule — same order-based mapping used by the
                // full timetable view so both show identical period times.
                const schedule = loadSchedule(actualSchoolId);
                const teaching = schedule.filter((p: any) => !p.isBreak);
                const remapped = todays.map((entry: any, i: number) => {
                    const period = teaching[i];
                    return period ? { ...entry, start_time: period.start, end_time: period.end } : entry;
                });
                setTodaySchedule(remapped);
                setUngradedAssignments((assignmentsRes || []).slice(0, 3));
            } catch (err) {
                console.error('❌ Error fetching overview data:', err);
            } finally {
                setLoading(false);
            }
        };

        if (!classesLoading && resolvedTeacherId) {
            fetchData();
        }
    }, [resolvedTeacherId, resolvedSchoolId, classesLoading, currentBranchId]);

    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    useAutoSync(
      ['assignments', 'timetable', 'students', 'teachers', 'classes', 'teacher_classes', 'class_teachers', 'report_cards'],
      () => {
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
        }
        syncTimeoutRef.current = setTimeout(() => {
          forceUpdate();
          syncTimeoutRef.current = null;
        }, 2000);
      }
    );

  const formatTime12Hour = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${minutes} ${ampm}`;
  };

  // "08:45" → 525 (minutes since midnight)
  const timeToMins = (t: string) => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
  };

  // Recomputes every minute via the `now` dependency
  const scheduleStatus = useMemo(() => {
    const day = now.getDay(); // 0=Sun, 6=Sat
    if (day === 0 || day === 6) return { type: 'weekend' as const };
    if (todaySchedule.length === 0) return { type: 'no_classes' as const };

    const nowMins = now.getHours() * 60 + now.getMinutes();
    const first = todaySchedule[0];
    const last  = todaySchedule[todaySchedule.length - 1];

    // Before the first lesson of the day
    if (nowMins < timeToMins(first.start_time)) {
      return { type: 'before_school' as const, next: first };
    }

    // After school ends (last lesson's end_time, or +45 min from start if missing)
    const lastEnd = timeToMins(last.end_time || '') || timeToMins(last.start_time) + 45;
    if (nowMins >= lastEnd) return { type: 'after_school' as const };

    // Walk the periods to find current / break / next
    for (let i = 0; i < todaySchedule.length; i++) {
      const e = todaySchedule[i];
      const start = timeToMins(e.start_time);
      const end   = timeToMins(e.end_time || '') || start + 45;

      if (nowMins >= start && nowMins < end) {
        return { type: 'in_class' as const, current: e, currentIdx: i };
      }
      if (i < todaySchedule.length - 1) {
        const next = todaySchedule[i + 1];
        const nextStart = timeToMins(next.start_time);
        if (nowMins >= end && nowMins < nextStart) {
          return { type: 'break' as const, next };
        }
      }
    }
    return { type: 'after_school' as const };
  }, [now, todaySchedule]);

  const quickActions = [
    { label: "Add Student", icon: <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>, action: () => navigateTo('addStudent', 'Add Student', { schoolId }) },
    { label: "My Attendance", icon: <CheckCircleIcon className="h-7 w-7" />, action: () => navigateTo('teacherSelfAttendance', 'My Attendance', { teacherId }) },
    { label: "Attendance", icon: <TeacherAttendanceIcon className="h-7 w-7" />, action: () => navigateTo('selectClassForAttendance', 'Select Class', { teacherId, schoolId }) },
    { label: "Assessments", icon: <ClipboardListIcon className="h-7 w-7" />, action: () => navigateTo('assessmentsHub', 'Assessments & Quizzes', { teacherId, branchId: currentBranchId }) },
    { label: "Lesson Notes", icon: <BookOpenIcon className="h-7 w-7" />, action: () => navigateTo('lessonNotesUpload', 'Upload Lesson Notes', { teacherId }) },
    { label: "Resources", icon: <BriefcaseIcon className="h-7 w-7" />, action: () => navigateTo('resources', 'Resource Hub', { schoolId }) },
    { label: "Appointments", icon: <CalendarPlusIcon className="h-7 w-7" />, action: () => navigateTo('appointments', 'Appointments', { teacherId }) },
    { label: "Virtual Class", icon: <VideoIcon className="h-7 w-7" />, action: () => navigateTo('virtualClass', 'Virtual Classroom', { teacherId, schoolId }) },
    { label: "AI Planner", icon: <SparklesIcon className="h-7 w-7" />, action: () => navigateTo('lessonPlanner', 'AI Lesson Planner', { teacherId }) },
    { label: "Gradebook", icon: <CalculatorIcon className="h-7 w-7" />, action: () => navigateTo('classGradebook', 'Class Gradebook', { teacherId }) },
    { label: "Exams", icon: <ClipboardListIcon className="h-7 w-7" />, action: () => navigateTo('examManagement', 'Manage Exams', { schoolId, teacherId, branchId: currentBranchId }) },
    { label: "Forum", icon: <UserGroupIcon className="h-7 w-7" />, action: () => navigateTo('collaborationForum', 'Teacher Forum', { schoolId }) },
    { label: "Reports", icon: <BookOpenIcon className="h-7 w-7" />, action: () => navigateTo('reports', 'Student Reports', { teacherId, schoolId }) },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6 bg-gray-50">
      {!currentUser?.user_metadata?.email_verified && <EmailVerificationPrompt />}
      <div className={`p-5 rounded-2xl text-white shadow-lg ${theme.mainBg}`}>
        <h3 className="text-2xl font-bold">Welcome, {teacherProfile?.name || 'Teacher'}!</h3>
        <p className="text-sm opacity-90 mt-1">Ready to inspire today?</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Total Students" value={statsLoading ? '...' : stats.totalStudents} icon={<BriefcaseIcon />} />
        <StatCard label="Total Assigned Classes" value={statsLoading ? '...' : stats.totalClasses} icon={<ViewGridIcon />} />
      </div>

      <div>
        <div className="flex overflow-x-auto pb-2 gap-3 no-scrollbar">
          {classesLoading ? (
            Array(2).fill(0).map((_, i) => (
              <div key={i} className="min-w-[160px] bg-white p-4 rounded-2xl shadow-sm animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
              </div>
            ))
          ) : teacherClasses.length > 0 ? (
            teacherClasses.map((c, i) => (
              <button
                key={i}
                onClick={() => navigateTo('classDetail', c.name || getFormattedClassName(c.grade, c.section, true, c.subject), {
                  classInfo: { ...c, schoolId, branchId: currentBranchId }
                })}
                className="min-w-[180px] bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-all text-left border border-purple-100 hover:border-purple-300 group"
              >
                <div className="flex justify-between items-start mb-1">
                  <p className="font-bold text-gray-800 text-base">{c.name || getFormattedClassName(c.grade, c.section)}</p>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className={`w-2 h-2 rounded-full ${SUBJECT_COLORS[c.subject] || 'bg-purple-400'}`}></div>
                  <p className="text-xs font-semibold text-purple-600 truncate">{c.subject}</p>
                </div>
              </button>
            ))
          ) : (
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-dashed border-gray-300 w-full text-center text-gray-500 text-sm">
              No classes assigned yet.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex justify-between items-end mb-2 px-1">
              <h3 className="text-lg font-bold text-gray-800">Recent Assignments</h3>
              {ungradedAssignments.length > 1 && (
                <button onClick={() => navigateTo('assignmentsList', 'Manage Assignments', {})} className="text-sm font-bold text-purple-600 hover:text-purple-800">
                  See more
                </button>
              )}
            </div>
            <div className="space-y-3">
              {loading ? (
                <div className="w-full bg-white p-3 rounded-xl shadow-sm animate-pulse flex justify-between items-center">
                  <div className="space-y-2 w-1/2">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-12"></div>
                </div>
              ) : ungradedAssignments.length > 0 ? ungradedAssignments.slice(0, 1).map(a => (
                <button key={a.id} onClick={() => navigateTo('assignmentSubmissions', `Submissions: ${a.title}`, {
                  assignment: a, schoolId, teacherId, branchId: currentBranchId
                })} className="w-full text-left bg-white p-3 rounded-xl shadow-sm hover:bg-purple-50 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-gray-800">{a.title}</p>
                    <p className="text-sm text-gray-500">{a.class_name}</p>
                  </div>
                  <div className="flex items-center space-x-2 text-purple-600 font-semibold">
                    <span>View</span>
                    <ChevronRightIcon className="w-5 h-5" />
                  </div>
                </button>
              )) : <div className="bg-white p-4 rounded-xl shadow-sm text-center text-gray-500">No pending tasks. Great job!</div>}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-2 px-1">Quick Actions</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3">
              {quickActions.map(action => (
                <button key={action.label} onClick={action.action} className={`${theme.cardBg} p-2 sm:p-3 rounded-xl shadow-sm flex flex-col items-center justify-center space-y-1 sm:space-y-2 hover:bg-purple-200 transition-colors`}>
                  <div className={`${theme.iconColor} flex-shrink-0`}>{React.cloneElement(action.icon as React.ReactElement, { className: "h-6 w-6 sm:h-7 sm:w-7" })}</div>
                  <span className={`font-semibold ${theme.textColor} text-center text-xs leading-tight`}>{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-2 px-1">Today's Schedule</h3>
            {loading ? (
              <div className="space-y-3">
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center space-x-3 p-3 bg-white rounded-xl shadow-sm animate-pulse">
                    <div className="w-16 h-4 bg-gray-200 rounded"></div>
                    <div className="w-1 h-10 rounded-full bg-gray-200"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : scheduleStatus.type === 'weekend' ? (
              <div className="bg-white p-4 rounded-xl shadow-sm text-center">
                <p className="text-2xl mb-1">🎉</p>
                <p className="font-bold text-gray-700">It's the Weekend!</p>
                <p className="text-xs text-gray-500 mt-1">No classes today. Enjoy your rest.</p>
              </div>
            ) : todaySchedule.length === 0 ? (
              <div className="bg-white p-4 rounded-xl shadow-sm text-center text-gray-500">
                No classes scheduled for today.
              </div>
            ) : (
              <div className="space-y-3">

                {/* ── Real-time status banner ── */}
                {scheduleStatus.type === 'before_school' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-0.5">Before School</p>
                    <p className="text-sm font-semibold text-blue-800">
                      First class at {formatTime12Hour((scheduleStatus as any).next.start_time)}
                    </p>
                    <p className="text-xs text-blue-600">{(scheduleStatus as any).next.subject} — {(scheduleStatus as any).next.class_name}</p>
                  </div>
                )}
                {scheduleStatus.type === 'in_class' && (
                  <div className="bg-green-50 border-2 border-green-300 rounded-xl p-3 flex items-start gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-0.5">In Class Now</p>
                      <p className="text-sm font-bold text-green-900">{(scheduleStatus as any).current.subject}</p>
                      <p className="text-xs text-green-700">{(scheduleStatus as any).current.class_name}</p>
                      {(scheduleStatus as any).current.end_time && (
                        <p className="text-xs text-green-600 mt-0.5">Ends at {formatTime12Hour((scheduleStatus as any).current.end_time)}</p>
                      )}
                    </div>
                  </div>
                )}
                {scheduleStatus.type === 'break' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-0.5">On Break</p>
                    <p className="text-sm font-semibold text-amber-800">
                      Next: {(scheduleStatus as any).next.subject} at {formatTime12Hour((scheduleStatus as any).next.start_time)}
                    </p>
                    <p className="text-xs text-amber-600">{(scheduleStatus as any).next.class_name}</p>
                  </div>
                )}
                {scheduleStatus.type === 'after_school' && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                    <p className="text-lg mb-0.5">🏠</p>
                    <p className="font-bold text-slate-700 text-sm">Closing Time</p>
                    <p className="text-xs text-slate-500">All classes done for today. See you tomorrow!</p>
                  </div>
                )}

                {/* ── Period list — highlights the current lesson ── */}
                {todaySchedule.slice(0, 4).map((entry, i) => {
                  const nowMins = now.getHours() * 60 + now.getMinutes();
                  const start   = timeToMins(entry.start_time);
                  const end     = timeToMins(entry.end_time || '') || start + 45;
                  const isCurrent = nowMins >= start && nowMins < end;
                  const isPast    = nowMins >= end;
                  return (
                    <div key={i} className={`flex items-center space-x-3 p-3 rounded-xl shadow-sm transition-all ${
                      isCurrent ? 'bg-green-50 border-2 border-green-300' :
                      isPast    ? 'bg-white opacity-50' : 'bg-white'
                    }`}>
                      <div className="w-16 text-center flex-shrink-0">
                        <p className={`font-bold text-sm ${isCurrent ? 'text-green-700' : 'text-gray-800'}`}>
                          {formatTime12Hour(entry.start_time)}
                        </p>
                        {isCurrent && (
                          <span className="text-xs font-black text-green-600 uppercase tracking-wide">NOW</span>
                        )}
                      </div>
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        isCurrent ? 'bg-green-500 animate-pulse' : SUBJECT_COLORS[entry.subject] || 'bg-gray-400'
                      }`} />
                      <div className="min-w-0">
                        <p className={`font-semibold truncate ${isCurrent ? 'text-green-900' : 'text-gray-800'}`}>{entry.subject}</p>
                        <p className="text-xs text-gray-500">({entry.class_name})</p>
                      </div>
                    </div>
                  );
                })}

                {todaySchedule.length > 4 && (
                  <button
                    onClick={() => navigateTo('timetable', 'Timetable Dashboard', {})}
                    className="text-sm font-semibold text-purple-600 w-full text-center mt-1 flex items-center justify-center gap-1 group"
                  >
                    See {todaySchedule.length - 4} more classes
                    <ChevronRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
                <button onClick={() => navigateTo('timetable', 'Timetable Dashboard', {})} className="text-sm font-semibold text-purple-600 w-full text-center mt-1">
                  View Full Timetable
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherOverview;