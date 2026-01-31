import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
    EditIcon,
    NotificationIcon,
    SecurityIcon,
    HelpIcon,
    LogoutIcon,
    ChevronRightIcon,
    MailIcon,
    PhoneIcon,
    TrendingUpIcon,
    SettingsIcon,
    ChevronLeftIcon,
    ExamIcon,
    UserIcon
} from '../../constants';
import { THEME_CONFIG } from '../../constants';
import { DashboardType } from '../../types';
import EditTeacherProfileScreen from './EditTeacherProfileScreen';
import TeacherNotificationSettingsScreen from './TeacherNotificationSettingsScreen';
import TeacherSecurityScreen from './TeacherSecurityScreen';
import ProfessionalDevelopmentScreen from './ProfessionalDevelopmentScreen';
import CBTManagementScreen from './CBTManagementScreen';
import { supabase } from '../../lib/supabase';
import { useUserIdentity } from '../../lib/hooks/useUserIdentity';
import { Copy } from 'lucide-react';

interface TeacherSettingsScreenProps {
    onLogout: () => void;
    navigateTo: (view: string, title: string, props?: any) => void;
    dashboardProfile?: { name: string; avatarUrl: string; };
    profile?: { name: string; avatarUrl: string; };
    refreshDashboardProfile?: (data?: { name: string; avatarUrl: string }) => void;
    teacherId?: number | null;
    currentUser?: any;
}

type SettingView = 'editTeacherProfile' | 'teacherNotificationSettings' | 'teacherSecurity' | 'professionalDevelopment' | 'cbtManagement' | null;

const SettingsPlaceholder: React.FC = () => (
    <div className="flex-col items-center justify-center h-full text-center text-gray-500 bg-[#F0F2F5] border-l border-gray-300/80 hidden md:flex">
        <SettingsIcon className="w-24 h-24 text-gray-300" />
        <h1 className="text-3xl font-light text-gray-600 mt-4">Teacher Settings</h1>
        <p className="mt-2 text-sm text-gray-500 max-w-sm">
            Select an item from the left to view and edit your settings.
        </p>
    </div>
);


const TeacherSettingsScreen: React.FC<TeacherSettingsScreenProps> = ({ onLogout, navigateTo, profile: propProfile, refreshDashboardProfile, teacherId, currentUser }) => {
    const { customId, formatId, copyToClipboard, copied } = useUserIdentity();
    const theme = THEME_CONFIG[DashboardType.Teacher];
    const [activeSetting, setActiveSetting] = useState<SettingView>(null);

    // Use passed profile or fallback
    const profile = propProfile || { name: 'Teacher', avatarUrl: '' };

    const settingsItems = [
        { id: 'editTeacherProfile', icon: <EditIcon />, label: 'Edit Profile', color: 'bg-blue-100 text-blue-500' },
        { id: 'cbtManagement', icon: <ExamIcon />, label: 'CBT & Examination', color: 'bg-indigo-100 text-indigo-500' },
        { id: 'professionalDevelopment', icon: <TrendingUpIcon />, label: 'Professional Development', color: 'bg-teal-100 text-teal-500' },
        { id: 'teacherNotificationSettings', icon: <NotificationIcon />, label: 'Notifications', color: 'bg-green-100 text-green-500' },
        { id: 'teacherSecurity', icon: <SecurityIcon />, label: 'Security & Password', color: 'bg-orange-100 text-orange-500' },
        { id: 'help', icon: <HelpIcon />, label: 'Help & Support', color: 'bg-purple-100 text-purple-500' },
    ];

    const handleItemClick = (id: string) => {
        if (id === 'help') {
            toast('Help Center coming soon!', { icon: 'ℹ️' });
        } else {
            setActiveSetting(id as SettingView);
        }
    };

    const renderActiveSetting = () => {
        switch (activeSetting) {
            case 'editTeacherProfile':
                return <EditTeacherProfileScreen onProfileUpdate={refreshDashboardProfile} teacherId={teacherId} currentUser={currentUser || profile} />;
            case 'cbtManagement':
                return <CBTManagementScreen navigateTo={navigateTo} teacherId={teacherId} />;
            case 'professionalDevelopment':
                return <ProfessionalDevelopmentScreen />;
            case 'teacherNotificationSettings':
                return <TeacherNotificationSettingsScreen />;
            case 'teacherSecurity':
                return <TeacherSecurityScreen navigateTo={navigateTo} />;
            default:
                return <SettingsPlaceholder />;
        }
    };


    return (
        <div className="flex flex-col md:flex-row h-full bg-gray-50">
            {/* Left Pane: Menu */}
            <div className={`
          w-full md:w-[400px] md:flex-shrink-0 bg-gray-50 flex flex-col
          ${activeSetting ? 'hidden md:flex' : 'flex'}
      `}>
                <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                    <div className="flex flex-col items-center p-6 space-y-2 bg-white rounded-xl shadow-sm">
                        {profile.avatarUrl ? (
                            <img src={profile.avatarUrl} alt={profile.name} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md flex-shrink-0 aspect-square" />
                        ) : (
                            <div className="w-24 h-24 rounded-full border-4 border-white shadow-md flex-shrink-0 bg-gray-200 flex items-center justify-center text-gray-400">
                                <UserIcon className="w-12 h-12" />
                            </div>
                        )}
                        <h3 className="text-2xl font-bold text-gray-800">{profile.name}</h3>
                        <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-3 py-1 rounded-full mb-2">Subject Teacher</span>
                        <div
                            className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full cursor-pointer hover:bg-gray-200 transition-colors"
                            onClick={() => copyToClipboard(customId)}
                        >
                            <span className="text-xs text-gray-600 font-mono font-medium">
                                {formatId(customId) || 'ID: Loading...'}
                            </span>
                            <Copy className="w-3 h-3 text-gray-400" />
                            {copied && <span className="text-xs text-green-600 font-medium">Copied!</span>}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-2">
                        {settingsItems.map((item) => (
                            <button key={item.id} onClick={() => handleItemClick(item.id)} className={`w-full flex items-center justify-between p-3 text-left rounded-lg transition-colors ${activeSetting === item.id ? 'bg-gray-100' : 'hover:bg-gray-50'}`}>
                                <div className="flex items-center space-x-4">
                                    <div className={`p-2 rounded-lg ${item.color}`}>
                                        {React.cloneElement(item.icon, { className: 'h-5 w-5' })}
                                    </div>
                                    <span className="font-semibold text-gray-700">{item.label}</span>
                                </div>
                                <ChevronRightIcon />
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-200">
                    <button onClick={onLogout} className="w-full flex items-center justify-center space-x-2 py-3 px-4 font-medium text-red-500 bg-white rounded-lg shadow-sm border hover:bg-red-50">
                        <LogoutIcon className="h-5 w-5" />
                        <span>Logout</span>
                    </button>
                </div>
            </div>

            {/* Right Pane: Content */}
            <div className={`
          flex-1 flex-col bg-gray-50
          ${activeSetting ? 'flex' : 'hidden md:flex'}
      `}>
                {activeSetting && (
                    <div className="md:hidden p-2 bg-white border-b flex items-center">
                        <button onClick={() => setActiveSetting(null)} className="p-2 rounded-full hover:bg-gray-100">
                            <ChevronLeftIcon className="w-6 h-6 text-gray-600" />
                        </button>
                        <h2 className="font-bold text-lg text-gray-800 ml-2">
                            {settingsItems.find(i => i.id === activeSetting)?.label}
                        </h2>
                    </div>
                )}
                <div className="flex-grow overflow-y-auto">
                    {renderActiveSetting()}
                </div>
            </div>
        </div>
    );
};

export default TeacherSettingsScreen;
