
import React from 'react';
import { Fee } from '../../types';
import { CreditCard, Download, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface FeeCardProps {
    fee: Fee;
    onPay: (fee: Fee) => void;
    onDownloadReceipt?: (fee: Fee) => void;
}

export const FeeCard: React.FC<FeeCardProps> = ({ fee, onPay, onDownloadReceipt }) => {
    const isPaid = fee.status === 'Paid';
    const isOverdue = fee.status === 'Overdue';
    const isPartial = fee.status === 'Partial';

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN'
        }).format(amount);
    };

    return (
        <div className={`relative p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg bg-white
      ${isPaid ? 'border-green-100 bg-green-50/10' : ''}
      ${isOverdue ? 'border-red-100 bg-red-50/10' : ''}
      ${!isPaid && !isOverdue ? 'border-gray-100' : ''}
    `}>
            {/* Top Badge */}
            <div className="flex justify-between items-start mb-4">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
          ${isPaid ? 'bg-green-100 text-green-700' : ''}
          ${isOverdue ? 'bg-red-100 text-red-700' : ''}
          ${isPartial ? 'bg-amber-100 text-amber-700' : ''}
          ${fee.status === 'Pending' ? 'bg-gray-100 text-gray-700' : ''}
        `}>
                    {isPaid && <CheckCircle className="w-3 h-3 mr-1" />}
                    {isOverdue && <AlertCircle className="w-3 h-3 mr-1" />}
                    {isPartial && <Clock className="w-3 h-3 mr-1" />}
                    {fee.status}
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-sm text-gray-500 font-medium whitespace-nowrap">Due: {new Date(fee.dueDate).toLocaleDateString()}</span>
                    {fee.curriculumType && (
                        <span className={`mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight ${fee.curriculumType === 'British' ? 'text-blue-600 bg-blue-50' :
                                fee.curriculumType === 'Nigerian' ? 'text-emerald-600 bg-emerald-50' :
                                    fee.curriculumType === 'Dual' ? 'text-purple-600 bg-purple-50' :
                                        'text-gray-500 bg-gray-50'
                            }`}>
                            {fee.curriculumType} Track
                        </span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">{fee.title}</h3>
                <p className="text-sm text-gray-500 mb-4">{fee.description || 'School fees payment'}</p>

                <div className="flex items-baseline space-x-1">
                    <span className="text-2xl font-bold text-gray-900">{formatCurrency(fee.amount)}</span>
                    {isPartial && (
                        <span className="text-sm text-gray-500">
                            (Paid: {formatCurrency(fee.paidAmount)})
                        </span>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3">
                {!isPaid && (
                    <button
                        onClick={() => onPay(fee)}
                        className="flex-1 flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm active:scale-95 duration-150"
                    >
                        <CreditCard className="w-4 h-4 mr-2" />
                        {isPartial ? 'Pay Balance' : 'Pay Now'}
                    </button>
                )}

                {(isPaid || isPartial) && onDownloadReceipt && (
                    <button
                        onClick={() => onDownloadReceipt(fee)}
                        className="flex-1 flex items-center justify-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Receipt
                    </button>
                )}
            </div>
        </div>
    );
};
