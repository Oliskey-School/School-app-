
import React from 'react';
import { motion } from 'framer-motion';
import { StudentsIcon, StaffIcon, UsersIcon, ChevronRightIcon } from '../../constants';

interface SelectUserTypeToAddScreenProps {
  navigateTo: (view: string, title: string, props?: any) => void;
}

const SelectUserTypeToAddScreen: React.FC<SelectUserTypeToAddScreenProps> = ({ navigateTo }) => {
  const userTypes = [
    { type: 'Student', icon: <StudentsIcon className="h-8 w-8 text-blue-700" />, action: () => navigateTo('addStudent', 'Add New Student', {}) },
    { type: 'Teacher', icon: <StaffIcon className="h-8 w-8 text-purple-500" />, action: () => navigateTo('addTeacher', 'Add New Teacher', {}) },
    { type: 'Parent', icon: <UsersIcon className="h-8 w-8 text-orange-500" />, action: () => navigateTo('addParent', 'Add New Parent', {}) },
    { type: 'Branch Admin', icon: <UsersIcon className="h-8 w-8 text-indigo-500" />, action: () => navigateTo('addBranchAdmin', 'Add Branch Admin', {}) },
  ];

  return (
    <div className="p-4 space-y-4 bg-gray-50 h-full">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="bg-white p-4 rounded-xl text-center shadow-sm">
        <h3 className="font-bold text-lg text-gray-800">What type of user do you want to add?</h3>
      </motion.div>
      {userTypes.map((userType, i) => (
        <motion.button
          key={userType.type}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: i * 0.06 }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={userType.action}
          className="w-full bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-4 flex items-center justify-between text-left hover:ring-2 hover:ring-indigo-200"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gray-100 rounded-lg">{userType.icon}</div>
            <p className="font-bold text-lg text-gray-800">{`Add New ${userType.type}`}</p>
          </div>
          <ChevronRightIcon className="text-gray-400" />
        </motion.button>
      ))}
    </div>
  );
};

export default SelectUserTypeToAddScreen;
