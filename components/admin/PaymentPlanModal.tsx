/**
 * Payment Plan Creation Modal
 * Allows admins to set up installment plans when assigning fees
 */

import React, { useState } from 'react';
import { createPaymentPlan } from '../../lib/payment-plans';
import { Calendar, DollarSign, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PaymentPlanModalProps {
    feeId: string;
    studentId: string;
    totalAmount: number;
    onClose: () => void;
    onSuccess: () => void;
}

export const PaymentPlanModal: React.FC<PaymentPlanModalProps> = ({
    feeId,
    studentId,
    totalAmount,
    onClose,
    onSuccess
}) => {
    const [installmentCount, setInstallmentCount] = useState(3);
    const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'termly'>('monthly');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [creating, setCreating] = useState(false);

    const installmentAmount = Math.round((totalAmount / installmentCount) * 100) / 100;

    const handleCreate = async () => {
        setCreating(true);
        try {
            const plan = await createPaymentPlan({
                feeId,
                studentId,
                totalAmount,
                installmentCount,
                frequency,
                startDate: new Date(startDate)
            });

            if (plan) {
                toast.success('Payment plan created successfully!');
                onSuccess();
                onClose();
            } else {
                toast.error('Failed to create payment plan');
            }
        } catch (error) {
            console.error('Error creating plan:', error);
            toast.error('Error creating payment plan');
        } finally {
            setCreating(false);
        }
    };

    // Calculate preview dates
    const previewDates = [];
    for (let i = 0; i < installmentCount; i++) {
        const date = new Date(startDate);
        switch (frequency) {
            case 'weekly':
                date.setDate(date.getDate() + (i * 7));
                break;
            case 'monthly':
                date.setMonth(date.getMonth() + i);
                break;
            case 'termly':
                date.setMonth(date.getMonth() + (i * 3));
                break;
        }
        previewDates.push(date);
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Create Payment Plan</h2>
                        <p className="text-gray-600 text-sm">Set up installment payments for this fee</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Total Amount */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-indigo-700 mb-1">Total Fee Amount</p>
                    <p className="text-3xl font-bold text-indigo-900">
                        {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(totalAmount)}
                    </p>
                </div>

                {/* Form */}
                <div className="space-y-6">
                    {/* Installment Count */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Number of Installments
                        </label>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                            {[2, 3, 4, 6, 9, 12].map(count => (
                                <button
                                    key={count}
                                    onClick={() => setInstallmentCount(count)}
                                    className={`px-4 py-3 rounded-lg font-medium transition ${installmentCount === count
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {count}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Frequency */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Payment Frequency
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={() => setFrequency('weekly')}
                                className={`px-4 py-3 rounded-lg font-medium transition ${frequency === 'weekly'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                Weekly
                            </button>
                            <button
                                onClick={() => setFrequency('monthly')}
                                className={`px-4 py-3 rounded-lg font-medium transition ${frequency === 'monthly'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setFrequency('termly')}
                                className={`px-4 py-3 rounded-lg font-medium transition ${frequency === 'termly'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                Termly
                            </button>
                        </div>
                    </div>

                    {/* Start Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            First Payment Due Date
                        </label>
                        <div className="relative">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-10"
                            />
                            <Calendar className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" />
                        </div>
                    </div>

                    {/* Preview */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Payment Schedule Preview</h3>
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left px-4 py-2 font-medium text-gray-700">#</th>
                                        <th className="text-left px-4 py-2 font-medium text-gray-700">Due Date</th>
                                        <th className="text-right px-4 py-2 font-medium text-gray-700">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {previewDates.map((date, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-gray-600">Installment {index + 1}</td>
                                            <td className="px-4 py-3 text-gray-900">
                                                {date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-gray-900">
                                                {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(installmentAmount)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={creating}
                        className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
                    >
                        {creating ? 'Creating...' : 'Create Payment Plan'}
                    </button>
                </div>
            </div>
        </div>
    );
};
