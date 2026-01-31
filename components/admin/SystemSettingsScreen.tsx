import React from 'react';
import { ShieldCheckIcon, CalendarIcon, DollarSignIcon, MegaphoneIcon, BriefcaseIcon, PaintBrushIcon, ChevronRightIcon, UserGroupIcon, UserIcon as ProfileIcon, ElearningIcon, ClockIcon, DocumentTextIcon } from '../../constants';
import { UserPlus } from 'lucide-react';

interface SystemSettingsScreenProps {
  navigateTo: (view: string, title: string, props?: any) => void;
}

const settingsCategories = [
  { view: 'studentList', title: 'Student Management', description: 'Manage student records and enrollment.', icon: <UserGroupIcon />, color: 'text-blue-500 bg-blue-100' },
  { view: 'teacherList', title: 'Manage Teachers', description: 'Manage teacher profiles and assignments.', icon: <ProfileIcon />, color: 'text-purple-500 bg-purple-100' },
  { view: 'parentList', title: 'Parent Management', description: 'Manage parent information and links.', icon: <UserGroupIcon />, color: 'text-orange-500 bg-orange-100' },
  { view: 'inviteStaff', title: 'Invite Staff Member', description: 'Send invitations to new staff members.', icon: <BriefcaseIcon />, color: 'text-emerald-500 bg-emerald-100' },
  { view: 'classList', title: 'Class Management', description: 'Manage school classes and sections.', icon: <ElearningIcon />, color: 'text-pink-500 bg-pink-100' },
  { view: 'timetable', title: 'Timetable Management', description: 'View and edit school schedules.', icon: <ClockIcon />, color: 'text-cyan-500 bg-cyan-100' },
  { view: 'examManagement', title: 'Exam Management', description: 'Manage exams and results.', icon: <DocumentTextIcon />, color: 'text-rose-500 bg-rose-100' },
  { view: 'communicationHub', title: 'Communication Hub', description: 'Broadcast messages and announcements.', icon: <MegaphoneIcon />, color: 'text-amber-500 bg-amber-100' },
  { view: 'userRoles', title: 'User Roles & Permissions', description: 'Define roles and control access.', icon: <ShieldCheckIcon />, color: 'text-slate-500 bg-slate-100' },
  { view: 'academicSettings', title: 'Academic Configuration', description: 'Set calendar, grading, and courses.', icon: <CalendarIcon />, color: 'text-sky-500 bg-sky-100' },
  { view: 'financialSettings', title: 'Financial Settings', description: 'Manage fees and payment methods.', icon: <DollarSignIcon />, color: 'text-green-500 bg-green-100' },
  { view: 'securitySettings', title: 'Security & Compliance', description: 'Password policies, 2FA, audit logs.', icon: <ShieldCheckIcon />, color: 'text-red-500 bg-red-100' },
  { view: 'profileSettings', title: 'Personal Profile Settings', description: 'Update your account and profile information.', icon: <ProfileIcon />, color: 'text-gray-500 bg-gray-100' },
  { view: 'brandingSettings', title: 'Branding & Customization', description: 'Customize the look and feel.', icon: <PaintBrushIcon />, color: 'text-violet-500 bg-violet-100' },
  { view: 'analyticsAdminTools', title: 'Analytics & Admin Tools', description: 'Advanced analytics, budgets, integrations.', icon: <BriefcaseIcon />, color: 'text-teal-500 bg-teal-100' },
  { view: 'selectUserTypeToAdd', title: 'Add New User', description: 'Quickly add a new student, teacher, or parent.', icon: <UserPlus className="h-6 w-6" />, color: 'text-blue-600 bg-blue-100' },
];

const SystemSettingsScreen: React.FC<SystemSettingsScreenProps> = ({ navigateTo }) => {
  return (
    <div className="p-4 space-y-3 bg-gray-50 pb-32 lg:pb-4">
      {settingsCategories.map(cat => (
        <button
          key={cat.view}
          onClick={() => navigateTo(cat.view, cat.title, {})}
          className="w-full bg-white rounded-xl shadow-sm p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-lg ${cat.color}`}>
              {React.cloneElement(cat.icon, { className: 'h-6 w-6' })}
            </div>
            <div>
              <h3 className="font-bold text-gray-800">{cat.title}</h3>
              <p className="text-sm text-gray-500">{cat.description}</p>
            </div>
          </div>
          <ChevronRightIcon className="text-gray-400" />
        </button>
      ))}
    </div>
  );
};
export default SystemSettingsScreen;
