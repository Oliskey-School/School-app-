import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import PaymentStatusBadge from '../shared/PaymentStatusBadge';
import CenteredLoader from '../ui/CenteredLoader';
import {
    DollarSignIcon,
    CalendarIcon,
    UserGroupIcon,
    DocumentTextIcon,
    SearchIcon
} from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { useAutoSync } from '../../hooks/useAutoSync';

interface PaymentTransaction {
    id: number;
    transaction_reference: string;
    amount: number;
    payment_method: string;
    payment_date: string;
    status: 'Pending' | 'Completed' | 'Failed' | 'Processing';
    notes?: string;
    teacher_name: string;
    period: string;
    payment_metadata?: any;
}

const PaymentHistory: React.FC = () => {
    const { currentSchool } = useAuth();
    const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<PaymentTransaction[]>([]);
    const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTransaction, setSelectedTransaction] = useState<PaymentTransaction | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentSchool) return;
        fetchTransactions();
    }, [currentSchool]);

    useAutoSync(['payment_transactions', 'payslips'], () => {
        console.log('🔄 [PaymentHistory] Real-time auto-sync triggered');
        fetchTransactions();
    });

    useEffect(() => {
        applyFilters();
    }, [transactions, filter, searchTerm]);

    const fetchTransactions = async () => {
        try {
            if (!currentSchool) return;
            setLoading(true);

            const { data, error } = await api
                .from('payment_transactions')
                .select(`
          *,
          payslips!inner (
            period_start,
            period_end,
            school_id,
            teachers (
              full_name
            )
          )
        `)
                .eq('payslips.school_id', currentSchool.id)
                .order('payment_date', { ascending: false });

            if (error) throw error;

            const formatted: PaymentTransaction[] = (data || []).map((item: any) => ({
                id: item.id,
                transaction_reference: item.transaction_reference,
                amount: item.amount,
                payment_method: item.payment_method,
                payment_date: item.payment_date,
                status: item.status,
                notes: item.notes,
                teacher_name: item.payslips?.teachers?.full_name || 'Unknown',
                period: item.payslips
                    ? `${new Date(item.payslips.period_start).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
                    : 'Unknown',
                payment_metadata: item.payment_metadata
            }));

            setTransactions(formatted);
        } catch (error: any) {
            console.error('Error fetching transactions:', error);
            toast.error('Failed to load payment history');
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...transactions];

        // Status filter
        if (filter !== 'all') {
            const statusMap = {
                completed: 'Completed',
                pending: 'Pending',
                failed: 'Failed'
            };
            filtered = filtered.filter(t => t.status === statusMap[filter]);
        }

        // Search filter
        if (searchTerm.trim()) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(t =>
                t.teacher_name.toLowerCase().includes(search) ||
                t.transaction_reference.toLowerCase().includes(search) ||
                t.payment_method.toLowerCase().includes(search)
            );
        }

        setFilteredTransactions(filtered);
    };

    const stats = {
        total: transactions.length,
        totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
        completed: transactions.filter(t => t.status === 'Completed').length,
        pending: transactions.filter(t => t.status === 'Pending').length,
        failed: transactions.filter(t => t.status === 'Failed').length
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Payment History</h2>
                <p className="text-sm text-gray-600 mt-1">View all salary payment transactions</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600">Total Payments</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.03 }} className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="text-2xl font-bold text-gray-900">₦{stats.totalAmount.toLocaleString()}</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.06 }} className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-green-700">Completed</p>
                    <p className="text-2xl font-bold text-green-800">{stats.completed}</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.09 }} className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <p className="text-sm text-yellow-700">Pending</p>
                    <p className="text-2xl font-bold text-yellow-800">{stats.pending}</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.12 }} className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <p className="text-sm text-red-700">Failed</p>
                    <p className="text-2xl font-bold text-red-800">{stats.failed}</p>
                </motion.div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-3">
                <div className="flex space-x-2">
                    {(['all', 'completed', 'pending', 'failed'] as const).map((f) => (
                        <motion.button
                            key={f}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === f
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </motion.button>
                    ))}
                </div>

                <div className="flex-1">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by teacher, reference, or method..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>
                </div>
            </div>

            {/* Transactions List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900">Transactions</h3>
                </div>
                <div className="divide-y divide-gray-200">
                    {loading ? (
                        <CenteredLoader className="p-8" />
                    ) : filteredTransactions.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No transactions found
                        </div>
                    ) : (
                        filteredTransactions.map((transaction, ti) => (
                            <motion.div key={transaction.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15, delay: Math.min(ti, 15) * 0.02 }} className="p-6 hover:bg-gray-50 cursor-pointer"
                                onClick={() => setSelectedTransaction(transaction)}>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <UserGroupIcon className="w-5 h-5 text-gray-400" />
                                            <h4 className="font-semibold text-gray-900">{transaction.teacher_name}</h4>
                                            <PaymentStatusBadge status={transaction.status} size="sm" />
                                        </div>
                                        <div className="space-y-1 text-sm">
                                            <p className="text-gray-700">
                                                <strong>₦{transaction.amount.toLocaleString()}</strong> via {transaction.payment_method}
                                            </p>
                                            <p className="text-gray-600">
                                                📅 {new Date(transaction.payment_date).toLocaleDateString()} | Period: {transaction.period}
                                            </p>
                                            <p className="text-gray-500">
                                                <strong>Ref:</strong> {transaction.transaction_reference}
                                            </p>
                                        </div>
                                    </div>
                                    <DollarSignIcon className="w-6 h-6 text-green-600" />
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>

            {/* Transaction Details Modal */}
            <AnimatePresence>
            {selectedTransaction && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ type: 'spring', stiffness: 400, damping: 32 }} className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-900">Payment Details</h3>
                                <PaymentStatusBadge status={selectedTransaction.status} />
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600">Teacher</p>
                                        <p className="font-semibold">{selectedTransaction.teacher_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Period</p>
                                        <p className="font-semibold">{selectedTransaction.period}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Amount</p>
                                        <p className="font-semibold text-lg">₦{selectedTransaction.amount.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Payment Date</p>
                                        <p className="font-semibold">{new Date(selectedTransaction.payment_date).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Payment Method</p>
                                        <p className="font-semibold">{selectedTransaction.payment_method}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Transaction Reference</p>
                                        <p className="font-semibold text-sm">{selectedTransaction.transaction_reference}</p>
                                    </div>
                                </div>

                                {selectedTransaction.payment_metadata && Object.keys(selectedTransaction.payment_metadata).length > 0 && (
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <p className="text-sm font-semibold text-gray-700 mb-2">Payment Details</p>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            {Object.entries(selectedTransaction.payment_metadata).map(([key, value]) => (
                                                <div key={key}>
                                                    <p className="text-gray-600">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                                                    <p className="font-medium">{value as string}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedTransaction.notes && (
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Notes</p>
                                        <p className="text-gray-900">{selectedTransaction.notes}</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setSelectedTransaction(null)}
                                    className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                                >
                                    Close
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
};

export default PaymentHistory;

