
import React, { useEffect, useState } from 'react';
import {
  MailIcon,
  PhoneIcon,
  SettingsIcon,
  AttendanceIcon,
  BookOpenIcon,
  ClipboardListIcon
} from '../../constants';
import { THEME_CONFIG, SUBJECT_COLORS } from '../../constants';
import { DashboardType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

interface TeacherProfileProps {
  navigateTo: (view: string, title: string, props?: any) => void;
}

const QuickActionCard: React.FC<{ icon: React.ComponentType<{ className?: string }>, label: string, bgColor: string, action: () => void }> = ({ icon: Icon, label, bgColor, action }) => (
  <button onClick={action} className={`w-full p-4 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center transition-transform transform hover:scale-105 ${bgColor}`}>
    <div className="text-white mb-2">
      <Icon className="h-6 w-6" />
    </div>
    <span className="font-semibold text-white text-sm">{label}</span>
  </button>
);

const TeacherProfile: React.FC<TeacherProfileProps> = ({ navigateTo }) => {
  const theme = THEME_CONFIG[DashboardType.Teacher];
  const { user } = useAuth();
  const [teacher, setTeacher] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [primarySubject, setPrimarySubject] = useState<string>('General');

  useEffect(() => {
    const fetchTeacherProfile = async () => {
      if (!user) return;

      try {
        setLoading(true);
        // 1. Fetch Teacher Details
        const { data: teacherData, error: teacherError } = await supabase
          .from('teachers')
          .select('*')
          .eq('user_id', user.id) // Assuming auth user maps to this ID, or we use email
          .single();

        if (teacherError) throw teacherError;

        if (teacherData) {
          setTeacher(teacherData);

          // 2. Fetch Subjects
          const { data: subjectsData } = await supabase
            .from('teacher_subjects')
            .select('subject')
            .eq('teacher_id', teacherData.id);

          if (subjectsData && subjectsData.length > 0) {
            setPrimarySubject(subjectsData[0].subject);
          }
        }
      } catch (err) {
        console.error("Error fetching teacher profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherProfile();
  }, [user]);

  const subjectColor = SUBJECT_COLORS[primarySubject] || 'bg-gray-100 text-gray-800';

  const quickActions = [
    { label: 'Attendance', icon: AttendanceIcon, bgColor: 'bg-green-500', action: () => navigateTo('attendance', 'Mark Attendance', {}) },
    { label: 'Assignments', icon: ClipboardListIcon, bgColor: 'bg-sky-500', action: () => navigateTo('assignmentsList', 'Manage Assignments', {}) },
    { label: 'Curriculum', icon: BookOpenIcon, bgColor: 'bg-indigo-500', action: () => navigateTo('curriculumSelection', 'View Curriculum', {}) }
  ];

  if (loading) {
    return <div className="p-10 text-center text-gray-500">Loading profile...</div>;
  }

  if (!teacher) {
    return (
      <div className="p-10 text-center">
        <p className="text-red-500 font-bold">Teacher profile not found.</p>
        <p className="text-sm text-gray-500">Please contact the administrator.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <main className="flex-grow p-4 space-y-5 overflow-y-auto">
        {/* Profile Info */}
        <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center space-y-3">
          <img
            src={teacher.avatar_url || 'https://i.pravatar.cc/150?u=teacher'}
            alt={teacher.name}
            className="w-28 h-28 rounded-full object-cover border-4 border-purple-200 shadow-md"
          />
          <h3 className="text-2xl font-bold text-gray-800">{teacher.name}</h3>
          <span className={`text-sm font-semibold px-4 py-1 rounded-full ${subjectColor}`}>
            Teaches {primarySubject}
          </span>
          {teacher.school_generated_id && (
            <span className="text-xs bg-gray-200 text-gray-600 px-3 py-1 rounded-full border border-gray-300">
              ID: {teacher.school_generated_id}
            </span>
          )}
        </div>

        {/* Contact Info */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
          <div className="flex items-center space-x-4">
            <div className={`p-2.5 rounded-lg ${theme.cardBg}`}>
              <MailIcon className={`w-5 h-5 ${theme.iconColor}`} />
            </div>
            <span className="text-gray-700 font-medium">{teacher.email}</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`p-2.5 rounded-lg ${theme.cardBg}`}>
              <PhoneIcon className={`w-5 h-5 ${theme.iconColor}`} />
            </div>
            <span className="text-gray-700 font-medium">{teacher.phone || 'No phone number'}</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-md font-bold text-gray-600 px-2 mb-2">Quick Actions</h3>
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map(item => (
              <QuickActionCard key={item.label} icon={item.icon} label={item.label} bgColor={item.bgColor} action={item.action} />
            ))}
          </div>
        </div>
      </main>

      {/* Action Buttons */}
      <div className="p-4 mt-auto bg-gray-50 border-t border-gray-200">
        <button
          onClick={() => navigateTo('settings', 'Settings', {})}
          className={`w-full flex items-center justify-center space-x-2 py-3 px-4 font-medium text-white rounded-lg shadow-sm ${theme.mainBg} hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500`}>
          <SettingsIcon className="h-5 w-5" />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
};

export default TeacherProfile;
