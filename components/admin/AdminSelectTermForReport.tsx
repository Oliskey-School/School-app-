
import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { motion } from 'framer-motion';
import { Student } from '../../types';
import { ChevronRightIcon, DocumentTextIcon } from '../../constants';

interface AdminSelectTermForReportProps {
  student: Student;
  navigateTo: (view: string, title: string, props?: any) => void;
}

const AdminSelectTermForReport: React.FC<AdminSelectTermForReportProps> = ({ student, navigateTo }) => {
  const terms = ["First Term", "Second Term", "Third Term"];

  // The editor keys everything (load, save, local draft) by term + SESSION. This
  // screen used to open it without a session, so it read "session=undefined"
  // (nothing) while its saves went under the real session — the admin could
  // never see what they had just saved. Resolve the school's current session.
  const [session, setSession] = useState<string>('');
  useEffect(() => {
    let active = true;
    api.getAcademicTerms('').then((terms: any[]) => {
      if (!active || !Array.isArray(terms)) return;
      const current = terms.find((t) => t.is_current) || terms[0];
      if (current?.academic_year) setSession(current.academic_year);
    }).catch(() => { /* falls back to the server default on save/load */ });
    return () => { active = false; };
  }, []);

  const handleSelectTerm = (term: string) => {
    // Navigate to the reusable ReportCardInputScreen, aliased as 'adminReportCardInput' in the dashboard
    navigateTo('adminReportCardInput', `Edit Report: ${student?.name || 'Student'}`, { student, term, session: session || undefined, isAdmin: true });
  };

  if (!student) {
      return <div className="p-6 text-center text-sm text-gray-500">No student selected.</div>;
  }

  return (
    <div className="p-4 space-y-4 bg-gray-50 h-full">
      <div className="bg-indigo-50 p-4 rounded-xl text-center border border-indigo-200">
        <DocumentTextIcon className="h-10 w-10 mx-auto text-indigo-400 mb-2" />
        <h3 className="font-bold text-lg text-indigo-800">Select Term for {student?.name || 'Student'}</h3>
        <p className="text-sm text-indigo-700">Choose the academic term you want to view or edit.</p>
      </div>
      <div className="space-y-3">
        {terms.map((term, ti) => (
          <motion.button
            key={term}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: ti * 0.05 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => handleSelectTerm(term)}
            className="w-full bg-white rounded-xl shadow-sm p-4 flex items-center justify-between text-left hover:bg-gray-50 hover:ring-2 hover:ring-indigo-200 transition-all"
          >
            <span className="font-bold text-lg text-gray-800">{term}</span>
            <ChevronRightIcon className="text-gray-400" />
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default AdminSelectTermForReport;
