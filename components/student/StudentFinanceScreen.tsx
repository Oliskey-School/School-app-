import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ReceiptIcon } from '../../constants';

interface StudentFinanceScreenProps {
    studentId: number;
}

const formatter = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 });

const StudentFinanceScreen: React.FC<StudentFinanceScreenProps> = ({ studentId }) => {
    const [fees, setFees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!studentId) return;

        const fetchFees = async () => {
            try {
                const { data, error } = await supabase
                    .from('student_fees')
                    .select('*')
                    .eq('student_id', studentId);

                if (error) throw error;
                setFees(data || []);
            } catch (err) {
                console.error('Error fetching fees:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchFees();

        // Realtime Subscription
        const channel = supabase.channel(`student_fees_${studentId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'student_fees', filter: `student_id=eq.${studentId}` }, () => {
                fetchFees();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [studentId]);

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
                <div className="bg-gradient-to-r from-orange-400 to-amber-500 text-white p-5 rounded-2xl shadow-lg">
                    <p className="text-sm opacity-80">Outstanding Balance</p>
                    <p className="text-4xl font-bold mt-1">{formatter.format(balance)}</p>
                    <p className="text-xs opacity-80 mt-2">Total Fees: {formatter.format(totalDue)}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Fee Component Breakdown (Unpaid) */}
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                        <h3 className="font-bold text-gray-800 mb-3">Due Payments</h3>
                        {unpaidFees.length > 0 ? (
                            <ul className="space-y-2">
                                {unpaidFees.map(fee => (
                                    <li key={fee.id} className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded-lg">
                                        <div>
                                            <span className="text-gray-700 font-medium block">{fee.title}</span>
                                            <span className="text-xs text-red-500">{fee.status}</span>
                                        </div>
                                        <span className="font-bold text-gray-800">{formatter.format(fee.amount)}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-500">No pending payments.</p>
                        )}
                    </div>

                    {/* Check Payment History (Paid Items) */}
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                        <h3 className="font-bold text-gray-800 mb-3">Payment History</h3>
                        {paidFees.length > 0 ? (
                            <ul className="space-y-3">
                                {paidFees.map(p => (
                                    <li key={p.id} className="flex items-center">
                                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mr-3">
                                            <ReceiptIcon className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div className="flex-grow">
                                            <p className="font-semibold text-gray-700">{p.title}</p>
                                            <p className="text-xs text-gray-500">{new Date(p.created_at || new Date()).toLocaleDateString()}</p>
                                        </div>
                                        <p className="font-bold text-green-600">{formatter.format(p.amount)}</p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-500 text-center py-4">No completed payments.</p>
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