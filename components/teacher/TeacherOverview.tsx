import React, { useMemo } from 'react';
import {
  BookOpenIcon,
  ChevronRightIcon,
  ViewGridIcon,
  TeacherAttendanceIcon,
  ClipboardListIcon,
  BriefcaseIcon,
  ClockIcon,
  SparklesIcon,
  CalendarPlusIcon,
  VideoIcon
} from '../../constants';
import { ClassInfo, Teacher, Assignment } from '../../types';
import { DashboardType } from '../../types';
import { THEME_CONFIG, SUBJECT_COLORS, getFormattedClassName } from '../../constants';
import { mockTeachers, mockClasses, mockTimetableData, mockStudents, mockAssignments, mockSubmissions } from '../../data';

const LOGGED_IN_TEACHER_ID = 2; // Mrs. Funke Akintola

interface TeacherOverviewProps {
  navigateTo: (view: string, title: string, props?: any) => void;
}

// FIX: Corrected the type of the 'icon' prop to be more specific, including `className` to resolve a TypeScript error with React.cloneElement.
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


const TeacherOverview: React.FC<TeacherOverviewProps> = ({ navigateTo }) => {
  const theme = THEME_CONFIG[DashboardType.Teacher];
  const teacher: Teacher = mockTeachers.find(t => t.id === LOGGED_IN_TEACHER_ID)!;
  
  const teacherClasses: ClassInfo[] = mockClasses.filter(c => teacher.classes.includes(c.grade + c.section));

  const totalStudents = useMemo(() => {
    const studentIds = new Set();
    teacherClasses.forEach(c => {
        mockStudents.forEach(s => {
            if (s.grade === c.grade && s.section === c.section) {
                studentIds.add(s.id);
            }
        });
    });
    return studentIds.size;
  }, [teacherClasses]);
  
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }) as any;
  const todaySchedule = mockTimetableData
    .filter(e => e.day === today && teacher.classes.some(cls => e.className.includes(cls)))
    .sort((a,b) => a.startTime.localeCompare(b.startTime));
    
  const ungradedAssignments = useMemo(() => {
    return mockAssignments.filter(a => {
        const isTeacherAssignment = teacher.classes.some(c => a.className.includes(c)) && teacher.subjects.includes(a.subject);
        if (!isTeacherAssignment) return false;
        
        const submissions = mockSubmissions.filter(s => s.assignmentId === a.id);
        const ungradedCount = submissions.filter(s => s.status === 'Ungraded').length;
        return ungradedCount > 0;
    }).slice(0, 2); // Show max 2
  }, [teacher]);


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
      { label: "Attendance", icon: <TeacherAttendanceIcon className="h-7 w-7"/>, action: () => navigateTo('selectClassForAttendance', 'Select Class', {}) },
      { label: "Assignments", icon: <ClipboardListIcon className="h-7 w-7"/>, action: () => navigateTo('assignmentsList', 'Manage Assignments', {}) },
      { label: "Resources", icon: <BookOpenIcon className="h-7 w-7"/>, action: () => navigateTo('resources', 'Resource Hub', {}) },
      { label: "Appointments", icon: <CalendarPlusIcon className="h-7 w-7"/>, action: () => navigateTo('appointments', 'Appointments', {}) },
      { label: "Virtual Class", icon: <VideoIcon className="h-7 w-7"/>, action: () => navigateTo('virtualClass', 'Virtual Classroom', {}) },
      { label: "AI Planner", icon: <SparklesIcon className="h-7 w-7"/>, action: () => navigateTo('lessonPlanner', 'AI Lesson Planner', {}) },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6 bg-gray-50">
      {/* Welcome Message */}
      <div className={`p-5 rounded-2xl text-white shadow-lg ${theme.mainBg}`}>
        <h3 className="text-2xl font-bold">Welcome, {teacher.name}!</h3>
        <p className="text-sm opacity-90 mt-1">Ready to inspire today?</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Total Students" value={totalStudents} icon={<BriefcaseIcon />} />
        <StatCard label="Classes Taught" value={teacherClasses.length} icon={<ViewGridIcon />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
            {/* Priority Actions */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-2 px-1">Priority Actions</h3>
              <div className="space-y-3">
                 {ungradedAssignments.length > 0 ? ungradedAssignments.map(a => (
                    <button key={a.id} onClick={() => navigateTo('assignmentSubmissions', `Submissions: ${a.title}`, { assignment: a })} className="w-full text-left bg-white p-3 rounded-xl shadow-sm hover:bg-purple-50 flex justify-between items-center">
                        <div>
                            <p className="font-bold text-gray-800">{a.title}</p>
                            <p className="text-sm text-gray-500">{a.className}</p>
                        </div>
                        <div className="flex items-center space-x-2 text-purple-600 font-semibold">
                            <span>Grade Now</span>
                            <ChevronRightIcon className="w-5 h-5"/>
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
                                  <p className="font-bold text-sm text-gray-800">{formatTime12Hour(entry.startTime)}</p>
                              </div>
                              <div className={`w-1 h-10 rounded-full ${SUBJECT_COLORS[entry.subject]}`}></div>
                              <div>
                                  <p className="font-semibold text-gray-800">{entry.subject}</p>
                                  <p className="text-xs text-gray-500">({entry.className})</p>
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