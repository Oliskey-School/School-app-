import React from 'react';
import { Student } from '../../types';
import { ChevronRightIcon } from '../../constants';

interface SelectTermForReportScreenProps {
  student: Student;
  navigateTo: (view: string, title: string, props: any) => void;
}

const SelectTermForReportScreen: React.FC<SelectTermForReportScreenProps> = ({ student, navigateTo }) => {
  const terms = ["First Term", "Second Term", "Third Term"];
  const sessions = ["2023/2024", "2024/2025", "2025/2026"];
  const [selectedSession, setSelectedSession] = React.useState("2023/2024");

  const handleSelectTerm = (term: string) => {
    navigateTo('reportCardInput', `Report: ${student.name}`, { student, term, session: selectedSession });
  };

  return (
    <div className="p-4 space-y-4 bg-gray-50 h-full">
      <div className="bg-purple-50 p-6 rounded-2xl text-center border border-purple-200">
        <h3 className="font-bold text-xl text-purple-800 mb-1">Academic Context</h3>
        <p className="text-sm text-purple-700">Set the session and term for {student.name}</p>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Select Academic Session</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {sessions.map(s => (
            <button
              key={s}
              onClick={() => setSelectedSession(s)}
              className={`py-3 px-4 rounded-xl font-bold text-sm transition-all border ${
                selectedSession === s 
                ? 'bg-purple-600 text-white border-purple-600 shadow-md scale-[1.02]' 
                : 'bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Choose Term to Open</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {terms.map(term => (
            <button
              key={term}
              onClick={() => handleSelectTerm(term)}
              className="w-full bg-white rounded-xl shadow-sm p-4 flex items-center justify-between text-left hover:bg-gray-50 hover:ring-2 hover:ring-purple-200 transition-all group border border-gray-100"
            >
              <span className="font-bold text-lg text-gray-800 group-hover:text-purple-700">{term}</span>
              <ChevronRightIcon className="text-gray-400 group-hover:text-purple-500 transform group-hover:translate-x-1 transition-all" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SelectTermForReportScreen;