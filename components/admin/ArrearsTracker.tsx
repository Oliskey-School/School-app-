import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import {
    ExclamationCircleIcon,
    DollarSignIcon,
    UserGroupIcon,
    CalendarIcon,
    CheckCircleIcon
} from '../../constants';

interface Arrears {
    id: number;
    teacher_id: number;
    teacher_name: string;
    amount_owed: number;
    reason: string;
    due_date: string;
    status: 'Pending' | 'Paid' | 'Partially Paid';
    created_at: string;
}

const ArrearsTracker: React.FC = () => {
    const [arrears, setArrears] = useState<Arrears[]>([]);
    const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'partial'>('all');
    const [loading, setLoading] = useState(true);
    const [selectedArrear, setSelectedArrear] = useState<Arrears | null>(null);
    const [paymentAmount, setPaymentAmount] = useState(0);

    useEffect(() => {
        fetchArrears();
    }, []);

    const fetchArrears = async () => {
        try {
            setLoading(true);

            const { data, error } = await supabase
                .from('arrears')
                .select(`
          *,
          teachers (
            full_name
          )
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formatted: Arrears[] = (data || []).map((item: any) => ({
                id: item.id,
                teacher_id: item.teacher_id,
                teacher_name: item.teachers?.full_name || 'Unknown',
                amount_owed: item.amount_owed,
                reason: item.reason,
                due_date: item.due_date,
                status: item.status,
                created_at: item.created_at
            }));

            setArrears(formatted);
        } catch (error: any) {
            console.error('Error fetching arrears:', error);
            toast.error('Failed to load arrears');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsPaid = async () => {
        if (!selectedArrear) return;

        try {
            const { error } = await supabase
                .from('arrears')
                .update({ status: 'Paid' })
                .eq('id', selectedArrear.id);

            if (error) throw error;

            toast.success('Arrear marked as paid');
            setSelectedArrear(null);
            fetchArrears();
        } catch (error: any) {
            console.error('Error updating arrear:', error);
            toast.error('Failed to update arrear');
        }
    };

    const filteredArrears = arrears.filter(a => {
        if (filter === 'all') return true;
        if (filter === 'pending') return a.status === 'Pending';
        if (filter === 'paid') return a.status === 'Paid';
        if (filter === 'partial') return a.status === 'Partially Paid';
        return true;
    });

    const stats = {
        total: arrears.length,
        totalAmount: arrears.reduce((sum, a) => sum + a.amount_owed, 0),
        pending: arrears.filter(a => a.status === 'Pending').length,
        pendingAmount: arrears.filter(a => a.status === 'Pending').reduce((sum, a) => sum + a.amount_owed, 0)
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Paid':
                return 'bg-green-100 text-green-800';
            case 'Pending':
                return 'bg-red-100 text-red-800';
            case 'Partially Paid':
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Arrears Tracker</h2>
                <p className="text-sm text-gray-600 mt-1">Monitor outstanding salary payments</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600">Total Arrears</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="text-2xl font-bold text-gray-900">₦{stats.totalAmount.toLocaleString()}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <p className="text-sm text-red-700">Pending</p>
                    <p className="text-2xl font-bold text-red-800">{stats.pending}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <p className="text-sm text-red-700">Pending Amount</p>
                    <p className="text-2xl font-bold text-red-800">₦{stats.pendingAmount.toLocaleString()}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex space-x-2">
                {(['all', 'pending', 'partial', 'paid'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === f
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* Arrears List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900">Outstanding Payments</h3>
                </div>
                <div className="divide-y divide-gray-200">
                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                        </div>
                    ) : filteredArrears.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No arrears found
                        </div>
                    ) : (
                        filteredArrears.map((arrear) => (
                            <div key={arrear.id} className="p-6 hover:bg-gray-50">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <UserGroupIcon className="w-5 h-5 text-gray-400" />
                                            <h4 className="font-semibold text-gray-900">{arrear.teacher_name}</h4>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(arrear.status)}`}>
                                                {arrear.status}
                                            </span>
                                        </div>
                                        <div className="space-y-1 text-sm">
                                            <p className="text-gray-700">
                                                <strong>Amount Owed:</strong> ₦{arrear.amount_owed.toLocaleString()}
                                            </p>
                                            <p className="text-gray-600">
                                                <strong>Reason:</strong> {arrear.reason}
                                            </p>
                                            <p className="text-gray-600">
                                                <strong>Due Date:</strong> {new Date(arrear.due_date).toLocaleDateString()}
                                            </p>
                                            <p className="text-gray-500 text-xs">
                                                Created: {new Date(arrear.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    {arrear.status === 'Pending' && (
                                        <button
                                            onClick={() => setSelectedArrear(arrear)}
                                            className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                                        >
                                            Resolve
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Resolve Modal */}
            {selectedArrear && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Resolve Arrear</h3>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <p className="text-sm text-gray-600">Teacher</p>
                                    <p className="font-semibold">{selectedArrear.teacher_name}</p>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-600">Amount Owed</p>
                                    <p className="font-semibold text-lg text-red-600">
                                        ₦{selectedArrear.amount_owed.toLocaleString()}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-600">Reason</p>
                                    <p>{selectedArrear.reason}</p>
                                </div>

                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm text-blue-800">
                                        Mark this arrear as paid when the payment has been completed.
                                    </p>
                                </div>
                            </div>

                            <div className="flex space-x-3">
                                <button
                                    onClick={handleMarkAsPaid}
                                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                                >
                                    <CheckCircleIcon className="w-5 h-5" />
                                    <span>Mark as Paid</span>
                                </button>
                                <button
                                    onClick={() => setSelectedArrear(null)}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ArrearsTracker;
