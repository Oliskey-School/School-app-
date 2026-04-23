import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Wallet, ChevronLeft, Save, CreditCard, Banknote, Landmark, Smartphone } from 'lucide-react';
import { Fee } from '../../types';

interface RecordPaymentScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
    fee?: Fee;
    student?: any;
}

const RecordPaymentScreen: React.FC<RecordPaymentScreenProps> = ({ navigateTo, fee, student }) => {
    const { currentSchool, currentBranchId } = useAuth();
    const schoolId = currentSchool?.id;
    const branchId = currentBranchId;

    const [paymentAmount, setPaymentAmount] = useState<string>('');
    const [paymentRef, setPaymentRef] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleBack = () => {
        navigateTo('feeManagement', 'Fee Management');
    };

    const handleRecordPayment = async () => {
        if (!fee || !paymentAmount || !paymentRef) {
            toast.error('Please fill in all fields');
            return;
        }

        try {
            setIsProcessing(true);
            if (!schoolId) {
                toast.error('School context missing');
                return;
            }

            await api.recordPayment(schoolId, branchId || undefined, {
                feeId: fee.id,
                studentId: fee.studentId,
                amount: parseFloat(paymentAmount),
                reference: paymentRef,
                method: paymentMethod
            });

            toast.success('Payment recorded successfully');
            handleBack();
        } catch (err: any) {
            console.error('Error recording payment:', err);
            toast.error('Failed to record payment');
        } finally {
            setIsProcessing(false);
        }
    };

    if (!fee) {
        return (
            <div className="p-8 text-center">
                <p className="text-gray-500">No fee selected for payment recording.</p>
                <button onClick={handleBack} className="mt-4 text-indigo-600 font-bold underline">Go Back</button>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-2xl mx-auto pb-32 lg:pb-6">
            <div className="mb-8">
                <button
                    onClick={handleBack}
                    className="flex items-center text-gray-500 hover:text-gray-700 transition"
                >
                    <ChevronLeft className="w-5 h-5 mr-1" />
                    <span>Back to Fees</span>
                </button>
                <div className="mt-4">
                    <h1 className="text-2xl font-bold text-gray-900">Record Payment</h1>
                    <p className="text-gray-500">Log a manual payment for a student fee</p>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 bg-indigo-50 border-b border-indigo-100">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">FEE DETAILS</p>
                            <h3 className="text-lg font-bold text-gray-900">{fee.title}</h3>
                            <p className="text-sm text-gray-500 mt-1">{student?.name || `Student ID: ${fee.studentId}`}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">TOTAL DUE</p>
                            <p className="text-xl font-black text-indigo-900">
                                {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(fee.amount)}
                            </p>
                            <p className="text-xs text-indigo-600 font-bold mt-1">
                                Outstanding: {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(fee.amount - (fee.paidAmount || 0))}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Amount Paid (NGN)</label>
                            <div className="relative">
                                <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3 pl-12 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-semibold"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Payment Method</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                    {paymentMethod === 'Cash' && <Banknote className="w-5 h-5" />}
                                    {paymentMethod === 'Bank Transfer' && <Landmark className="w-5 h-5" />}
                                    {paymentMethod === 'POS' && <CreditCard className="w-5 h-5" />}
                                    {paymentMethod === 'Mobile Money' && <Smartphone className="w-5 h-5" />}
                                </div>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3 pl-12 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-semibold appearance-none"
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Mobile Money">Mobile Money</option>
                                    <option value="POS">POS</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Transaction Reference / Receipt #</label>
                        <div className="relative">
                            <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={paymentRef}
                                onChange={(e) => setPaymentRef(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3 pl-12 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-semibold"
                                placeholder="e.g. Bank Transfer ID, Slip Number"
                            />
                        </div>
                        <p className="mt-2 text-xs text-gray-400">This will be visible on the parent's payment history.</p>
                    </div>

                    <div className="pt-4">
                        <button
                            onClick={handleRecordPayment}
                            disabled={isProcessing}
                            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:shadow-indigo-200 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                        >
                            {isProcessing ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Recording...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    <span>Confirm and Record Payment</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecordPaymentScreen;
