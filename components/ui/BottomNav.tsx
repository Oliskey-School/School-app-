
import React from 'react';
import { motion } from 'framer-motion';
import { DashboardType } from '../../types';
import { AdminIcon, TeacherNavIcon, ParentNavIcon, StudentNavIcon, THEME_CONFIG } from '../../constants';

interface BottomNavProps {
  activeDashboard: DashboardType;
  setActiveDashboard: (dashboard: DashboardType) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeDashboard, setActiveDashboard }) => {
  const theme = THEME_CONFIG[activeDashboard];
  
  const navItems = [
    { type: DashboardType.Admin, icon: <AdminIcon /> },
    { type: DashboardType.Teacher, icon: <TeacherNavIcon /> },
    { type: DashboardType.Parent, icon: <ParentNavIcon /> },
    { type: DashboardType.Student, icon: <StudentNavIcon /> },
  ];

  return (
    <div className="w-full bg-white border-t border-gray-200 py-2 px-4 flex justify-around items-center">
      {navItems.map((item) => {
        const isActive = activeDashboard === item.type;
        return (
          <motion.button
            key={item.type}
            whileTap={{ scale: 0.9 }}
            onClick={() => setActiveDashboard(item.type)}
            aria-label={`${item.type} Dashboard`}
            className={`flex flex-col items-center justify-center space-y-1 transition-colors duration-200 ${isActive ? theme.iconColor : 'text-gray-400'}`}
          >
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={`p-2 rounded-full ${isActive ? theme.cardBg : 'bg-transparent'}`}
            >
              {React.cloneElement(item.icon, { className: 'h-7 w-7' })}
            </motion.div>
          </motion.button>
        );
      })}
    </div>
  );
};

export default BottomNav;