
import React, { useEffect, useState } from 'react';
import { Student, Teacher } from '../../types';
import { fetchClassSubjects } from '../../lib/database';
import { SUBJECT_COLORS, BookOpenIcon, ChevronRightIcon } from '../../constants';
// Removed mockStudents import

interface SubjectsScreenProps {
  navigateTo: (view: string, title: string, props?: any) => void;
  student?: Student; // Make student optional but expected
}

const SubjectsScreen: React.FC<SubjectsScreenProps> = ({ navigateTo, student }) => {
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSubjects = async () => {
      if (!student) return;

      setLoading(true);
      // If student has academicPerformance populated, use it
      if (student.academicPerformance?.length) {
        setSubjects([...new Set(student.academicPerformance.map(p => p.subject))]);
      } else {
        // Otherwise fetch from db based on grade/section
        const fetchedSubjects = await fetchClassSubjects(student.grade, student.section);
        // If no classes found, fallback to basic subjects for the grade/dept
        if (fetchedSubjects.length > 0) {
          setSubjects(fetchedSubjects);
        } else {
          // Hardcoded fallback for now if DB classes are empty
          // Use a simple list based on department (copied logic from data.ts but simplified)
          const defaultSubjects = student.department === 'Science'
            ? ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology']
            : ['Mathematics', 'English', 'Literature', 'Government', 'Civic Education'];
          setSubjects(defaultSubjects);
        }
      }
      setLoading(false);
    };

    loadSubjects();
  }, [student]);

  if (!student) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading student profile...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <main className="flex-grow p-4 space-y-4 overflow-y-auto">
        <div className="bg-orange-50 p-4 rounded-xl text-center border border-orange-200">
          <BookOpenIcon className="h-10 w-10 mx-auto text-orange-400 mb-2" />
          <h3 className="font-bold text-lg text-orange-800">My Subjects</h3>
          <p className="text-sm text-orange-700">Select a subject to enter its classroom page.</p>
        </div>

        {subjects.filter(s => s !== 'Subject').length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500">No subjects found for your class.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjects.filter(s => s !== 'Subject').map(subjectName => {
              // Teacher fetching logic removed/simplified as we don't have teacher-subject map readily available
              // We could fetch it, but for now 'N/A' is safer than crashing
              // Or we can assume getTeacherForSubject returns undefined
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
                      <p className="text-sm text-gray-500 font-medium">
                        Enter Classroom
                      </p>
                    </div>
                  </div>
                  <ChevronRightIcon className="text-gray-400" />
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default SubjectsScreen;