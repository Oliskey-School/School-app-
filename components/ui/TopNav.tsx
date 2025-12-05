

import React from 'react';
import { DashboardType } from '../../types';
import { 
    THEME_CONFIG,
    HomeIcon,
    PhoneIcon,
    DocumentTextIcon,
    SettingsIcon
} from '../../constants';

interface TopNavProps {
  activeScreen: string;
  setActiveScreen: (screen: string) => void;
}

const TopNav: React.FC<TopNavProps> = ({ activeScreen, setActiveScreen }) => {
  const theme = THEME_CONFIG[DashboardType.Admin];
  
  const navItems = [
    { id: 'home', icon: <HomeIcon />, label: 'Dashboard' },
    { id: 'communication', icon: <PhoneIcon />, label: 'Communication' },
    { id: 'records', icon: <DocumentTextIcon />, label: 'Records' },
    { id: 'settings', icon: <SettingsIcon />, label: 'Settings' },
  ];

  return (
    <div className="w-full bg-white border-b border-gray-200 py-2 px-6 flex justify-around items-center sticky top-0 z-20">
      {navItems.map((item) => {
        const isActive = activeScreen === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveScreen(item.id)}
            aria-label={item.label}
            className={`p-2 transition-colors duration-200 rounded-lg ${isActive ? theme.activeNav : theme.inactiveNav} hover:bg-gray-100`}
          >
            {React.cloneElement(item.icon, { className: 'h-6 w-6' })}
          </button>
        );
      })}
    </div>
  );
};

export default TopNav;