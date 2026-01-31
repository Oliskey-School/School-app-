import React from 'react';
import { HomeIcon, BellIcon, UserIcon as ProfileIcon, DocumentTextIcon, PhoneIcon, PlayIcon, AnalyticsIcon, MegaphoneIcon, SettingsIcon, MessagesIcon, ElearningIcon, SparklesIcon, UserGroupIcon, GameControllerIcon, ChartBarIcon, ClockIcon, LogoutIcon, ReportIcon } from '../../constants';

interface SidebarItemProps {
    icon: React.ReactElement<{ className?: string }>;
    label: string;
    isActive: boolean;
    onClick: () => void;
    activeColor: string;
}

const SidebarItem: React.FC<SidebarItemProps & { id?: string }> = ({ icon, label, isActive, onClick, activeColor }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center space-x-3 px-6 py-4 transition-colors duration-200 ${isActive ? `bg-gray-50 border-r-4 ${activeColor} border-current` : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
    >
        {React.cloneElement(icon, { className: `h-6 w-6 ${isActive ? activeColor : ''}` })}
        <span className={`font-medium ${isActive ? 'text-gray-900' : ''}`}>{label}</span>
    </button>
);

export const StudentSidebar = ({ activeScreen, setActiveScreen, onLogout, schoolName, logoUrl }: { activeScreen: string, setActiveScreen: (screen: string) => void, onLogout?: () => void, schoolName?: string, logoUrl?: string }) => {
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
                {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-contain" />
                ) : (
                    <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{schoolName ? schoolName.charAt(0) : 'S'}</span>
                    </div>
                )}
                <span className="text-xl font-bold text-gray-800 truncate" title={schoolName}>{schoolName || 'School App'}</span>
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

export const AdminSidebar = ({ activeScreen, setActiveScreen, onLogout, schoolName, logoUrl }: { activeScreen: string, setActiveScreen: (screen: string) => void, onLogout?: () => void, schoolName?: string, logoUrl?: string }) => {
    // navItems definition removed in favor of explicit groups below

    return (
        <div className="h-full flex flex-col bg-white border-r border-gray-200">
            <div className="p-6 flex items-center space-x-3 border-b border-gray-100">
                {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-contain" />
                ) : (
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{schoolName ? schoolName.charAt(0) : 'A'}</span>
                    </div>
                )}
                <span className="text-lg font-bold text-gray-800 truncate" title={schoolName}>{schoolName || 'School App'}</span>
            </div>

            <nav className="flex-1 py-6 overflow-y-auto">
                <div className="space-y-1">
                    <SidebarItem id="home" icon={<HomeIcon />} label="Home" isActive={activeScreen === 'home'} onClick={() => setActiveScreen('home')} activeColor="text-indigo-600" />
                    <SidebarItem id="feeManagement" icon={<DocumentTextIcon />} label="Fee Management" isActive={activeScreen === 'feeManagement'} onClick={() => setActiveScreen('feeManagement')} activeColor="text-indigo-600" />
                    <SidebarItem id="messages" icon={<MessagesIcon />} label="Messages" isActive={activeScreen === 'messages'} onClick={() => setActiveScreen('messages')} activeColor="text-indigo-600" />
                    <SidebarItem id="analytics" icon={<AnalyticsIcon />} label="Analytics" isActive={activeScreen === 'analytics'} onClick={() => setActiveScreen('analytics')} activeColor="text-indigo-600" />
                    <SidebarItem id="settings" icon={<SettingsIcon />} label="Settings" isActive={activeScreen === 'settings'} onClick={() => setActiveScreen('settings')} activeColor="text-indigo-600" />
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

export const TeacherSidebar = ({ activeScreen, setActiveScreen, onLogout, schoolName, logoUrl }: { activeScreen: string, setActiveScreen: (screen: string) => void, onLogout?: () => void, schoolName?: string, logoUrl?: string }) => {
    const navItems = [
        { id: 'home', icon: <HomeIcon />, label: 'Home' },
        { id: 'lessonNotes', icon: <DocumentTextIcon />, label: 'Lesson Notes' },
        { id: 'reports', icon: <ReportIcon />, label: 'Reports' },
        { id: 'forum', icon: <UserGroupIcon />, label: 'Forum' },
        { id: 'messages', icon: <MessagesIcon />, label: 'Messages' },
        { id: 'settings', icon: <SettingsIcon />, label: 'Settings' },
    ];

    return (
        <div className="h-full flex flex-col bg-white border-r border-gray-200">
            <div className="p-6 flex items-center space-x-3 border-b border-gray-100">
                {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-contain" />
                ) : (
                    <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{schoolName ? schoolName.charAt(0) : 'T'}</span>
                    </div>
                )}
                <span className="text-xl font-bold text-gray-800 truncate" title={schoolName}>{schoolName || 'School App'}</span>
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

export const ParentSidebar = ({ activeScreen, setActiveScreen, onLogout, schoolName, logoUrl }: { activeScreen: string, setActiveScreen: (screen: string) => void, onLogout?: () => void, schoolName?: string, logoUrl?: string }) => {
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
                {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-contain" />
                ) : (
                    <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{schoolName ? schoolName.charAt(0) : 'P'}</span>
                    </div>
                )}
                <span className="text-xl font-bold text-gray-800 truncate" title={schoolName}>{schoolName || 'School App'}</span>
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

