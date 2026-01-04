

import React from 'react';
// FIX: Corrected import for MessagesIcon and added HomeIcon and SettingsIcon.
import { HomeIcon, BellIcon, UserIcon as ProfileIcon, DocumentTextIcon, PhoneIcon, PlayIcon, AnalyticsIcon, MegaphoneIcon, SettingsIcon, MessagesIcon, ElearningIcon, SparklesIcon, UserGroupIcon, GameControllerIcon, ChartBarIcon, ClockIcon } from '../../constants';

const NavItem: React.FC<{ icon: React.ReactElement<{ className?: string }>, label: string, isActive: boolean, onClick: () => void, activeColor: string }> = ({ icon, label, isActive, onClick, activeColor }) => (
  <button onClick={onClick} className={`flex-1 flex flex-col items-center justify-center space-y-1 transition-colors duration-200 ${isActive ? activeColor : 'text-gray-500'}`}>
    {React.cloneElement(icon, { className: `h-6 w-6` })}
    <span className="text-xs font-medium">{label}</span>
  </button>
);

export const AdminBottomNav = ({ activeScreen, setActiveScreen }: { activeScreen: string, setActiveScreen: (screen: string) => void }) => {
  const navItems = [
    { id: 'home', icon: <HomeIcon />, label: 'Home' },
    { id: 'feeManagement', icon: <DocumentTextIcon />, label: 'Fees' },
    { id: 'messages', icon: <MessagesIcon />, label: 'Messages' },
    { id: 'analytics', icon: <AnalyticsIcon />, label: 'Analytics' },
    { id: 'settings', icon: <SettingsIcon />, label: 'Settings' },
  ];
  return (
    <div className="w-full bg-white/95 backdrop-blur-sm border-t border-gray-100 p-2 flex justify-around items-center print:hidden">
      {navItems.map(item => (
        <NavItem key={item.id} icon={item.icon} label={item.label} isActive={activeScreen === item.id} onClick={() => setActiveScreen(item.id)} activeColor="text-indigo-600" />
      ))}
    </div>
  );
};

export const TeacherBottomNav = ({ activeScreen, setActiveScreen }: { activeScreen: string, setActiveScreen: (screen: string) => void }) => {
  const navItems = [
    { id: 'home', icon: <HomeIcon />, label: 'Home' },
    { id: 'reports', icon: <DocumentTextIcon />, label: 'Reports' },
    { id: 'forum', icon: <UserGroupIcon />, label: 'Forum' },
    { id: 'messages', icon: <MessagesIcon />, label: 'Messages' },
    { id: 'settings', icon: <SettingsIcon />, label: 'Settings' },
  ];
  return (
    <div className="w-full bg-white/95 backdrop-blur-sm border-t border-gray-100 p-2 flex justify-around items-center print:hidden">
      {navItems.map(item => (
        <NavItem key={item.id} icon={item.icon} label={item.label} isActive={activeScreen === item.id} onClick={() => setActiveScreen(item.id)} activeColor="text-[#7B61FF]" />
      ))}
    </div>
  );
};

export const ParentBottomNav = ({ activeScreen, setActiveScreen }: { activeScreen: string, setActiveScreen: (screen: string) => void }) => {
  const navItems = [
    { id: 'home', icon: <HomeIcon />, label: 'Home' },
    { id: 'fees', icon: <DocumentTextIcon />, label: 'Fees' },
    { id: 'reports', icon: <DocumentTextIcon />, label: 'Reports' },
    { id: 'messages', icon: <MessagesIcon />, label: 'Messages' },
    { id: 'more', icon: <ProfileIcon />, label: 'More' },
  ];
  return (
    <div className="w-full bg-white/95 backdrop-blur-sm border-t border-gray-100 p-2 flex justify-around items-center print:hidden">
      {navItems.map(item => (
        <NavItem key={item.id} icon={item.icon} label={item.label} isActive={activeScreen === item.id} onClick={() => setActiveScreen(item.id)} activeColor="text-[#4CAF50]" />
      ))}
    </div>
  );
};

export const StudentBottomNav = ({ activeScreen, setActiveScreen }: { activeScreen: string, setActiveScreen: (screen: string) => void }) => {
  const navItems = [
    { id: 'home', icon: <HomeIcon />, label: 'Home' },
    { id: 'quizzes', icon: <ClockIcon />, label: 'Quizzes' },
    { id: 'games', icon: <GameControllerIcon />, label: 'Games' },
    { id: 'messages', icon: <MessagesIcon />, label: 'Messages' },
    { id: 'profile', icon: <ProfileIcon />, label: 'Profile' },
  ];
  return (
    <div className="w-full bg-white/95 backdrop-blur-sm border-t border-gray-100 p-2 flex justify-around items-center print:hidden">
      {navItems.map(item => (
        <NavItem key={item.id} icon={item.icon} label={item.label} isActive={activeScreen === item.id} onClick={() => setActiveScreen(item.id)} activeColor="text-[#FF9800]" />
      ))}
    </div>
  );
};