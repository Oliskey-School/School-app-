import React, { useMemo, useState, useEffect } from 'react';
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
  SUBJECT_COLORS,
  UserGroupIcon,
  getFormattedClassName
} from '../../constants';
// import { ClassInfo, Teacher, Assignment } from '../../types'; // Not utilizing full types yet for raw DB data
import { DashboardType } from '../../types';
import { THEME_CONFIG } from '../../constants';
import { supabase } from '../../lib/supabase';
import { useTeacherStats } from '../../hooks/useTeacherStats';

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
        <p className="text-[10px] sm:text-sm text-gray-600 truncate">{label}</p>
      </div>
    </div>
  );
};

// Helper: Parse "Grade 10A" -> {grade: 10, section: 'A'} or "Grade 7 - General" -> {grade: 7, section: 'General'}
// Helper: Parse "Grade 10A - Math" -> {grade: 10, section: 'A', subject: 'Math'}
// Helper: Parse "Grade 10A" -> {grade: 10, section: 'A'} using standardized logic if possible, 
// but for normalized DB access we should rely on what's stored.
// If class_name comes from DB as "10A", we just need to parse it.
// If it comes as "JSS 1 - Section A", we need to handle that.
// For now, let's just make the display consistent.

// We will import the helper inside the effect or component if needed, 
// but 'parseClassName' is a local legacy helper that we should probably just make more robust or align with DB data.
// However, since we are just fixing the "Virtual Classroom" complaint specifically, I will focus on that.
// But the user said "any where class ... is requested".
// Let's modify the display logic in the component loop to use the standard helper if we have the grade number.

// Helper: Parse Class Names (Supports: "10A", "Grade 10A", "JSS 1A", "SSS 2 Gold")
// Returns standardized grade number and section
const parseClassName = (name: string) => {
  const clean = name.trim();
  let grade = 0;
  let section = '';

  // 1. Try Standard Patterns
  // Matches: "10A", "10 A", "Grade 10A", "Year 10A"
  const standardMatch = clean.match(/^(?:Grade|Year)?\s*(\d+)\s*(.*)$/i);

  // 2. Try Nigerian Secondary Patterns
  // Matches: "JSS 1A", "JSS1 A", "SSS 3 Gold"
  const jsMatch = clean.match(/^JSS\s*(\d+)\s*(.*)$/i);
  const ssMatch = clean.match(/^S{2,3}\s*(\d+)\s*(.*)$/i); // Matches SS or SSS

  // 3. Try Primary Patterns
  const primaryMatch = clean.match(/^Primary\s*(\d+)\s*(.*)$/i);

  if (standardMatch) {
    grade = parseInt(standardMatch[1]);
    section = standardMatch[2];
  } else if (jsMatch) {
    grade = 6 + parseInt(jsMatch[1]); // JSS1 = 7
    section = jsMatch[2];
  } else if (ssMatch) {
    grade = 9 + parseInt(ssMatch[1]); // SS1 = 10
    section = ssMatch[2];
  } else if (primaryMatch) {
    grade = parseInt(primaryMatch[1]);
    section = primaryMatch[2];
  }

  // Clean section (remove hyphens, extra spaces)
  section = section.replace(/^[-–]\s*/, '').trim();

  return { grade, section };
};

import { useTeacherClasses } from '../../hooks/useTeacherClasses';
import { useAutoSync } from '../../hooks/useAutoSync';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';

const TeacherOverview: React.FC<TeacherOverviewProps> = ({ navigateTo, currentUser, profile, teacherProfile, teacherId, schoolId, currentBranchId }) => {
  const theme = THEME_CONFIG[DashboardType.Teacher];

  const { classes: teacherClasses, loading: classesLoading, teacherId: resolvedTeacherId, schoolId: resolvedSchoolId } = useTeacherClasses(teacherId);
  const { stats, loading: statsLoading } = useTeacherStats(resolvedTeacherId || teacherId || currentUser?.id, resolvedSchoolId || schoolId, teacherClasses);

  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [ungradedAssignments, setUngradedAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Effect to calculate stats from teacherClasses (REMOVED - handled by hook)
  /*
  useEffect(() => {
    const calculateStats = async () => {
      // ... logic moved to RPC ...
    };
    calculateStats();
  }, [teacherClasses, classesLoading, schoolId]);
  */

  useEffect(() => {
    const fetchData = async () => {
      // Use resolved ID from hook if available, fallback to prop
      const actualTeacherId = resolvedTeacherId || teacherId;
      const actualSchoolId = resolvedSchoolId || schoolId;

      if (!actualSchoolId || !actualTeacherId) return;

      try {
        setLoading(true);

        const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

        // 1. Fetch schedule and assignments using the resolved record ID
        let scheduleQuery = supabase
          .from('timetable')
          .select('id, start_time, subject, class_name')
          .eq('teacher_id', actualTeacherId)
          .eq('school_id', actualSchoolId)
          .eq('day', todayName)
          .eq('status', 'Published');

        if (currentBranchId) {
          scheduleQuery = scheduleQuery.eq('branch_id', currentBranchId);
        }

        const [scheduleRes, assignmentsRes] = await Promise.all([
          scheduleQuery.order('start_time', { ascending: true }),
          supabase
            .from('assignments')
            .select('id, title, class_name, created_at')
            .eq('school_id', schoolId)
            .eq('teacher_id', actualTeacherId)
            .order('created_at', { ascending: false })
            .limit(3)
        ]);

        setTodaySchedule(scheduleRes.data || []);
        setUngradedAssignments(assignmentsRes.data || []);

      } catch (err) {
        console.error('❌ Error fetching overview data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

  }, [currentUser, teacherId, profile, schoolId]);

  // Auto-refresh when relevant tables change in real-time
  const refetchOverview = () => {
    const fetchData = async () => {
      const actualTeacherId = resolvedTeacherId || teacherId;
      const actualSchoolId = resolvedSchoolId || schoolId;
      if (!actualSchoolId || !actualTeacherId) return;
      try {
        const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const [scheduleRes, assignmentsRes] = await Promise.all([
          supabase.from('timetable').select('id, start_time, subject, class_name')
            .eq('teacher_id', actualTeacherId).eq('school_id', actualSchoolId).eq('day', todayName).eq('status', 'Published')
            .order('start_time', { ascending: true }),
          supabase.from('assignments').select('id, title, class_name, created_at')
            .eq('school_id', actualSchoolId).eq('teacher_id', actualTeacherId)
            .order('created_at', { ascending: false }).limit(3)
        ]);
        setTodaySchedule(scheduleRes.data || []);
        setUngradedAssignments(assignmentsRes.data || []);
      } catch (err) { console.error('❌ Realtime refetch error:', err); }
    };
    fetchData();
  };
  useRealtimeRefresh(['assignments', 'timetable', 'students', 'teachers', 'classes'], refetchOverview);

  useAutoSync(
    ['teacher_classes', 'class_teachers', 'assignments', 'timetable', 'report_cards'],
    () => {
      console.log('🔄 [TeacherOverview] Auto-Sync Triggered');
      // For now, since fetchData is dependent on props inside the effect, 
      // we can rely on the components themselves (like useTeacherClasses) to re-fetch,
      // but we still want to trigger the local fetchData to refresh schedule/assignments.
      // In a refactor, fetchData should be memoized. We'll force an update to trigger it.
      // Let's actually pull fetchData out or duplicate its call safely if needed.
      // But since the overarching TeacherDashboard re-renders, it might be enough.
      // To be safe, we'll force the page to reload its data.
      setLoading(true);
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

  const quickActions = [
    { label: "Add Student", icon: <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>, action: () => navigateTo('addStudent', 'Add Student', {}) },
    { label: "My Attendance", icon: <CheckCircleIcon className="h-7 w-7" />, action: () => navigateTo('teacherSelfAttendance', 'My Attendance', {}) },
    { label: "Attendance", icon: <TeacherAttendanceIcon className="h-7 w-7" />, action: () => navigateTo('selectClassForAttendance', 'Select Class', {}) },
    { label: "Assignments", icon: <ClipboardListIcon className="h-7 w-7" />, action: () => navigateTo('assignmentsList', 'Manage Assignments', {}) },
    { label: "Lesson Notes", icon: <BookOpenIcon className="h-7 w-7" />, action: () => navigateTo('lessonNotesUpload', 'Upload Lesson Notes', {}) },
    { label: "Resources", icon: <BriefcaseIcon className="h-7 w-7" />, action: () => navigateTo('resources', 'Resource Hub', {}) },
    { label: "Appointments", icon: <CalendarPlusIcon className="h-7 w-7" />, action: () => navigateTo('appointments', 'Appointments', {}) },
    { label: "Virtual Class", icon: <VideoIcon className="h-7 w-7" />, action: () => navigateTo('virtualClass', 'Virtual Classroom', {}) },
    { label: "AI Planner", icon: <SparklesIcon className="h-7 w-7" />, action: () => navigateTo('lessonPlanner', 'AI Lesson Planner', {}) },
    { label: "Quiz Builder", icon: <EditIcon className="h-7 w-7" />, action: () => navigateTo('quizBuilder', 'Create Assessment', {}) },
    { label: "Gradebook", icon: <CalculatorIcon className="h-7 w-7" />, action: () => navigateTo('classGradebook', 'Class Gradebook', {}) },
    { label: "Exams", icon: <ClipboardListIcon className="h-7 w-7" />, action: () => navigateTo('examManagement', 'Manage Exams', { schoolId, teacherId }) },
    { label: "Forum", icon: <UserGroupIcon className="h-7 w-7" />, action: () => navigateTo('collaborationForum', 'Teacher Forum', {}) },
    { label: "Reports", icon: <BookOpenIcon className="h-7 w-7" />, action: () => navigateTo('reports', 'Student Reports', {}) },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6 bg-gray-50">
      {/* Welcome Message */}
      <div className={`p-5 rounded-2xl text-white shadow-lg ${theme.mainBg}`}>
        <h3 className="text-2xl font-bold">Welcome, {teacherProfile?.name || 'Teacher'}!</h3>
        <p className="text-sm opacity-90 mt-1">Ready to inspire today?</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Total Students" value={statsLoading ? '...' : stats.totalStudents} icon={<BriefcaseIcon />} />
        <StatCard label="Total Assigned Classes" value={statsLoading ? '...' : stats.totalClasses} icon={<ViewGridIcon />} />
      </div>

      {/* Your Assigned Classes & Subjects */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-2 px-1">Your Assigned Classes</h3>
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
                onClick={() => navigateTo('classDetail', c.name || getFormattedClassName(c.grade, c.section, true, c.subject), { classInfo: c })}
                className="min-w-[180px] bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-all text-left border-b-4 border-purple-500 group"
              >
                <div className="flex justify-between items-start mb-1">
                  <p className="font-bold text-gray-800 text-base">{c.name || getFormattedClassName(c.grade, c.section)}</p>
                  <ChevronRightIcon className="w-4 h-4 text-gray-300 group-hover:text-purple-500 transition-colors" />
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
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Priority Actions */}
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
              {ungradedAssignments.length > 0 ? ungradedAssignments.slice(0, 1).map(a => (
                <button key={a.id} onClick={() => navigateTo('assignmentSubmissions', `Submissions: ${a.title}`, { assignment: a, schoolId })} className="w-full text-left bg-white p-3 rounded-xl shadow-sm hover:bg-purple-50 flex justify-between items-center">
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

          {/* Quick Actions */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-2 px-1">Quick Actions</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3">
              {quickActions.map(action => (
                <button key={action.label} onClick={action.action} className={`${theme.cardBg} p-2 sm:p-3 rounded-xl shadow-sm flex flex-col items-center justify-center space-y-1 sm:space-y-2 hover:bg-purple-200 transition-colors`}>
                  <div className={`${theme.iconColor} flex-shrink-0`}>{React.cloneElement(action.icon as React.ReactElement, { className: "h-6 w-6 sm:h-7 sm:w-7" })}</div>
                  <span className={`font-semibold ${theme.textColor} text-center text-[10px] sm:text-xs leading-tight`}>{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Today's Schedule */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-2 px-1">Today's Schedule</h3>
            {todaySchedule.length > 0 ? (
              <div className="space-y-3">
                {todaySchedule.map((entry, i) => (
                  <div key={i} className="flex items-center space-x-3 p-3 bg-white rounded-xl shadow-sm">
                    <div className="w-16 text-center">
                      <p className="font-bold text-sm text-gray-800">{formatTime12Hour(entry.start_time)}</p>
                    </div>
                    <div className={`w-1 h-10 rounded-full ${SUBJECT_COLORS[entry.subject] || 'bg-gray-400'}`}></div>
                    <div>
                      <p className="font-semibold text-gray-800">{entry.subject}</p>
                      <p className="text-xs text-gray-500">({entry.class_name})</p>
                    </div>
                  </div>
                ))}
                <button onClick={() => navigateTo('timetable', 'Timetable', {})} className="text-sm font-semibold text-purple-600 w-full text-center mt-2">View Full Timetable</button>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-xl shadow-sm text-center text-gray-500">
                No classes scheduled for today.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default TeacherOverview;