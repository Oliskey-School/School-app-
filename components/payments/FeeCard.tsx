
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
        <div className={`relative p-8 rounded-[32px] border transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 bg-white overflow-hidden group
      ${isPaid ? 'border-emerald-100 shadow-emerald-50' : ''}
      ${isOverdue ? 'border-rose-100 shadow-rose-50' : ''}
      ${!isPaid && !isOverdue ? 'border-gray-100 shadow-gray-50' : ''}
    `}>
            {/* Background Accent */}
            <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-10 transition-opacity group-hover:opacity-20
                ${isPaid ? 'bg-emerald-500' : isOverdue ? 'bg-rose-500' : 'bg-indigo-500'}`} 
            />

            {/* Top Badge */}
            <div className="flex justify-between items-start mb-6 relative z-10">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest
          ${isPaid ? 'bg-emerald-50 text-emerald-600' : ''}
          ${isOverdue ? 'bg-rose-50 text-rose-600' : ''}
          ${isPartial ? 'bg-amber-50 text-amber-600' : ''}
          ${fee.status === 'Pending' ? 'bg-indigo-50 text-indigo-600' : ''}
        `}>
                    {isPaid && <CheckCircle className="w-3 h-3 mr-1.5" />}
                    {isOverdue && <AlertCircle className="w-3 h-3 mr-1.5" />}
                    {isPartial && <Clock className="w-3 h-3 mr-1.5" />}
                    {fee.status}
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Due Date</span>
                    <span className="text-xs text-gray-900 font-black">{new Date(fee.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
            </div>

            {/* Content */}
            <div className="mb-8 relative z-10">
                <h3 className="text-xl font-black text-gray-900 mb-1 tracking-tight">{fee.title}</h3>
                <p className="text-sm text-gray-500 font-medium mb-6 line-clamp-2">{fee.description || 'Institutional fees payment'}</p>

                <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Amount</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-gray-900 tracking-tighter">
                            {formatCurrency(fee.amount)}
                        </span>
                        {isPartial && (
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                {formatCurrency(fee.paidAmount)} Paid
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 relative z-10">
                {!isPaid && (
                    <button
                        onClick={() => onPay(fee)}
                        className="flex-1 flex items-center justify-center px-6 py-3 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95 translate-z-0"
                    >
                        <CreditCard className="w-4 h-4 mr-2" />
                        {isPartial ? 'Settle' : 'Pay'}
                    </button>
                )}

                {(isPaid || isPartial) && onDownloadReceipt && (
                    <button
                        onClick={() => onDownloadReceipt(fee)}
                        className={`flex-1 flex items-center justify-center px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border-2 
                            ${isPaid ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-100 shadow-xl' : 'bg-white text-gray-900 border-gray-100 hover:border-gray-300'}`}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Receipt
                    </button>
                )}
            </div>
        </div>
    );
};
