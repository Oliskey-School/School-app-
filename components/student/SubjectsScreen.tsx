

import React from 'react';
import { Student, Teacher } from '../../types';
import { mockStudents, mockTeachers } from '../../data';
import { SUBJECT_COLORS, BookOpenIcon, ChevronRightIcon } from '../../constants';

// For this demo, we'll use the logged-in student (ID 4)
const student: Student = mockStudents.find(s => s.id === 4)!;

interface SubjectsScreenProps {
  navigateTo: (view: string, title: string, props?: any) => void;
}

const SubjectsScreen: React.FC<SubjectsScreenProps> = ({ navigateTo }) => {
  const studentSubjects = [...new Set(student.academicPerformance?.map(p => p.subject) || [])];

  const getTeacherForSubject = (subjectName: string): Teacher | undefined => {
    return mockTeachers.find(teacher => teacher.subjects.includes(subjectName));
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <main className="flex-grow p-4 space-y-4 overflow-y-auto">
        <div className="bg-orange-50 p-4 rounded-xl text-center border border-orange-200">
            <BookOpenIcon className="h-10 w-10 mx-auto text-orange-400 mb-2"/>
            <h3 className="font-bold text-lg text-orange-800">My Subjects</h3>
            <p className="text-sm text-orange-700">Select a subject to enter its classroom page.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {studentSubjects.map(subjectName => {
            const teacher = getTeacherForSubject(subjectName);
            const colorClass = SUBJECT_COLORS[subjectName] || 'bg-gray-200 text-gray-800';
            const [bgColor, textColor] = colorClass.split(' ');

            return (
                <button 
                key={subjectName} 
                onClick={() => navigateTo('classroom', `${subjectName} Classroom`, { subjectName })}
                className="w-full bg-white rounded-xl shadow-sm p-4 flex items-center justify-between text-left hover:bg-gray-50 hover:ring-2 hover:ring-orange-200 transition-all"
                >
                <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-lg ${bgColor} flex items-center justify-center`}>
                        <BookOpenIcon className={`w-6 h-6 ${textColor}`} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-gray-800">{subjectName}</h3>
                        <p className="text-sm text-gray-800 font-medium">
                        Taught by: {teacher ? teacher.name : 'N/A'}
                        </p>
                    </div>
                </div>
                <ChevronRightIcon className="text-gray-400" />
                </button>
            );
            })}
        </div>
      </main>
    </div>
  );
};

export default SubjectsScreen;