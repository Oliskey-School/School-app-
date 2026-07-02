import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import {
    UserGroupIcon,
    CalendarIcon,
    EditIcon,
} from '../../constants';
import { useAuth } from '../../context/AuthContext';

// NOTE: The backend does not yet expose a dedicated leave-balances endpoint.
// FLAG: api.getLeaveBalances() and api.updateLeaveBalance() need to be added to
// lib/api.ts and a matching route added in backend/src/routes/fee.routes.ts (or payroll).
// For now the screen derives balance data from leave requests and shows a read-only view.
// The edit action is disabled until the backend endpoint exists.

interface TeacherBalance {
    id: string;
    teacher_id: string;
    teacher_name: string;
    leave_type: string;
    leave_type_id: string;
    total_days: number;
    used_days: number;
    remaining_days: number;
}

interface LeaveBalanceProps {
    navigateTo?: (view: string, title: string, props?: any) => void;
}

const LeaveBalance: React.FC<LeaveBalanceProps> = () => {
    const { currentSchool } = useAuth();
    const [balances, setBalances] = useState<TeacherBalance[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingBalance, setEditingBalance] = useState<TeacherBalance | null>(null);
    const [newTotal, setNewTotal] = useState(0);

    useEffect(() => {
        if (!currentSchool) return;
        fetchData();
    }, [currentSchool]);

    const fetchData = async () => {
        if (!currentSchool) return;
        try {
            setLoading(true);
            // Derive balance data from leave requests — approved requests reduce balance
            const requests = await api.getLeaveRequests(undefined, currentSchool.id);
            const approved = (requests || []).filter((r: any) => r.status === 'Approved');

            // Aggregate per teacher + leave_type
            const map: Record<string, TeacherBalance> = {};
            approved.forEach((r: any) => {
                const key = `${r.teacher_id}_${r.leave_type_id || r.leave_type}`;
                if (!map[key]) {
                    map[key] = {
                        id: key,
                        teacher_id: r.teacher_id,
                        teacher_name: r.teachers?.full_name || r.teacher_name || 'Unknown',
                        leave_type: r.leave_types?.name || r.leave_type || 'Unknown',
                        leave_type_id: r.leave_type_id || '',
                        total_days: 30, // Default allocation — update when backend provides real balances
                        used_days: 0,
                        remaining_days: 30,
                    };
                }
                map[key].used_days += r.days_requested || 0;
                map[key].remaining_days = map[key].total_days - map[key].used_days;
            });

            setBalances(Object.values(map));
        } catch (error: any) {
            console.error('Error fetching leave data:', error);
            toast.error('Failed to load leave balances');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateBalance = async () => {
        if (!editingBalance) return;
        // FLAG: This requires api.updateLeaveBalance(id, { total_days, remaining_days })
        // which does not yet exist. Showing a toast until the backend endpoint is added.
        toast.error('Leave balance editing requires a backend update. Please contact your developer.');
        setEditingBalance(null);
        setNewTotal(0);
    };

    const groupByTeacher = () => {
        const grouped: { [key: string]: TeacherBalance[] } = {};
        balances.forEach((balance) => {
            if (!grouped[balance.teacher_id]) {
                grouped[balance.teacher_id] = [];
            }
            grouped[balance.teacher_id].push(balance);
        });
        return grouped;
    };

    const groupedBalances = groupByTeacher();

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
                <h2 className="text-2xl font-bold text-gray-900">Leave Balances</h2>
                <p className="text-sm text-gray-600 mt-1">Manage teacher leave balances and allocations</p>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600">Total Teachers</p>
                    <p className="text-2xl font-bold text-gray-900">{Object.keys(groupedBalances).length}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600">Total Balances</p>
                    <p className="text-2xl font-bold text-gray-900">{balances.length}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600">Total Available Days</p>
                    <p className="text-2xl font-bold text-gray-900">
                        {balances.reduce((sum, b) => sum + Math.max(0, b.remaining_days), 0)}
                    </p>
                </div>
            </div>

            {/* Balances by Teacher */}
            <div className="space-y-4">
                {Object.entries(groupedBalances).map(([teacherId, teacherBalances]) => (
                    <div key={teacherId} className="bg-white rounded-xl shadow-sm border border-gray-100">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center space-x-2">
                                <UserGroupIcon className="w-5 h-5 text-gray-600" />
                                <h3 className="text-lg font-bold text-gray-900">
                                    {teacherBalances[0].teacher_name}
                                </h3>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {teacherBalances.map((balance) => (
                                    <div key={balance.id} className="border border-gray-200 rounded-lg p-4">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <h4 className="font-semibold text-gray-900">{balance.leave_type}</h4>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {Math.max(0, balance.remaining_days)} of {balance.total_days} days
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setEditingBalance(balance);
                                                    setNewTotal(balance.total_days);
                                                }}
                                                className="p-1 hover:bg-gray-100 rounded"
                                                title="Edit allocation"
                                            >
                                                <EditIcon className="w-4 h-4 text-gray-600" />
                                            </button>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="space-y-1">
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-indigo-600 h-2 rounded-full transition-all"
                                                    style={{ width: `${Math.min(100, Math.max(0, (balance.remaining_days / balance.total_days) * 100))}%` }}
                                                ></div>
                                            </div>
                                            <div className="flex justify-between text-xs text-gray-600">
                                                <span>Used: {balance.used_days}</span>
                                                <span>Available: {Math.max(0, balance.remaining_days)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}

                {Object.keys(groupedBalances).length === 0 && (
                    <div className="text-center p-12 bg-gray-50 rounded-lg border border-gray-200">
                        <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No leave balances found</p>
                        <p className="text-sm text-gray-500 mt-2">
                            Balances appear here once teachers have approved leave requests
                        </p>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingBalance && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Update Leave Balance</h3>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-600">Teacher</p>
                                    <p className="font-semibold">{editingBalance.teacher_name}</p>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-600">Leave Type</p>
                                    <p className="font-semibold">{editingBalance.leave_type}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600">Used Days</p>
                                        <p className="font-semibold">{editingBalance.used_days}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Current Total</p>
                                        <p className="font-semibold">{editingBalance.total_days}</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        New Total Days
                                    </label>
                                    <input
                                        type="number"
                                        value={newTotal}
                                        onChange={(e) => setNewTotal(Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        min="0"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        New remaining: {newTotal - editingBalance.used_days} days
                                    </p>
                                </div>
                            </div>

                            <div className="flex space-x-3 mt-6">
                                <button
                                    onClick={handleUpdateBalance}
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                                >
                                    Update Balance
                                </button>
                                <button
                                    onClick={() => {
                                        setEditingBalance(null);
                                        setNewTotal(0);
                                    }}
                                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
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

export default LeaveBalance;
