/**
 * Installment Schedule Component
 * Shows payment plan details and allows parents to pay individual installments
 */

import React, { useState, useEffect } from 'react';
import { getPaymentPlan, Installment, PaymentPlan } from '../../lib/payment-plans';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface InstallmentScheduleProps {
    feeId: string;
    onPayInstallment: (installment: Installment) => void;
}

export const InstallmentSchedule: React.FC<InstallmentScheduleProps> = ({ feeId, onPayInstallment }) => {
    const [plan, setPlan] = useState<PaymentPlan | null>(null);
    const [installments, setInstallments] = useState<Installment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPlan();
    }, [feeId]);

    const loadPlan = async () => {
        setLoading(true);
        const data = await getPaymentPlan(feeId);
        if (data) {
            setPlan(data.plan);
            setInstallments(data.installments);
        }
        setLoading(false);
    };

    if (loading) {
        return <div className="text-center py-4 text-gray-500">Loading payment plan...</div>;
    }

    if (!plan) {
        return null;
    }

    const paidCount = installments.filter(i => i.status === 'paid').length;
    const totalPaid = installments.reduce((sum, i) => sum + i.paidAmount, 0);
    const progress = (totalPaid / plan.totalAmount) * 100;

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'paid':
                return <CheckCircle className="w-5 h-5 text-green-600" />;
            case 'overdue':
                return <AlertCircle className="w-5 h-5 text-red-600" />;
            default:
                return <Clock className="w-5 h-5 text-yellow-600" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'overdue':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'partial':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div className="space-y-4">
            {/* Plan Summary */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Payment Plan</h3>
                        <p className="text-sm text-gray-600">
                            {installments.length} installments • {plan.frequency}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-bold text-indigo-900">
                            {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(plan.totalAmount)}
                        </p>
                        <p className="text-xs text-gray-600">Total Amount</p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>{paidCount} of {installments.length} paid</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Installments List */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="divide-y divide-gray-100">
                    {installments.map((installment) => {
                        const isPayable = installment.status === 'pending' || installment.status === 'partial' || installment.status === 'overdue';
                        const balance = installment.amount - installment.paidAmount;

                        return (
                            <div
                                key={installment.id}
                                className="p-4 hover:bg-gray-50 transition"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3 flex-1">
                                        {/* Status Icon */}
                                        <div className="mt-0.5">
                                            {getStatusIcon(installment.status)}
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-medium text-gray-900">
                                                    Installment {installment.installmentNumber}
                                                </h4>
                                                <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(installment.status)}`}>
                                                    {installment.status.charAt(0).toUpperCase() + installment.status.slice(1)}
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-600 space-y-0.5">
                                                <p>
                                                    Due: {new Date(installment.dueDate).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                </p>
                                                <p>
                                                    Amount: {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(installment.amount)}
                                                </p>
                                                {installment.paidAmount > 0 && (
                                                    <p className="text-green-600">
                                                        Paid: {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(installment.paidAmount)}
                                                        {' '} • Balance: {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(balance)}
                                                    </p>
                                                )}
                                                {installment.paidAt && (
                                                    <p className="text-xs text-gray-500">
                                                        Paid on: {new Date(installment.paidAt).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Pay Button */}
                                    {isPayable && (
                                        <button
                                            onClick={() => onPayInstallment(installment)}
                                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
                                        >
                                            Pay Now
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Payment Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Click "Pay Now" on any installment to make a payment.
                    Payment will be applied to the selected installment.
                </p>
            </div>
        </div>
    );
};
