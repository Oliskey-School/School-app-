import React from 'react';
import { HomeIcon, BellIcon, UserIcon as ProfileIcon, DocumentTextIcon, PhoneIcon, PlayIcon, AnalyticsIcon, MegaphoneIcon, SettingsIcon, MessagesIcon, ElearningIcon, SparklesIcon, UserGroupIcon, GameControllerIcon, ChartBarIcon, ClockIcon, LogoutIcon, ReportIcon } from '../../constants';

interface SidebarItemProps {
    icon: React.ReactElement<{ className?: string }>;
    label: string;
    isActive: boolean;
    onClick: () => void;
    activeColor: string;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, isActive, onClick, activeColor }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center space-x-3 px-6 py-4 transition-colors duration-200 ${isActive ? `bg-gray-50 border-r-4 ${activeColor} border-current` : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
    >
        {React.cloneElement(icon, { className: `h-6 w-6 ${isActive ? activeColor : ''}` })}
        <span className={`font-medium ${isActive ? 'text-gray-900' : ''}`}>{label}</span>
    </button>
);

export const StudentSidebar = ({ activeScreen, setActiveScreen, onLogout }: { activeScreen: string, setActiveScreen: (screen: string) => void, onLogout?: () => void }) => {
    const navItems = [
        { id: 'home', icon: <HomeIcon />, label: 'Home' },
        { id: 'quizzes', icon: <ClockIcon />, label: 'Quizzes' },
        { id: 'games', icon: <GameControllerIcon />, label: 'Games' },
        { id: 'messages', icon: <MessagesIcon />, label: 'Messages' },
        { id: 'profile', icon: <ProfileIcon />, label: 'Profile' },
    ];

    return (
        <div className="h-full flex flex-col bg-white border-r border-gray-200">
            <div className="p-6 flex items-center space-x-3 border-b border-gray-100">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">S</span>
                </div>
                <span className="text-xl font-bold text-gray-800">School App</span>
            </div>

            <nav className="flex-1 py-6 overflow-y-auto">
                <div className="space-y-1">
                    {navItems.map(item => (
                        <SidebarItem
                            key={item.id}
                            icon={item.icon}
                            label={item.label}
                            isActive={activeScreen === item.id}
                            onClick={() => setActiveScreen(item.id)}
                            activeColor="text-orange-500"
                        />
                    ))}
                </div>
            </nav>

            {onLogout && (
                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <LogoutIcon className="h-6 w-6" />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export const AdminSidebar = ({ activeScreen, setActiveScreen, onLogout }: { activeScreen: string, setActiveScreen: (screen: string) => void, onLogout?: () => void }) => {
    const navItems = [
        { id: 'home', icon: <HomeIcon />, label: 'Home' },
        { id: 'feeManagement', icon: <DocumentTextIcon />, label: 'Fee Management' },
        { id: 'messages', icon: <MessagesIcon />, label: 'Messages' },
        { id: 'analytics', icon: <AnalyticsIcon />, label: 'Analytics' },
        { id: 'settings', icon: <SettingsIcon />, label: 'Settings' },
    ];

    return (
        <div className="h-full flex flex-col bg-white border-r border-gray-200">
            <div className="p-6 flex items-center space-x-3 border-b border-gray-100">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">A</span>
                </div>
                <span className="text-xl font-bold text-gray-800">School App</span>
            </div>

            <nav className="flex-1 py-6 overflow-y-auto">
                <div className="space-y-1">
                    {navItems.map(item => (
                        <SidebarItem
                            key={item.id}
                            icon={item.icon}
                            label={item.label}
                            isActive={activeScreen === item.id}
                            onClick={() => setActiveScreen(item.id)}
                            activeColor="text-indigo-600"
                        />
                    ))}
                </div>
            </nav>

            {onLogout && (
                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <LogoutIcon className="h-6 w-6" />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export const TeacherSidebar = ({ activeScreen, setActiveScreen, onLogout }: { activeScreen: string, setActiveScreen: (screen: string) => void, onLogout?: () => void }) => {
    const navItems = [
        { id: 'home', icon: <HomeIcon />, label: 'Home' },
        { id: 'reports', icon: <ReportIcon />, label: 'Reports' },
        { id: 'forum', icon: <UserGroupIcon />, label: 'Forum' },
        { id: 'messages', icon: <MessagesIcon />, label: 'Messages' },
        { id: 'settings', icon: <SettingsIcon />, label: 'Settings' },
    ];

    return (
        <div className="h-full flex flex-col bg-white border-r border-gray-200">
            <div className="p-6 flex items-center space-x-3 border-b border-gray-100">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">T</span>
                </div>
                <span className="text-xl font-bold text-gray-800">School App</span>
            </div>

            <nav className="flex-1 py-6 overflow-y-auto">
                <div className="space-y-1">
                    {navItems.map(item => (
                        <SidebarItem
                            key={item.id}
                            icon={item.icon}
                            label={item.label}
                            isActive={activeScreen === item.id}
                            onClick={() => setActiveScreen(item.id)}
                            activeColor="text-purple-600"
                        />
                    ))}
                </div>
            </nav>

            {onLogout && (
                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <LogoutIcon className="h-6 w-6" />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export const ParentSidebar = ({ activeScreen, setActiveScreen, onLogout }: { activeScreen: string, setActiveScreen: (screen: string) => void, onLogout?: () => void }) => {
    const navItems = [
        { id: 'home', icon: <HomeIcon />, label: 'Home' },
        { id: 'fees', icon: <DocumentTextIcon />, label: 'Fee Status' },
        { id: 'reports', icon: <ReportIcon />, label: 'Reports' },
        { id: 'messages', icon: <MessagesIcon />, label: 'Messages' },
        { id: 'more', icon: <SettingsIcon />, label: 'More' },
    ];

    return (
        <div className="h-full flex flex-col bg-white border-r border-gray-200">
            <div className="p-6 flex items-center space-x-3 border-b border-gray-100">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">P</span>
                </div>
                <span className="text-xl font-bold text-gray-800">School App</span>
            </div>

            <nav className="flex-1 py-6 overflow-y-auto">
                <div className="space-y-1">
                    {navItems.map(item => (
                        <SidebarItem
                            key={item.id}
                            icon={item.icon}
                            label={item.label}
                            isActive={activeScreen === item.id}
                            onClick={() => setActiveScreen(item.id)}
                            activeColor="text-green-600"
                        />
                    ))}
                </div>
            </nav>

            {onLogout && (
                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <LogoutIcon className="h-6 w-6" />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            )}
        </div>
    );
};

