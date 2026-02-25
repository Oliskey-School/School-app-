
import React, { useEffect, useState } from 'react';
import { Student } from '../../types';
import { fetchStudentsByClass } from '../../lib/database';
import { ChevronRightIcon, UserIcon, getFormattedClassName } from '../../constants';

interface AdminStudentListForReportProps {
  classInfo: { grade: number; section: string; department?: string; };
  navigateTo: (view: string, title: string, props?: any) => void;
}

const AdminStudentListForReport: React.FC<AdminStudentListForReportProps> = ({ classInfo, navigateTo }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStudents = async () => {
      setLoading(true);
      const data = await fetchStudentsByClass(classInfo.grade, classInfo.section);
      setStudents(data);
      setLoading(false);
    };

    loadStudents();
  }, [classInfo.grade, classInfo.section]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium animate-pulse">Loading class roster...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <h3 className="font-bold text-gray-800 text-lg">
          {classInfo.department ? `${classInfo.department} ` : ''}
          {getFormattedClassName(classInfo.grade, classInfo.section)}
        </h3>
        <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
          {students.length} Students
        </span>
      </div>

      <main className="flex-grow p-4 space-y-3 overflow-y-auto">
        {students.map((student, index) => (
          <button
            key={student.id}
            onClick={() => navigateTo('adminSelectTermForReport', `Select Term for ${student.name}`, { student })}
            className="w-full bg-white rounded-2xl p-4 flex items-center space-x-4 transition-all duration-200 hover:shadow-lg hover:translate-x-1 hover:bg-indigo-50/30 border border-transparent hover:border-indigo-100 group animate-slide-in-up"
            style={{ animationDelay: `${index * 50}ms` }}
            aria-label={`View report for ${student.name}`}
          >
            <div className="relative">
              {student.avatarUrl ? (
                <img
                  src={student.avatarUrl}
                  alt={student.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm group-hover:border-indigo-200 transition-colors"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-white shadow-sm group-hover:border-indigo-200 transition-colors text-indigo-500">
                  <UserIcon className="w-6 h-6" />
                </div>
              )}
              <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${student.attendanceStatus === 'Present' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            </div>

            <div className="flex-grow text-left">
              <p className="font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">{student.name}</p>
              <p className="text-xs text-gray-500 font-medium tracking-wide">ID: <span className="font-mono text-gray-400">{student.schoolGeneratedId || 'Pending'}</span></p>
            </div>

            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
              <ChevronRightIcon className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors" />
            </div>
          </button>
        ))}

        {students.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="bg-gray-100 p-4 rounded-full mb-4">
              <UserIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">No Students Found</h3>
            <p className="text-gray-500 text-sm max-w-xs mx-auto">
              There are no students assigned to this class section yet.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminStudentListForReport;
