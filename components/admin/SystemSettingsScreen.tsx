import React from 'react';
import { ShieldCheckIcon, CalendarIcon, DollarSignIcon, MegaphoneIcon, BriefcaseIcon, PaintBrushIcon, ChevronRightIcon } from '../../constants';

interface SystemSettingsScreenProps {
  navigateTo: (view: string, title: string, props?: any) => void;
}

const settingsCategories = [
  { view: 'userRoles', title: 'User Roles & Permissions', description: 'Define roles and control access.', icon: <ShieldCheckIcon />, color: 'text-indigo-500 bg-indigo-100' },
  { view: 'academicSettings', title: 'Academic Configuration', description: 'Set calendar, grading, and courses.', icon: <CalendarIcon />, color: 'text-sky-500 bg-sky-100' },
  { view: 'financialSettings', title: 'Financial Settings', description: 'Manage fees and payment methods.', icon: <DollarSignIcon />, color: 'text-green-500 bg-green-100' },
  { view: 'communicationSettings', title: 'Communication Settings', description: 'Configure notifications and channels.', icon: <MegaphoneIcon />, color: 'text-amber-500 bg-amber-100' },
  { view: 'securitySettings', title: 'Security & Compliance', description: 'Password policies, 2FA, audit logs.', icon: <ShieldCheckIcon />, color: 'text-red-500 bg-red-100' },
  { view: 'brandingSettings', title: 'Branding & Customization', description: 'Customize the look and feel.', icon: <PaintBrushIcon />, color: 'text-purple-500 bg-purple-100' },
  { view: 'analyticsAdminTools', title: 'Analytics & Admin Tools', description: 'Advanced analytics, budgets, integrations.', icon: <BriefcaseIcon />, color: 'text-teal-500 bg-teal-100' },
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
