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
  SUBJECT_COLORS
} from '../../constants';
// import { ClassInfo, Teacher, Assignment } from '../../types'; // Not utilizing full types yet for raw DB data
import { DashboardType } from '../../types';
import { THEME_CONFIG } from '../../constants';
import { supabase } from '../../lib/supabase';

interface TeacherOverviewProps {
  navigateTo: (view: string, title: string, props?: any) => void;
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

// Helper: Parse "Grade 10A" -> {grade: 10, section: 'A'}
const parseClassName = (name: string) => {
  const match = name.match(/(\d+)([A-Za-z]+)/); // e.g. 10A
  if (match) return { grade: parseInt(match[1]), section: match[2] };
  return { grade: 0, section: '' };
};

const TeacherOverview: React.FC<TeacherOverviewProps> = ({ navigateTo }) => {
  const theme = THEME_CONFIG[DashboardType.Teacher];

  const [teacherName, setTeacherName] = useState('Teacher');
  const [stats, setStats] = useState({ totalStudents: 0, classesTaught: 0 });
  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [ungradedAssignments, setUngradedAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Get Logged In Teacher (Hardcoded email for demo/dev)
        const { data: teacher, error: teacherError } = await supabase
          .from('teachers')
          .select('id, name')
          .eq('email', 'f.akintola@school.com') // Using Mrs. Funke from seed
          .single();

        if (teacherError || !teacher) {
          console.error('Teacher not found', teacherError);
          return;
        }

        setTeacherName(teacher.name);

        // 2. Get Teacher Classes
        const { data: teacherClasses } = await supabase
          .from('teacher_classes')
          .select('class_name')
          .eq('teacher_id', teacher.id);

        const classes = teacherClasses?.map(c => c.class_name) || [];
        setStats(prev => ({ ...prev, classesTaught: classes.length }));

        // 3. Get Total Students (by querying students in those classes)
        // Assuming class_name format "10A" or similar matching students grade/section
        // For robust calc, we can fetch all students and filter locally or make detailed query
        if (classes.length > 0) {
          const { data: students } = await supabase.from('students').select('grade, section');
          let count = 0;
          if (students) {
            classes.forEach(clsName => {
              // Attempt to match "10A" -> grade:10, section:A
              // Or "Grade 10A"
              const cleanName = clsName.replace('Grade ', '');
              const { grade, section } = parseClassName(cleanName);
              if (grade > 0) {
                count += students.filter(s => s.grade === grade && s.section === section).length;
              }
            });
          }
          setStats(prev => ({ ...prev, totalStudents: count }));
        }

        // 4. Get Today's Schedule
        const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const { data: timetable } = await supabase
          .from('timetable')
          .select('*')
          .eq('teacher_id', teacher.id)
          .eq('day', todayName)
          .order('start_time', { ascending: true });

        setTodaySchedule(timetable || []);

        // 5. Get Ungraded Assignments
        // Let's use a simpler query for action items based on assignments table
        const { data: recentAssignments } = await supabase
          .from('assignments')
          .select('*')
          .limit(3);

        setUngradedAssignments(recentAssignments || []);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
    { label: "Attendance", icon: <TeacherAttendanceIcon className="h-7 w-7" />, action: () => navigateTo('selectClassForAttendance', 'Select Class', {}) },
    { label: "Assignments", icon: <ClipboardListIcon className="h-7 w-7" />, action: () => navigateTo('assignmentsList', 'Manage Assignments', {}) },
    { label: "Resources", icon: <BookOpenIcon className="h-7 w-7" />, action: () => navigateTo('resources', 'Resource Hub', {}) },
    { label: "Appointments", icon: <CalendarPlusIcon className="h-7 w-7" />, action: () => navigateTo('appointments', 'Appointments', {}) },
    { label: "Virtual Class", icon: <VideoIcon className="h-7 w-7" />, action: () => navigateTo('virtualClass', 'Virtual Classroom', {}) },
    { label: "AI Planner", icon: <SparklesIcon className="h-7 w-7" />, action: () => navigateTo('lessonPlanner', 'AI Lesson Planner', {}) },
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
        <StatCard label="Classes Taught" value={stats.classesTaught} icon={<ViewGridIcon />} />
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