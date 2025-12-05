import React from 'react';
import { Student } from '../../types';
import { ChevronRightIcon } from '../../constants';

interface SelectTermForReportScreenProps {
  student: Student;
  navigateTo: (view: string, title: string, props: any) => void;
}

const SelectTermForReportScreen: React.FC<SelectTermForReportScreenProps> = ({ student, navigateTo }) => {
  const terms = ["First Term", "Second Term", "Third Term"];

  const handleSelectTerm = (term: string) => {
    navigateTo('reportCardInput', `Report: ${student.name}`, { student, term });
  };

  return (
    <div className="p-4 space-y-4 bg-gray-50 h-full">
      <div className="bg-purple-50 p-4 rounded-xl text-center border border-purple-200">
        <h3 className="font-bold text-lg text-purple-800">Select Term for {student.name}</h3>
        <p className="text-sm text-purple-700">Choose the academic term you want to input results for.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {terms.map(term => (
          <button
            key={term}
            onClick={() => handleSelectTerm(term)}
            className="w-full bg-white rounded-xl shadow-sm p-4 flex items-center justify-between text-left hover:bg-gray-50 hover:ring-2 hover:ring-purple-200 transition-all"
          >
            <span className="font-bold text-lg text-gray-800">{term}</span>
            <ChevronRightIcon className="text-gray-400" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default SelectTermForReportScreen;