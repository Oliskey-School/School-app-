

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
// FIX: Corrected import for MessagesIcon and added HomeIcon and SettingsIcon.
import { HomeIcon, BellIcon, UserIcon as ProfileIcon, DocumentTextIcon, PhoneIcon, PlayIcon, AnalyticsIcon, MegaphoneIcon, SettingsIcon, MessagesIcon, ElearningIcon, SparklesIcon, UserGroupIcon, GameControllerIcon, ChartBarIcon, ClockIcon } from '../../constants';
import { LayoutDashboard, Wallet, ShieldCheck, BookOpen, Beaker, Users, Building2 } from 'lucide-react';

// ⚠️ PERMANENT, OWNER-LOCKED NAV SETS ⚠️
// The item list (count, labels, order) in EVERY *BottomNav component below —
// Admin, Teacher, Parent, Student (and any other role added later) — is fixed
// by explicit owner instruction. Do NOT add, remove, or reorder any item in
// any of these navItems arrays for any reason (feature additions, dedup
// passes, "helpful" shortcuts, etc.) without first stopping and getting
// explicit confirmation from the owner. If a new feature needs a nav-level
// entry point, add it to that role's Quick Actions/home-screen tiles instead
// — never to this file.
const NavItem: React.FC<{ icon: React.ReactElement<{ className?: string }>, label: string, navId?: string, isActive: boolean, onClick: () => void, activeColor: string }> = ({ icon, label, navId, isActive, onClick, activeColor }) => {
  const { t } = useTranslation();
  // Translate by the stable nav id (falls back to the English label for any id
  // without a key yet), so the bottom nav follows the chosen language everywhere.
  const text = navId ? t(`nav.${navId}`, { defaultValue: label }) : label;
  return (
  <motion.button
    whileTap={{ scale: 0.88 }}
    onClick={onClick}
    aria-current={isActive ? 'page' : undefined}
    aria-label={text}
    className={`flex-1 flex flex-col items-center justify-center space-y-1 transition-colors duration-200 ${isActive ? activeColor : 'text-gray-500'}`}
  >
    <motion.div animate={{ scale: isActive ? 1.1 : 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
      {React.cloneElement(icon, { className: `h-6 w-6`, 'aria-hidden': true } as any)}
    </motion.div>
    <span className="text-xs font-medium">{text}</span>
  </motion.button>
  );
};

export const AdminBottomNav = ({ activeScreen, setActiveScreen }: { activeScreen: string, setActiveScreen: (screen: string) => void }) => {
  const navItems = [
    { id: 'home', icon: <HomeIcon />, label: 'Home' },
    { id: 'messages', icon: <MessagesIcon />, label: 'Messages' },
    { id: 'feeManagement', icon: <DocumentTextIcon />, label: 'Fees' },
    { id: 'analytics', icon: <AnalyticsIcon />, label: 'Analytics' },
    { id: 'settings', icon: <SettingsIcon />, label: 'Settings' },
  ];
  return (
    <div className="w-full bg-white/95 backdrop-blur-sm border-t border-gray-100 p-2 flex justify-around items-center print:hidden">
      {navItems.map(item => (
        <NavItem key={item.id} icon={item.icon} label={item.label} navId={item.id} isActive={activeScreen === item.id} onClick={() => setActiveScreen(item.id)} activeColor="text-indigo-600" />
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
        <NavItem key={item.id} icon={item.icon} label={item.label} navId={item.id} isActive={activeScreen === item.id} onClick={() => setActiveScreen(item.id)} activeColor="text-[#7B61FF]" />
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
        <NavItem key={item.id} icon={item.icon} label={item.label} navId={item.id} isActive={activeScreen === item.id} onClick={() => setActiveScreen(item.id)} activeColor="text-[#4CAF50]" />
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
        <NavItem key={item.id} icon={item.icon} label={item.label} navId={item.id} isActive={activeScreen === item.id} onClick={() => setActiveScreen(item.id)} activeColor="text-[#FF9800]" />
      ))}
    </div>
  );
};

export const ProprietorBottomNav = ({ activeScreen, setActiveScreen }: { activeScreen: string, setActiveScreen: (screen: string) => void }) => {
  const navItems = [
    { id: 'overview', icon: <LayoutDashboard />, label: 'Overview' },
    { id: 'finance', icon: <Wallet />, label: 'Finance' },
    { id: 'compliance', icon: <ShieldCheck />, label: 'Audit' },
    { id: 'academic', icon: <BookOpen />, label: 'Academic' },
    { id: 'stem', icon: <Beaker />, label: 'STEM' },
    { id: 'people', icon: <Users />, label: 'People' },
  ];
  return (
    <div className="w-full bg-white/95 backdrop-blur-sm border-t border-gray-100 p-2 flex justify-around items-center print:hidden">
      {navItems.map(item => (
        <NavItem key={item.id} icon={item.icon} label={item.label} navId={item.id} isActive={activeScreen === item.id} onClick={() => setActiveScreen(item.id)} activeColor="text-indigo-600" />
      ))}
    </div>
  );
};

export const InspectorBottomNav = ({ activeScreen, setActiveScreen }: { activeScreen: string, setActiveScreen: (screen: string) => void }) => {
  const navItems = [
    { id: 'overview', icon: <HomeIcon />, label: 'Home' },
    { id: 'schoolSearch', icon: <BookOpen />, label: 'Search' },
    { id: 'inspectionHistory', icon: <ShieldCheck />, label: 'History' },
  ];
  return (
    <div className="w-full bg-white/95 backdrop-blur-sm border-t border-gray-100 p-2 flex justify-around items-center print:hidden">
      {navItems.map(item => (
        <NavItem key={item.id} icon={item.icon} label={item.label} navId={item.id} isActive={activeScreen === item.id} onClick={() => setActiveScreen(item.id)} activeColor="text-indigo-600" />
      ))}
    </div>
  );
};