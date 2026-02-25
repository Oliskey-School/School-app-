import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import {
    UserGroupIcon,
    CalendarIcon,
    EditIcon,
    CheckCircleIcon
} from '../../constants';
import { useAuth } from '../../context/AuthContext';

interface TeacherBalance {
    id: number;
    teacher_id: number;
    teacher_name: string;
    leave_type: string;
    leave_type_id: number;
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
    const [teachers, setTeachers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingBalance, setEditingBalance] = useState<TeacherBalance | null>(null);
    const [newTotal, setNewTotal] = useState(0);

    useEffect(() => {
        if (!currentSchool) return;
        fetchData();
    }, [currentSchool]);

    const fetchData = async () => {
        try {
            setLoading(true);
            await Promise.all([fetchBalances(), fetchTeachers()]);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBalances = async () => {
        if (!currentSchool) return;
        const { data, error } = await supabase
            .from('leave_balances')
            .select(`
        *,
        teachers!inner (
          full_name,
          school_id
        ),
        leave_types (
          name
        )
      `)
            .eq('teachers.school_id', currentSchool.id)
            .order('teacher_id');

        if (error) {
            console.error('Error fetching balances:', error);
            return;
        }

        const formatted: TeacherBalance[] = (data || []).map((item: any) => ({
            id: item.id,
            teacher_id: item.teacher_id,
            teacher_name: item.teachers?.full_name || 'Unknown',
            leave_type: item.leave_types?.name || 'Unknown',
            leave_type_id: item.leave_type_id,
            total_days: item.total_days,
            used_days: item.used_days,
            remaining_days: item.remaining_days
        }));

        setBalances(formatted);
    };

    const fetchTeachers = async () => {
        if (!currentSchool) return;
        const { data, error } = await supabase
            .from('teachers')
            .select('id, full_name')
            .eq('school_id', currentSchool.id)
            .order('full_name');

        if (error) {
            console.error('Error fetching teachers:', error);
            return;
        }

        setTeachers(data || []);
    };

    const handleUpdateBalance = async () => {
        if (!editingBalance) return;

        try {
            const newRemaining = newTotal - editingBalance.used_days;

            const { error } = await supabase
                .from('leave_balances')
                .update({
                    total_days: newTotal,
                    remaining_days: newRemaining
                })
                .eq('id', editingBalance.id);

            if (error) throw error;

            toast.success('Balance updated successfully');
            setEditingBalance(null);
            setNewTotal(0);
            fetchBalances();
        } catch (error: any) {
            console.error('Error updating balance:', error);
            toast.error('Failed to update balance');
        }
    };

    const groupByTeacher = () => {
        const grouped: { [key: number]: TeacherBalance[] } = {};
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
                        {balances.reduce((sum, b) => sum + b.remaining_days, 0)}
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
                                                    {balance.remaining_days} of {balance.total_days} days
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setEditingBalance(balance);
                                                    setNewTotal(balance.total_days);
                                                }}
                                                className="p-1 hover:bg-gray-100 rounded"
                                            >
                                                <EditIcon className="w-4 h-4 text-gray-600" />
                                            </button>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="space-y-1">
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-indigo-600 h-2 rounded-full transition-all"
                                                    style={{ width: `${(balance.remaining_days / balance.total_days) * 100}%` }}
                                                ></div>
                                            </div>
                                            <div className="flex justify-between text-xs text-gray-600">
                                                <span>Used: {balance.used_days}</span>
                                                <span>Available: {balance.remaining_days}</span>
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
                        <p className="text-gray-600">No leave balances configured yet</p>
                        <p className="text-sm text-gray-500 mt-2">
                            Leave balances are created when teachers are assigned leave types
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
