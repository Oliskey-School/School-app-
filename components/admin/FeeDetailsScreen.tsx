
import React from 'react';
import { MailIcon, PlusIcon } from '../../constants';
import { StudentFeeInfo } from '../../types';

interface FeeDetailsScreenProps {
  student: StudentFeeInfo;
}

const formatter = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 });

const FeeDetailsScreen: React.FC<FeeDetailsScreenProps> = ({ student }) => {
  const balance = student.totalFee - student.paidAmount;
  
  // Mock data for breakdown and history
  const feeBreakdown = [
    { item: 'Tuition Fee', amount: student.totalFee * 0.7 },
    { item: 'Bus Service', amount: student.totalFee * 0.1 },
    { item: 'Lab Fee', amount: student.totalFee * 0.1 },
    { item: 'Library Fee', amount: student.totalFee * 0.1 },
  ];
  
  const paymentHistory = student.paidAmount > 0 ? [
    { id: 'TXN12345', date: '2024-07-01', amount: student.paidAmount, method: 'Bank Transfer' },
  ] : [];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <main className="flex-grow p-4 space-y-4 overflow-y-auto">
        <div className="bg-white p-4 rounded-xl shadow-sm flex items-center space-x-4">
          <img src={student.avatarUrl} alt={student.name} className="w-16 h-16 rounded-full object-cover" />
          <div>
            <p className="font-bold text-xl text-gray-800">{student.name}</p>
            <p className="font-medium text-gray-500">Grade {student.grade}{student.section}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-white p-3 rounded-xl shadow-sm">
                <p className="text-sm text-gray-500">Amount Paid</p>
                <p className="font-bold text-lg text-green-600">{formatter.format(student.paidAmount)}</p>
            </div>
            <div className="bg-white p-3 rounded-xl shadow-sm">
                <p className="text-sm text-gray-500">Balance</p>
                <p className={`font-bold text-lg ${balance > 0 ? 'text-red-600' : 'text-gray-800'}`}>{formatter.format(balance)}</p>
            </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm">
            <h3 className="font-bold text-gray-800 mb-2">Fee Breakdown</h3>
            <ul className="space-y-2">
                {feeBreakdown.map(item => (
                    <li key={item.item} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">{item.item}</span>
                        <span className="font-medium text-gray-800">{formatter.format(item.amount)}</span>
                    </li>
                ))}
                 <li className="flex justify-between items-center text-sm font-bold border-t pt-2 mt-2">
                    <span className="text-gray-800">Total</span>
                    <span className="text-gray-800">{formatter.format(student.totalFee)}</span>
                </li>
            </ul>
        </div>
        
        <div className="bg-white p-4 rounded-xl shadow-sm">
            <h3 className="font-bold text-gray-800 mb-2">Payment History</h3>
            {paymentHistory.length > 0 ? (
                <ul className="space-y-3">
                    {paymentHistory.map(p => (
                         <li key={p.id} className="flex items-center">
                            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mr-3">
                                <PlusIcon className="w-5 h-5 text-green-600"/>
                            </div>
                            <div className="flex-grow">
                                <p className="font-semibold text-gray-700">{p.method}</p>
                                <p className="text-xs text-gray-500">{p.date}</p>
                            </div>
                            <p className="font-bold text-green-600">{formatter.format(p.amount)}</p>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-gray-500 text-center py-4">No payment history found.</p>
            )}
        </div>
      </main>

      <div className="p-4 mt-auto bg-white border-t space-y-3">
        <button className="w-full flex justify-center items-center space-x-2 py-3 px-4 border border-transparent rounded-lg shadow-sm font-medium text-white bg-sky-500 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500">
          <PlusIcon className="h-5 w-5" />
          <span>Record Payment</span>
        </button>
        <button className="w-full flex justify-center items-center space-x-2 py-3 px-4 border border-gray-300 rounded-lg shadow-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500">
          <MailIcon className="h-5 w-5" />
          <span>Send Reminder</span>
        </button>
      </div>
    </div>
  );
};

export default FeeDetailsScreen;