

import React, { useState, useMemo } from 'react';
import { ReceiptIcon } from '../../constants';
import { StudentFeeInfo } from '../../types';
import { mockStudentFees } from '../../data';

interface FeeStatusScreenProps {
  childrenIds: number[];
}

const formatter = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 });

const FeeStatusScreen: React.FC<FeeStatusScreenProps> = ({ childrenIds }) => {
    const [selectedChildId, setSelectedChildId] = useState<number>(childrenIds[0]);

    const childrenFeeInfo = useMemo(() => 
        mockStudentFees.filter(student => childrenIds.includes(student.id)),
        [childrenIds]
    );

    const selectedChild = useMemo(() => 
        childrenFeeInfo.find(child => child.id === selectedChildId),
        [childrenFeeInfo, selectedChildId]
    );

    if (!selectedChild) {
        return <div className="p-4 text-center">No fee information available.</div>;
    }

    const balance = selectedChild.totalFee - selectedChild.paidAmount;
  
    const feeBreakdown = [
        { item: 'Tuition Fee', amount: selectedChild.totalFee * 0.7 },
        { item: 'Bus Service', amount: selectedChild.totalFee * 0.1 },
        { item: 'Lab Fee', amount: selectedChild.totalFee * 0.1 },
        { item: 'Library Fee', amount: selectedChild.totalFee * 0.1 },
    ];
  
    const paymentHistory = selectedChild.paidAmount > 0 ? [
        { id: `TXN${selectedChild.id}1`, date: '2024-07-01', amount: selectedChild.paidAmount, method: 'Card' },
    ] : [];

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Child Selector */}
            <div className="p-4 bg-white border-b border-gray-200">
                <h3 className="text-sm font-bold text-gray-500 mb-3 text-center uppercase tracking-wider">Select Child</h3>
                <div className="flex justify-center space-x-4">
                    {childrenFeeInfo.map(child => (
                        <button 
                            key={child.id}
                            onClick={() => setSelectedChildId(child.id)}
                            className="text-center group"
                            aria-label={`View fees for ${child.name}`}
                            aria-pressed={selectedChildId === child.id}
                        >
                            <img 
                                src={child.avatarUrl} 
                                alt={child.name} 
                                className={`w-16 h-16 rounded-full object-cover border-4 transition-all duration-200 ${selectedChildId === child.id ? 'border-green-500 scale-110' : 'border-transparent group-hover:border-gray-300'}`}
                            />
                            <p className={`mt-1 text-sm font-semibold transition-colors ${selectedChildId === child.id ? 'text-green-600' : 'text-gray-600'}`}>{child.name.split(' ')[0]}</p>
                        </button>
                    ))}
                </div>
            </div>

            <main className="flex-grow p-4 space-y-4 overflow-y-auto">
                <h2 className="text-xl font-bold text-center text-gray-800 -mb-2">{selectedChild.name}</h2>
                <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-white p-3 rounded-xl shadow-sm">
                        <p className="text-sm text-gray-500">Amount Paid</p>
                        <p className="font-bold text-lg text-green-600">{formatter.format(selectedChild.paidAmount)}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl shadow-sm">
                        <p className="text-sm text-gray-500">Balance</p>
                        <p className={`font-bold text-lg ${balance > 0 ? 'text-red-600' : 'text-gray-800'}`}>{formatter.format(balance)}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                <span className="text-gray-800">{formatter.format(selectedChild.totalFee)}</span>
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
        </div>
    );
};

export default FeeStatusScreen;