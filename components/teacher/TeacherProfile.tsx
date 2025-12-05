

import React from 'react';
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

interface TeacherProfileProps {
  navigateTo: (view: string, title: string, props?: any) => void;
}

const mockTeacher = {
  name: 'Mrs. Funke Akintola',
  avatarUrl: 'https://i.pravatar.cc/150?u=teacher',
  subject: 'English',
  email: 'f.akintola@school.com',
  phone: '123-456-7891'
};

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
    const subjectColor = SUBJECT_COLORS[mockTeacher.subject] || 'bg-gray-100 text-gray-800';

    const quickActions = [
        { label: 'Attendance', icon: AttendanceIcon, bgColor: 'bg-green-500', action: () => navigateTo('attendance', 'Mark Attendance', {}) },
        { label: 'Assignments', icon: ClipboardListIcon, bgColor: 'bg-sky-500', action: () => navigateTo('assignmentsList', 'Manage Assignments', {}) },
        { label: 'Curriculum', icon: BookOpenIcon, bgColor: 'bg-indigo-500', action: () => navigateTo('curriculumSelection', 'View Curriculum', {}) }
    ];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <main className="flex-grow p-4 space-y-5 overflow-y-auto">
        {/* Profile Info */}
        <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center space-y-3">
          <img 
            src={mockTeacher.avatarUrl} 
            alt={mockTeacher.name} 
            className="w-28 h-28 rounded-full object-cover border-4 border-purple-200 shadow-md"
          />
          <h3 className="text-2xl font-bold text-gray-800">{mockTeacher.name}</h3>
          <span className={`text-sm font-semibold px-4 py-1 rounded-full ${subjectColor}`}>
            Teaches {mockTeacher.subject}
          </span>
        </div>
      
        {/* Contact Info */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
             <div className="flex items-center space-x-4">
                <div className={`p-2.5 rounded-lg ${theme.cardBg}`}>
                    <MailIcon className={`w-5 h-5 ${theme.iconColor}`} />
                </div>
                <span className="text-gray-700 font-medium">{mockTeacher.email}</span>
            </div>
             <div className="flex items-center space-x-4">
                <div className={`p-2.5 rounded-lg ${theme.cardBg}`}>
                    <PhoneIcon className={`w-5 h-5 ${theme.iconColor}`} />
                </div>
                <span className="text-gray-700 font-medium">{mockTeacher.phone}</span>
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
