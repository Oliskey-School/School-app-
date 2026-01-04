import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../context/ProfileContext';
import PaymentStatusBadge from '../shared/PaymentStatusBadge';
import {
    DollarSignIcon,
    CalendarIcon,
    DocumentTextIcon,
    CheckCircleIcon
} from '../../constants';

interface PaymentRecord {
    id: number;
    transaction_reference: string;
    amount: number;
    payment_method: string;
    payment_date: string;
    status: 'Pending' | 'Completed' | 'Failed' | 'Processing';
    period: string;
    payment_metadata?: any;
}

const MyPaymentHistory: React.FC = () => {
    const { profile } = useProfile();
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        try {
            setLoading(true);

            // Get teacher ID
            const { data: teacherData, error: teacherError } = await supabase
                .from('teachers')
                .select('id')
                .eq('email', profile.email)
                .single();

            if (teacherError || !teacherData) {
                console.error('Teacher not found');
                setLoading(false);
                return;
            }

            // Get payments
            const { data, error } = await supabase
                .from('payment_transactions')
                .select(`
          *,
          payslips (
            period_start,
            period_end
          )
        `)
                .eq('payslips.teacher_id', teacherData.id)
                .order('payment_date', { ascending: false });

            if (error) throw error;

            const formatted: PaymentRecord[] = (data || []).map((item: any) => ({
                id: item.id,
                transaction_reference: item.transaction_reference,
                amount: item.amount,
                payment_method: item.payment_method,
                payment_date: item.payment_date,
                status: item.status,
                period: item.payslips
                    ? `${new Date(item.payslips.period_start).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
                    : 'Unknown',
                payment_metadata: item.payment_metadata
            }));

            setPayments(formatted);
        } catch (error: any) {
            console.error('Error fetching payments:', error);
        } finally {
            setLoading(false);
        }
    };

    const totalReceived = payments
        .filter(p => p.status === 'Completed')
        .reduce((sum, p) => sum + p.amount, 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">My Payment History</h2>
                <p className="text-sm text-gray-600 mt-1">View your salary payment records</p>
            </div>

            {/* Summary */}
            <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-xl p-6 text-white">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-green-100 text-sm">Total Received (All Time)</p>
                        <h3 className="text-4xl font-bold mt-2">₦{totalReceived.toLocaleString()}</h3>
                        <p className="text-green-100 text-sm mt-2">
                            {payments.filter(p => p.status === 'Completed').length} completed payment(s)
                        </p>
                    </div>
                    <DollarSignIcon className="w-12 h-12 text-green-200" />
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600">Total Payments</p>
                    <p className="text-2xl font-bold text-gray-900">{payments.length}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-green-700">Completed</p>
                    <p className="text-2xl font-bold text-green-800">
                        {payments.filter(p => p.status === 'Completed').length}
                    </p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <p className="text-sm text-yellow-700">Pending</p>
                    <p className="text-2xl font-bold text-yellow-800">
                        {payments.filter(p => p.status === 'Pending').length}
                    </p>
                </div>
            </div>

            {/* Payment List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900">Payment Records</h3>
                </div>
                <div className="divide-y divide-gray-200">
                    {payments.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p>No payment records yet</p>
                        </div>
                    ) : (
                        payments.map((payment) => (
                            <div
                                key={payment.id}
                                className="p-6 hover:bg-gray-50 cursor-pointer"
                                onClick={() => setSelectedPayment(payment)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <h4 className="font-semibold text-gray-900">{payment.period}</h4>
                                            <PaymentStatusBadge status={payment.status} size="sm" />
                                        </div>
                                        <div className="space-y-1 text-sm">
                                            <p className="text-gray-700">
                                                <strong>Amount:</strong> ₦{payment.amount.toLocaleString()}
                                            </p>
                                            <p className="text-gray-600">
                                                <strong>Method:</strong> {payment.payment_method}
                                            </p>
                                            <p className="text-gray-600">
                                                <strong>Date:</strong> {new Date(payment.payment_date).toLocaleDateString()}
                                            </p>
                                            <p className="text-gray-500 text-xs">
                                                <strong>Ref:</strong> {payment.transaction_reference}
                                            </p>
                                        </div>
                                    </div>
                                    <DollarSignIcon className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Payment Details Modal */}
            {selectedPayment && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-900">Payment Receipt</h3>
                                <PaymentStatusBadge status={selectedPayment.status} />
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600">Period</p>
                                        <p className="font-semibold">{selectedPayment.period}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Amount Paid</p>
                                        <p className="font-semibold text-lg text-green-600">
                                            ₦{selectedPayment.amount.toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Payment Method</p>
                                        <p className="font-semibold">{selectedPayment.payment_method}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Payment Date</p>
                                        <p className="font-semibold">
                                            {new Date(selectedPayment.payment_date).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-sm text-gray-600">Transaction Reference</p>
                                        <p className="font-semibold text-sm break-all">{selectedPayment.transaction_reference}</p>
                                    </div>
                                </div>

                                {selectedPayment.payment_metadata && Object.keys(selectedPayment.payment_metadata).length > 0 && (
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <p className="text-sm font-semibold text-gray-700 mb-2">Payment Details</p>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            {Object.entries(selectedPayment.payment_metadata).map(([key, value]) => (
                                                <div key={key}>
                                                    <p className="text-gray-600">
                                                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                    </p>
                                                    <p className="font-medium">{value as string}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-gray-200">
                                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                                        <CheckCircleIcon className="w-4 h-4 text-green-600" />
                                        <p>This payment has been recorded and processed</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6">
                                <button
                                    onClick={() => setSelectedPayment(null)}
                                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyPaymentHistory;
