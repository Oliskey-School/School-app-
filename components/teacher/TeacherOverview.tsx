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
  SUBJECT_COLORS
} from '../../constants';
// import { ClassInfo, Teacher, Assignment } from '../../types'; // Not utilizing full types yet for raw DB data
import { DashboardType } from '../../types';
import { THEME_CONFIG } from '../../constants';
import { supabase } from '../../lib/supabase';

interface TeacherOverviewProps {
  navigateTo: (view: string, title: string, props?: any) => void;
  currentUser?: any;
  profile?: any;
  teacherId?: string | null;
  schoolId: string;
  currentBranchId: string | null;
}

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactElement<{ className?: string }>; }> = ({ label, value, icon }) => {
  const theme = THEME_CONFIG[DashboardType.Teacher];
  return (
    <div className={`${theme.cardBg} p-4 rounded-xl flex items-center space-x-3`}>
      <div className={`${theme.cardIconBg} p-2 rounded-full`}>
        {React.cloneElement(icon, { className: `h-6 w-6 ${theme.iconColor}` })}
      </div>
      <div>
        <p className={`text-2xl font-bold ${theme.textColor}`}>{value}</p>
        <p className="text-sm text-gray-600">{label}</p>
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

const TeacherOverview: React.FC<TeacherOverviewProps> = ({ navigateTo, currentUser, profile, teacherId, schoolId, currentBranchId }) => {
  const theme = THEME_CONFIG[DashboardType.Teacher];

  const { classes: teacherClasses, loading: classesLoading } = useTeacherClasses(teacherId || currentUser?.id);

  const [teacherName, setTeacherName] = useState('Teacher');
  const [stats, setStats] = useState({ totalStudents: 0, classesTaught: 0 });
  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [ungradedAssignments, setUngradedAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Effect to calculate stats from teacherClasses
  useEffect(() => {
    const calculateStats = async () => {
      if (classesLoading) return;

      // 1. Classes Taught
      const classCount = teacherClasses.length;

      // 2. Total Students
      let studentCount = 0;
      if (classCount > 0) {
        const classIds = teacherClasses.map(c => c.id);

        if (classIds.length > 0) {
          const { data: students, error: studentError } = await supabase
            .from('students')
            .select('id')
            .eq('school_id', schoolId)
            .in('class_id', classIds);

          if (studentError) {
            console.error('❌ Error fetching students for stats:', studentError);
          } else if (students) {
            studentCount = students.length;
          }
        }
      }

      setStats({ totalStudents: studentCount, classesTaught: classCount });
    };

    calculateStats();
  }, [teacherClasses, classesLoading, schoolId]);

  useEffect(() => {
    const fetchData = async () => {
      if (!schoolId) return;

      try {
        setLoading(true);

        // 1. Prepare Queries
        let teacherQuery = supabase
          .from('teachers')
          .select('id, name')
          .eq('school_id', schoolId);

        if (teacherId) teacherQuery = teacherQuery.eq('id', teacherId);
        else if (profile?.id) teacherQuery = teacherQuery.eq('user_id', profile.id);
        else if (currentUser?.email) teacherQuery = teacherQuery.eq('email', currentUser.email);

        // 2. Fetch basic info first to get teacher ID if needed
        const { data: teacher } = await teacherQuery.maybeSingle();
        if (teacher) {
          setTeacherName(teacher.name);

          // 3. Parallelize subsequent fetches
          const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
          let scheduleQuery = supabase
            .from('timetable')
            .select('id, start_time, subject, class_name')
            .eq('teacher_id', teacher.id)
            .eq('school_id', schoolId)
            .eq('day', todayName)
            .eq('status', 'Published');

          if (currentBranchId) {
            scheduleQuery = scheduleQuery.eq('branch_id', currentBranchId);
          }

          // Fetch schedule and assignments in parallel
          const [scheduleRes, assignmentsRes] = await Promise.all([
            scheduleQuery.order('start_time', { ascending: true }),
            supabase
              .from('assignments')
              .select('id, title, class_name, created_at')
              .eq('school_id', schoolId)
              .eq('teacher_id', teacher.id)
              .order('created_at', { ascending: false })
              .limit(3)
          ]);

          setTodaySchedule(scheduleRes.data || []);
          setUngradedAssignments(assignmentsRes.data || []);
        }

      } catch (err) {
        console.error('❌ Error fetching overview data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Real-time subscription for relevant tables
    const subscription = supabase
      .channel('teacher_overview_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teacher_classes' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_teachers' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timetable' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };

  }, [currentUser, teacherId, profile, schoolId]);

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
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6 bg-gray-50">
      {/* Welcome Message */}
      <div className={`p-5 rounded-2xl text-white shadow-lg ${theme.mainBg}`}>
        <h3 className="text-2xl font-bold">Welcome, {teacherName}!</h3>
        <p className="text-sm opacity-90 mt-1">Ready to inspire today?</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Total Students" value={stats.totalStudents} icon={<BriefcaseIcon />} />
        <StatCard label="Total Assigned Classes" value={stats.classesTaught} icon={<ViewGridIcon />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Priority Actions */}
          <div>
            <div className="flex justify-between items-end mb-2 px-1">
              <h3 className="text-lg font-bold text-gray-800">Recent Assignments</h3>
              {ungradedAssignments.length > 2 && (
                <button onClick={() => navigateTo('assignmentsList', 'Manage Assignments', {})} className="text-sm font-bold text-purple-600 hover:text-purple-800">
                  More
                </button>
              )}
            </div>
            <div className="space-y-3">
              {ungradedAssignments.length > 0 ? ungradedAssignments.slice(0, 2).map(a => (
                <button key={a.id} onClick={() => navigateTo('assignmentSubmissions', `Submissions: ${a.title}`, { assignment: a })} className="w-full text-left bg-white p-3 rounded-xl shadow-sm hover:bg-purple-50 flex justify-between items-center">
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
            <div className="grid grid-cols-3 gap-3">
              {quickActions.map(action => (
                <button key={action.label} onClick={action.action} className={`${theme.cardBg} p-3 rounded-xl shadow-sm flex flex-col items-center justify-center space-y-2 hover:bg-purple-200`}>
                  <div className={theme.iconColor}>{action.icon}</div>
                  <span className={`font-semibold ${theme.textColor} text-center text-xs`}>{action.label}</span>
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