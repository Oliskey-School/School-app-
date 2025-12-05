
import React from 'react';
import { Student } from '../../types';
import { mockStudents } from '../../data';
import { ChevronRightIcon } from '../../constants';

interface AdminStudentListForReportProps {
  classInfo: { grade: number; section: string; };
  navigateTo: (view: string, title: string, props?: any) => void;
}

const AdminStudentListForReport: React.FC<AdminStudentListForReportProps> = ({ classInfo, navigateTo }) => {
  const studentsInClass = mockStudents.filter(
    student => student.grade === classInfo.grade && student.section === classInfo.section
  );

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <main className="flex-grow p-4 space-y-3 overflow-y-auto">
        {studentsInClass.map(student => (
          <button 
            key={student.id} 
            onClick={() => navigateTo('adminSelectTermForReport', `Select Term for ${student.name}`, { student })}
            className="w-full bg-white rounded-xl shadow-sm p-3 flex items-center space-x-4 transition-all hover:shadow-md hover:ring-2 hover:ring-indigo-200"
            aria-label={`View report for ${student.name}`}
          >
            <img src={student.avatarUrl} alt={student.name} className="w-12 h-12 rounded-full object-cover" />
            <div className="flex-grow text-left">
              <p className="font-bold text-gray-800">{student.name}</p>
              <p className="text-sm text-gray-500">ID: SCH-0{student.id}</p>
            </div>
            <ChevronRightIcon className="text-gray-400" />
          </button>
        ))}
        {studentsInClass.length === 0 && (
            <div className="text-center py-10 bg-white rounded-lg shadow-sm">
                <p className="text-gray-500">No students found in this class.</p>
            </div>
        )}
      </main>
    </div>
  );
};

export default AdminStudentListForReport;
