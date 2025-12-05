
import React, { useState, useMemo } from 'react';
import { SearchIcon } from '../../constants';
import { StudentFeeInfo } from '../../types';
import { mockStudentFees } from '../../data';

const statusStyles: { [key in StudentFeeInfo['status']]: { bg: string, text: string, progress: string } } = {
  Paid: { bg: 'bg-green-100', text: 'text-green-800', progress: 'bg-green-500' },
  Unpaid: { bg: 'bg-red-100', text: 'text-red-800', progress: 'bg-red-500' },
  Overdue: { bg: 'bg-amber-100', text: 'text-amber-800', progress: 'bg-amber-500' },
};

const formatter = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 });

const FeeManagement: React.FC<{ navigateTo: (view: string, title: string, props?: any) => void; }> = ({ navigateTo }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Paid' | 'Unpaid' | 'Overdue'>('All');

  const summary = useMemo(() => {
    const totalCollected = mockStudentFees.reduce((sum, s) => sum + s.paidAmount, 0);
    const totalExpected = mockStudentFees.reduce((sum, s) => sum + s.totalFee, 0);
    const totalOutstanding = totalExpected - totalCollected;
    const compliance = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
    return { totalCollected, totalOutstanding, compliance };
  }, []);

  const filteredStudents = useMemo(() =>
    mockStudentFees
      .filter(student => activeTab === 'All' || student.status === activeTab)
      .filter(student => student.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [activeTab, searchTerm]
  );

  return (
    <div className="flex flex-col h-full bg-gray-100">
      <main className="flex-grow flex flex-col overflow-hidden">
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-white">
            <div className="bg-green-500 p-3 rounded-xl shadow">
              <p className="text-xs font-light">Collected</p>
              <p className="font-bold text-lg">{formatter.format(summary.totalCollected).replace('NGN', '₦')}</p>
            </div>
            <div className="bg-amber-500 p-3 rounded-xl shadow">
              <p className="text-xs font-light">Outstanding</p>
              <p className="font-bold text-lg">{formatter.format(summary.totalOutstanding).replace('NGN', '₦')}</p>
            </div>
            <div className="bg-sky-500 p-3 rounded-xl shadow">
              <p className="text-xs font-light">Compliance</p>
              <p className="font-bold text-lg">{summary.compliance}%</p>
            </div>
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <SearchIcon className="text-gray-400" />
            </span>
            <input type="text" placeholder="Search student..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500" />
          </div>
        </div>

        <div className="px-4">
          <div className="flex space-x-2 border-b border-gray-200">
            {(['All', 'Paid', 'Unpaid', 'Overdue'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-3 py-2 text-sm font-semibold transition-colors ${
                  activeTab === tab ? 'border-b-2 border-sky-500 text-sky-600' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-grow p-4 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredStudents.map(student => (
              <button key={student.id} onClick={() => navigateTo('feeDetails', 'Fee Details', { student })} className="w-full bg-white rounded-xl shadow-sm p-3 flex flex-col space-y-2 text-left hover:ring-2 hover:ring-sky-200">
                <div className="flex items-center space-x-3">
                  <img src={student.avatarUrl} alt={student.name} className="w-10 h-10 rounded-full object-cover" />
                  <div className="flex-grow">
                    <p className="font-bold text-gray-800">{student.name}</p>
                    <p className="text-sm text-gray-500">Grade {student.grade}{student.section}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[student.status].bg} ${statusStyles[student.status].text}`}>
                    {student.status}
                  </span>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-medium text-gray-600 mb-1">
                    <span>{formatter.format(student.paidAmount)}</span>
                    <span>{formatter.format(student.totalFee)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${statusStyles[student.status].progress}`}
                        style={{ width: `${(student.paidAmount / student.totalFee) * 100}%` }}></div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default FeeManagement;
