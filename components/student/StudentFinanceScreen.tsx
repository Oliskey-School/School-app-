
import React from 'react';
import { mockStudentFees, mockFeeBreakdown, mockPaymentHistory } from '../../data';
import { ReceiptIcon } from '../../constants';

// For demo, assume logged-in student is ID 4
const studentId = 4;

const formatter = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 });

const StudentFinanceScreen: React.FC = () => {
    const studentFeeInfo = mockStudentFees.find(f => f.id === studentId);

    if (!studentFeeInfo) {
        return <div className="p-4">Fee information not available.</div>;
    }
    
    const balance = studentFeeInfo.totalFee - studentFeeInfo.paidAmount;

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <main className="flex-grow p-4 space-y-4 overflow-y-auto">
                {/* Summary Card */}
                <div className="bg-gradient-to-r from-orange-400 to-amber-500 text-white p-5 rounded-2xl shadow-lg">
                    <p className="text-sm opacity-80">Amount Due</p>
                    <p className="text-4xl font-bold mt-1">{formatter.format(balance)}</p>
                    <p className="text-xs opacity-80 mt-2">Due Date: {new Date(studentFeeInfo.dueDate).toLocaleDateString('en-GB')}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Fee Breakdown */}
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                        <h3 className="font-bold text-gray-800 mb-3">Fee Breakdown</h3>
                        <ul className="space-y-2">
                            {mockFeeBreakdown.map(item => (
                                <li key={item.item} className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">{item.item}</span>
                                    <span className="font-medium text-gray-800">{formatter.format(item.amount)}</span>
                                </li>
                            ))}
                            <li className="flex justify-between items-center text-sm font-bold border-t pt-2 mt-2">
                                <span className="text-gray-800">Total</span>
                                <span className="text-gray-800">{formatter.format(studentFeeInfo.totalFee)}</span>
                            </li>
                        </ul>
                    </div>
                    
                    {/* Payment History */}
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                        <h3 className="font-bold text-gray-800 mb-3">Payment History</h3>
                        {mockPaymentHistory.length > 0 ? (
                            <ul className="space-y-3">
                                {mockPaymentHistory.map(p => (
                                    <li key={p.id} className="flex items-center">
                                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mr-3">
                                            <ReceiptIcon className="w-5 h-5 text-green-600"/>
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
                </div>
            </main>

            <div className="p-4 mt-auto bg-white border-t">
                <button className="w-full flex justify-center items-center space-x-2 py-3 px-4 border border-transparent rounded-lg shadow-sm font-medium text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                    <span>Pay Now</span>
                </button>
            </div>
        </div>
    );
};

export default StudentFinanceScreen;