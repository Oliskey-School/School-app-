import React from 'react';
import { mockStudents } from '../../data';
import { Student, ClassInfo } from '../../types';
import { ChevronRightIcon, TeacherAttendanceIcon, ClipboardListIcon } from '../../constants';
import { getFormattedClassName } from '../../constants';

interface ClassDetailScreenProps {
  classInfo: ClassInfo;
  navigateTo: (view: string, title: string, props: any) => void;
}

const ClassDetailScreen: React.FC<ClassDetailScreenProps> = ({ classInfo, navigateTo }) => {
  
  const studentsInClass = mockStudents.filter(
    student => student.grade === classInfo.grade && student.section === classInfo.section
  );

  const formattedClassName = getFormattedClassName(classInfo.grade, classInfo.section);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header Info */}
      <div className="p-4 bg-white border-b border-gray-200">
        <h3 className="font-bold text-lg text-gray-800">Students in {formattedClassName}</h3>
        <p className="text-sm text-gray-500">{classInfo.studentCount} total students</p>
      </div>

      {/* Action Buttons */}
      <div className="p-4 grid grid-cols-2 gap-3 bg-white border-b border-gray-200">
        <button onClick={() => navigateTo('markAttendance', `Attendance: ${formattedClassName}`, { classInfo })} className="flex items-center justify-center space-x-2 py-3 px-4 bg-purple-600 text-white font-semibold rounded-xl shadow-md hover:bg-purple-700 transition-colors">
            <TeacherAttendanceIcon className="w-5 h-5" />
            <span>Attendance</span>
        </button>
        <button onClick={() => navigateTo('createAssignment', 'New Assignment', { classInfo })} className="flex items-center justify-center space-x-2 py-3 px-4 bg-amber-500 text-white font-semibold rounded-xl shadow-md hover:bg-amber-600 transition-colors">
            <ClipboardListIcon className="w-5 h-5" />
            <span>New Assignment</span>
        </button>
      </div>
      
      {/* Student List */}
      <main className="flex-grow p-4 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {studentsInClass.map(student => (
            <button 
              key={student.id} 
              onClick={() => navigateTo('studentProfile', student.name, { student })}
              className="w-full bg-white rounded-xl shadow-sm p-3 flex items-center space-x-4 transition-all hover:shadow-md hover:ring-2 hover:ring-purple-200"
              aria-label={`View profile for ${student.name}`}
            >
              <img src={student.avatarUrl} alt={student.name} className="w-12 h-12 rounded-full object-cover" />
              <div className="flex-grow text-left">
                <p className="font-bold text-gray-800">{student.name}</p>
                <p className="text-sm text-gray-500">ID: SCH-0{student.id}</p>
              </div>
              <ChevronRightIcon className="text-gray-400" />
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};

export default ClassDetailScreen;