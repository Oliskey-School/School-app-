import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ClockIcon, CheckCircleIcon, CalendarIcon } from '../../constants';

interface LeaveBalance {
    leave_type: string;
    total_days: number;
    used_days: number;
    remaining_days: number;
}

interface LeaveBalanceTrackerProps {
    teacherId?: number;
    compact?: boolean;
}

const LeaveBalanceTracker: React.FC<LeaveBalanceTrackerProps> = ({ teacherId, compact = false }) => {
    const [balances, setBalances] = useState<LeaveBalance[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (teacherId) {
            fetchBalances();
        }
    }, [teacherId]);

    const fetchBalances = async () => {
        try {
            setLoading(true);

            // Get leave balances
            const { data: balanceData, error: balanceError } = await supabase
                .from('leave_balances')
                .select(`
          *,
          leave_types (
            name,
            default_days
          )
        `)
                .eq('teacher_id', teacherId);

            if (balanceError) throw balanceError;

            // Format data
            const formatted = (balanceData || []).map((item: any) => ({
                leave_type: item.leave_types?.name || 'Unknown',
                total_days: item.total_days || 0,
                used_days: item.used_days || 0,
                remaining_days: item.remaining_days || 0
            }));

            setBalances(formatted);
        } catch (error: any) {
            console.error('Error fetching leave balances:', error);
        } finally {
            setLoading(false);
        }
    };

    const getProgressColor = (remaining: number, total: number) => {
        const percentage = (remaining / total) * 100;
        if (percentage > 50) return 'bg-green-500';
        if (percentage > 25) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (balances.length === 0) {
        return (
            <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200">
                <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No leave balances configured</p>
            </div>
        );
    }

    if (compact) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {balances.map((balance, index) => (
                    <div key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                        <p className="text-xs text-gray-600 mb-1">{balance.leave_type}</p>
                        <p className="text-lg font-bold text-gray-900">{balance.remaining_days}</p>
                        <p className="text-xs text-gray-500">of {balance.total_days} days</p>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Leave Balance</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {balances.map((balance, index) => (
                    <div key={index} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h4 className="font-semibold text-gray-900">{balance.leave_type}</h4>
                                <p className="text-sm text-gray-600 mt-1">
                                    {balance.remaining_days} of {balance.total_days} days remaining
                                </p>
                            </div>
                            <CalendarIcon className="w-8 h-8 text-indigo-500" />
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-gray-600">
                                <span>Used: {balance.used_days} days</span>
                                <span>Available: {balance.remaining_days} days</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                    className={`h-3 rounded-full transition-all ${getProgressColor(
                                        balance.remaining_days,
                                        balance.total_days
                                    )}`}
                                    style={{ width: `${(balance.remaining_days / balance.total_days) * 100}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                            <div>
                                <p className="text-xs text-gray-600">Used</p>
                                <p className="text-sm font-semibold text-gray-900">{balance.used_days} days</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-600">Remaining</p>
                                <p className="text-sm font-semibold text-green-600">{balance.remaining_days} days</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Summary Card */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
                <div className="flex items-center space-x-3">
                    <CheckCircleIcon className="w-6 h-6 text-indigo-600" />
                    <div>
                        <h4 className="font-semibold text-gray-900">Total Leave Days</h4>
                        <p className="text-sm text-gray-600 mt-1">
                            {balances.reduce((sum, b) => sum + b.remaining_days, 0)} days available across all leave types
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeaveBalanceTracker;
