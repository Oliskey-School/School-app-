import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAutoSync } from '../../hooks/useAutoSync';
import { api } from '../../lib/api';
import { ReceiptIcon } from '../../constants';

interface StudentFinanceScreenProps {
    studentId: number;
}

const formatter = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 });

const StudentFinanceScreen: React.FC<StudentFinanceScreenProps> = ({ studentId }) => {
    const [fees, setFees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchFees = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getMyFees();
            setFees(data || []);
        } catch (err) {
            console.error('Error fetching fees:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Real-time synchronization
    useAutoSync(['fees'], fetchFees);

    useEffect(() => {
        fetchFees();
    }, [fetchFees]);

    const totalDue = fees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
    // Assuming 'paid' status or tracking paid_amount. For simple schema, let's assume 'status'='Paid' means fully paid.
    // Or if there is a 'paid_amount' column. Let's assume 'amount' is total and look for 'status'.
    const paidFees = fees.filter(f => f.status === 'Paid');
    const unpaidFees = fees.filter(f => f.status !== 'Paid');

    // Calculate total paid if we don't have explicit paid_amount column, just sum 'amount' of paid items
    const totalPaid = paidFees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
    const balance = totalDue - totalPaid;

    if (loading) return <div className="p-8 text-center text-gray-500">Loading financial data...</div>;

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <main className="flex-grow p-4 space-y-4 overflow-y-auto">
                {/* Summary Card */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-gradient-to-r from-orange-400 to-amber-500 text-white p-5 rounded-2xl shadow-lg"
                >
                    <p className="text-sm opacity-80">Outstanding Balance</p>
                    <p className="text-4xl font-bold mt-1">{formatter.format(balance)}</p>
                    <p className="text-xs opacity-80 mt-2">Total Fees: {formatter.format(totalDue)}</p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Fee Component Breakdown (Unpaid) */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }} className="bg-white p-4 rounded-xl shadow-sm">
                        <h3 className="font-bold text-gray-800 mb-3">Due Payments</h3>
                        {unpaidFees.length > 0 ? (
                            <ul className="space-y-2">
                                {unpaidFees.map((fee, i) => (
                                    <motion.li
                                        key={fee.id}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.2, delay: Math.min(i, 10) * 0.03 }}
                                        className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded-lg transition-colors"
                                    >
                                        <div>
                                            <span className="text-gray-700 font-medium block">{fee.title}</span>
                                            <span className="text-xs text-red-500">{fee.status}</span>
                                        </div>
                                        <span className="font-bold text-gray-800">{formatter.format(fee.amount)}</span>
                                    </motion.li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-500">No pending payments.</p>
                        )}
                    </motion.div>

                    {/* Check Payment History (Paid Items) */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.1 }} className="bg-white p-4 rounded-xl shadow-sm">
                        <h3 className="font-bold text-gray-800 mb-3">Payment History</h3>
                        {paidFees.length > 0 ? (
                            <ul className="space-y-3">
                                {paidFees.map((p, i) => (
                                    <motion.li
                                        key={p.id}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.2, delay: Math.min(i, 10) * 0.03 }}
                                        className="flex items-center"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mr-3">
                                            <ReceiptIcon className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div className="flex-grow">
                                            <p className="font-semibold text-gray-700">{p.title}</p>
                                            <p className="text-xs text-gray-500">{new Date(p.created_at || new Date()).toLocaleDateString()}</p>
                                        </div>
                                        <p className="font-bold text-green-600">{formatter.format(p.amount)}</p>
                                    </motion.li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-500 text-center py-4">No completed payments.</p>
                        )}
                    </motion.div>
                </div>
            </main>

            {/* A student's fees are settled by their parent/guardian — this screen
                is their honest window into what's owed and what's been paid. The
                old "Pay Now" button did nothing when clicked. */}
            <div className="p-4 mt-auto bg-white border-t">
                {balance > 0 ? (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-center">
                        <p className="text-sm font-semibold text-amber-800">
                            {formatter.format(balance)} outstanding
                        </p>
                        <p className="text-xs text-amber-700 mt-1">
                            School fees are paid through your parent or guardian's account. Please ask them to complete this payment.
                        </p>
                    </div>
                ) : (
                    <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-center">
                        <p className="text-sm font-semibold text-green-800">🎉 You're all paid up</p>
                        <p className="text-xs text-green-700 mt-1">There's nothing outstanding on your account.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentFinanceScreen;