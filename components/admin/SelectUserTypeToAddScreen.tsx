
import React from 'react';
import { StudentsIcon, StaffIcon, UsersIcon, ChevronRightIcon } from '../../constants';

interface SelectUserTypeToAddScreenProps {
  navigateTo: (view: string, title: string, props?: any) => void;
}

const SelectUserTypeToAddScreen: React.FC<SelectUserTypeToAddScreenProps> = ({ navigateTo }) => {
  const userTypes = [
    { type: 'Student', icon: <StudentsIcon className="h-8 w-8 text-sky-500" />, action: () => navigateTo('addStudent', 'Add New Student', {}) },
    { type: 'Teacher', icon: <StaffIcon className="h-8 w-8 text-purple-500" />, action: () => navigateTo('addTeacher', 'Add New Teacher', {}) },
    { type: 'Parent', icon: <UsersIcon className="h-8 w-8 text-orange-500" />, action: () => navigateTo('addParent', 'Add New Parent', {}) },
  ];

  return (
    <div className="p-4 space-y-4 bg-gray-50 h-full">
      <div className="bg-white p-4 rounded-xl text-center shadow-sm">
        <h3 className="font-bold text-lg text-gray-800">What type of user do you want to add?</h3>
      </div>
      {userTypes.map(userType => (
        <button
          key={userType.type}
          onClick={userType.action}
          className="w-full bg-white rounded-xl shadow-sm p-4 flex items-center justify-between text-left hover:bg-gray-50 hover:ring-2 hover:ring-indigo-200 transition-all"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gray-100 rounded-lg">{userType.icon}</div>
            <p className="font-bold text-lg text-gray-800">{`Add New ${userType.type}`}</p>
          </div>
          <ChevronRightIcon className="text-gray-400" />
        </button>
      ))}
    </div>
  );
};

export default SelectUserTypeToAddScreen;
