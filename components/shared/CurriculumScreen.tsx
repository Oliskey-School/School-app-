import React, { useMemo } from 'react';
import { getCurriculum } from '../../curriculumData';
import { CurriculumSubject, CurriculumSubjectCategory, Department } from '../../types';
import { BookOpenIcon } from '../../constants';

const categoryStyles: { [key in CurriculumSubjectCategory]: string } = {
  Core: 'bg-sky-100 text-sky-800',
  Compulsory: 'bg-purple-100 text-purple-800',
  Elective: 'bg-green-100 text-green-800',
  'Pre-Vocational Electives': 'bg-amber-100 text-amber-800',
  'Other Electives': 'bg-indigo-100 text-indigo-800',
  'Foundational Play-Based Learning': 'bg-rose-100 text-rose-800',
  'Core Foundational': 'bg-teal-100 text-teal-800',
  'Pre-Primary Core': 'bg-fuchsia-100 text-fuchsia-800',
};

const CategoryBadge: React.FC<{ category: CurriculumSubjectCategory }> = ({ category }) => {
  const style = categoryStyles[category] || 'bg-gray-100 text-gray-800';
  return <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${style}`}>{category}</span>;
};

interface CurriculumScreenProps {
  level: string; // e.g., "Primary 1", "JSS 2", "SSS 1"
  department?: Department;
}

const CurriculumScreen: React.FC<CurriculumScreenProps> = ({ level, department }) => {
  const subjects = useMemo(() => getCurriculum(level, department), [level, department]);

  const groupedSubjects = useMemo(() => {
    return subjects.reduce((acc, subject) => {
      const category = subject.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(subject);
      return acc;
    }, {} as { [key in CurriculumSubjectCategory]?: CurriculumSubject[] });
  }, [subjects]);
  
  const categoryOrder: CurriculumSubjectCategory[] = [
    'Foundational Play-Based Learning', 'Core Foundational', 'Pre-Primary Core',
    'Compulsory', 'Core', 'Pre-Vocational Electives', 'Elective', 'Other Electives'
  ];

  return (
    <div className="p-4 space-y-5 bg-gray-50">
      {Object.keys(groupedSubjects).length === 0 ? (
        <div className="text-center py-10 bg-white rounded-lg shadow-sm">
            <BookOpenIcon className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No Curriculum Found</h3>
            <p className="mt-1 text-sm text-gray-500">Could not find subjects for the selected level.</p>
        </div>
      ) : (
        categoryOrder.map(category => {
          if (!groupedSubjects[category]) return null;

          return (
            <div key={category} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                    <CategoryBadge category={category} />
                </div>
                <div className="divide-y divide-gray-100">
                    {groupedSubjects[category]!.map(subject => (
                        <div key={subject.name} className="px-4 py-3 flex items-center">
                            <p className="font-medium text-gray-800">{subject.name}</p>
                        </div>
                    ))}
                </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default CurriculumScreen;