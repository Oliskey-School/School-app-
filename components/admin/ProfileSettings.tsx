
import React, { useState } from 'react';
import {
    EditIcon,
    NotificationIcon,
    SecurityIcon,
    HelpIcon,
    LogoutIcon,
    ChevronRightIcon,
    SettingsIcon,
    ChevronLeftIcon,
    UserIcon,
    SchoolIcon
} from '../../constants';
import { Copy as CopyIcon, RefreshCw as RefreshIcon } from 'lucide-react';
import EditProfileScreen from './EditProfileScreen';
import NotificationsSettingsScreen from './NotificationsSettingsScreen';
import PersonalSecuritySettingsScreen from './PersonalSecuritySettingsScreen';
import { useProfile } from '../../context/ProfileContext';
import { useAuth } from '../../context/AuthContext';
import { useUserIdentity } from '../../lib/hooks/useUserIdentity';
import { toast } from 'react-hot-toast';

type SettingView = 'editProfile' | 'notificationsSettings' | 'personalSecuritySettings' | null;

interface ProfileSettingsProps {
    onLogout: () => void;
    navigateTo: (view: string, title: string, props?: any) => void;
}

const SettingsPlaceholder: React.FC = () => (
    <div className="flex-col items-center justify-center h-full text-center text-gray-500 bg-[#F0F2F5] border-l border-gray-300/80 hidden md:flex">
        <SettingsIcon className="w-24 h-24 text-gray-300" />
        <h1 className="text-3xl font-light text-gray-600 mt-4">Profile Settings</h1>
        <p className="mt-2 text-sm text-gray-500 max-w-sm">
            Select an item from the left to view and edit your settings.
        </p>
    </div>
);


const ProfileSettings: React.FC<ProfileSettingsProps> = ({ onLogout, navigateTo }) => {
    const { profile } = useProfile();
    const { memberships, switchSchool, currentSchool } = useAuth();
    const { customId, copyToClipboard, copied, formatId } = useUserIdentity();
    const [activeSetting, setActiveSetting] = useState<SettingView>(null);
    const [isSwitching, setIsSwitching] = useState(false);

    const handleSwitchSchool = async (schoolId: string) => {
        if (schoolId === currentSchool?.id) return;
        setIsSwitching(true);
        try {
            await switchSchool(schoolId);
            toast.success('Switched school successfully');
        } catch (err) {
            toast.error('Failed to switch school');
        } finally {
            setIsSwitching(false);
        }
    };

    if (!profile) return <div className="p-8 text-center text-gray-500">No profile data found. Please try logging in again.</div>;

    const settingsItems = [
        { id: 'editProfile', icon: <EditIcon />, label: 'Edit Profile', color: 'bg-blue-100 text-blue-500' },
        { id: 'notificationsSettings', icon: <NotificationIcon />, label: 'Notifications', color: 'bg-green-100 text-green-500' },
        { id: 'personalSecuritySettings', icon: <SecurityIcon />, label: 'My Security', color: 'bg-orange-100 text-orange-500' },
        { id: 'help', icon: <HelpIcon />, label: 'Help & Support', color: 'bg-purple-100 text-purple-500' },
    ];

    const handleItemClick = (id: string) => {
        if (id === 'help') {
            toast('Help Center coming soon!', { icon: 'ℹ️' });
        } else {
            // On small screens, this will fill the screen. On large, it will show the right pane.
            setActiveSetting(id as SettingView);
        }
    };

    const renderActiveSetting = () => {
        switch (activeSetting) {
            case 'editProfile':
                return <EditProfileScreen />;
            case 'notificationsSettings':
                return <NotificationsSettingsScreen />;
            case 'personalSecuritySettings':
                return <PersonalSecuritySettingsScreen navigateTo={navigateTo} />;
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
                        <img
                            src={profile.avatar_url || 'https://i.pravatar.cc/150?u=admin'}
                            alt={profile.full_name}
                            className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md flex-shrink-0 aspect-square bg-gray-200"
                        />
                        <h3 className="text-2xl font-bold text-gray-800">{profile.full_name}</h3>
                        <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-3 py-1 rounded-full mb-2 capitalize">
                            {profile.role === 'admin' ? 'Administrator' : (profile.role || 'Administrator')}
                        </span>

                        {/* ID Display */}
                        <div
                            className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full cursor-pointer hover:bg-gray-200 transition-colors"
                            onClick={() => copyToClipboard(formatId(customId || (profile as any).school_generated_id))}
                        >
                            <span className="text-xs text-gray-600 font-mono font-medium">
                                {formatId(customId || (profile as any).school_generated_id) || 'ID: Loading...'}
                            </span>
                            <CopyIcon className="w-3 h-3 text-gray-400" />
                            {copied && <span className="text-xs text-green-600 font-medium ml-1">Copied!</span>}
                        </div>

                        {/* Stats Row */}
                        <div className="flex w-full justify-around mt-4 pt-4 border-t border-gray-100">
                            <div className="text-center">
                                <p className="text-xs text-gray-500 font-medium">Staff</p>
                                <p className="text-lg font-bold text-gray-800">-</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-gray-500 font-medium">Students</p>
                                <p className="text-lg font-bold text-gray-800">-</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-gray-500 font-medium">Status</p>
                                <p className="text-lg font-bold text-green-600">Active</p>
                            </div>
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

                    <div className="bg-white rounded-xl shadow-sm p-2">
                        <button onClick={() => navigateTo('systemSettings', 'System Settings')} className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-4">
                                <div className="p-2 rounded-lg bg-gray-100 text-gray-500"><SettingsIcon className="h-5 w-5" /></div>
                                <div>
                                    <span className="font-semibold text-gray-700">System Settings</span>
                                    <p className="text-xs text-gray-500">Manage school-wide configurations</p>
                                </div>
                            </div>
                            <ChevronRightIcon />
                        </button>
                    </div>

                    {/* School Switcher Section */}
                    {memberships.length > 1 && (
                        <div className="space-y-2">
                            <h4 className="px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Your Schools</h4>
                            <div className="bg-white rounded-xl shadow-sm p-2 space-y-1">
                                {memberships.map((m) => (
                                    <button
                                        key={m.school_id}
                                        onClick={() => handleSwitchSchool(m.school_id)}
                                        disabled={isSwitching}
                                        className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${m.school_id === currentSchool?.id
                                            ? 'bg-purple-50 border border-purple-100'
                                            : 'hover:bg-gray-50 text-gray-600'
                                            }`}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className={`p-2 rounded-lg ${m.school_id === currentSchool?.id ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'}`}>
                                                <SchoolIcon className="h-4 w-4" />
                                            </div>
                                            <div className="text-left">
                                                <p className={`font-semibold text-sm ${m.school_id === currentSchool?.id ? 'text-purple-700' : 'text-gray-700'}`}>
                                                    {m.schools?.name || 'School'}
                                                </p>
                                                <p className="text-[10px] text-gray-500 capitalize">{m.role}</p>
                                            </div>
                                        </div>
                                        {m.school_id === currentSchool?.id ? (
                                            <div className="flex items-center gap-1">
                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                <span className="text-[10px] font-bold text-green-600 uppercase">Active</span>
                                            </div>
                                        ) : (
                                            <RefreshIcon className={`w-3 h-3 text-gray-300 ${isSwitching ? 'animate-spin' : ''}`} />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
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

export default ProfileSettings;
