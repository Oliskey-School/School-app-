
import React from 'react';
import { Student } from '../../types';
import { ChevronRightIcon, DocumentTextIcon } from '../../constants';

interface AdminSelectTermForReportProps {
  student: Student;
  navigateTo: (view: string, title: string, props?: any) => void;
}

const AdminSelectTermForReport: React.FC<AdminSelectTermForReportProps> = ({ student, navigateTo }) => {
  const terms = ["First Term", "Second Term", "Third Term"];

  const handleSelectTerm = (term: string) => {
    // Navigate to the reusable ReportCardInputScreen, aliased as 'adminReportCardInput' in the dashboard
    navigateTo('adminReportCardInput', `Edit Report: ${student.name}`, { student, term, isAdmin: true });
  };

  return (
    <div className="p-4 space-y-4 bg-gray-50 h-full">
      <div className="bg-indigo-50 p-4 rounded-xl text-center border border-indigo-200">
        <DocumentTextIcon className="h-10 w-10 mx-auto text-indigo-400 mb-2" />
        <h3 className="font-bold text-lg text-indigo-800">Select Term for {student.name}</h3>
        <p className="text-sm text-indigo-700">Choose the academic term you want to view or edit.</p>
      </div>
      <div className="space-y-3">
        {terms.map(term => (
          <button
            key={term}
            onClick={() => handleSelectTerm(term)}
            className="w-full bg-white rounded-xl shadow-sm p-4 flex items-center justify-between text-left hover:bg-gray-50 hover:ring-2 hover:ring-indigo-200 transition-all"
          >
            <span className="font-bold text-lg text-gray-800">{term}</span>
            <ChevronRightIcon className="text-gray-400" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default AdminSelectTermForReport;
