import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    DocumentTextIcon,
    ChartBarIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    ClockIcon,
    AnalyticsIcon
} from '../../constants';
import { formatCurrency } from '../../lib/payroll';
import { toast } from 'react-hot-toast';

interface PayrollStats {
    totalTeachers: number;
    totalPayroll: number;
    pendingApprovals: number;
    paidThisMonth: number;
    outstandingArrears: number;
}

interface RecentPayslip {
    id: number;
    teacher_name: string;
    period_start: string;
    period_end: string;
    net_salary: number;
    status: string;
}

const PayrollDashboard: React.FC = () => {
    const [stats, setStats] = useState<PayrollStats>({
        totalTeachers: 0,
        totalPayroll: 0,
        pendingApprovals: 0,
        paidThisMonth: 0,
        outstandingArrears: 0
    });
    const [recentPayslips, setRecentPayslips] = useState<RecentPayslip[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            // Get current month start and end
            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
                .toISOString()
                .split('T')[0];
            const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
                .toISOString()
                .split('T')[0];

            // Fetch total teachers with active salary
            const { data: teachers, error: teachersError } = await supabase
                .from('teacher_salaries')
                .select('base_salary')
                .eq('is_active', true);

            if (teachersError) throw teachersError;

            const totalTeachers = teachers?.length || 0;
            const totalPayroll = teachers?.reduce((sum, t) => sum + Number(t.base_salary), 0) || 0;

            // Fetch pending payslips
            const { data: pendingData, error: pendingError } = await supabase
                .from('payslips')
                .select('id')
                .eq('status', 'Draft');

            if (pendingError) throw pendingError;

            // Fetch paid this month
            const { data: paidData, error: paidError } = await supabase
                .from('payslips')
                .select('net_salary')
                .eq('status', 'Paid')
                .gte('period_start', monthStart)
                .lte('period_end', monthEnd);

            if (paidError) throw paidError;

            const paidThisMonth = paidData?.reduce((sum, p) => sum + Number(p.net_salary), 0) || 0;

            // Fetch outstanding arrears
            const { data: arrearsData, error: arrearsError } = await supabase
                .from('arrears')
                .select('amount_owed, amount_paid')
                .in('status', ['Outstanding', 'Partially Paid']);

            if (arrearsError) throw arrearsError;

            const outstandingArrears = arrearsData?.reduce(
                (sum, a) => sum + (Number(a.amount_owed) - Number(a.amount_paid)),
                0
            ) || 0;

            // Fetch recent payslips
            const { data: recentData, error: recentError } = await supabase
                .from('payslips')
                .select(`
          id,
          period_start,
          period_end,
          net_salary,
          status,
          teacher_id,
          teachers (full_name)
        `)
                .order('created_at', { ascending: false })
                .limit(5);

            if (recentError) throw recentError;

            const recent = recentData?.map((p: any) => ({
                id: p.id,
                teacher_name: p.teachers?.full_name || 'Unknown',
                period_start: p.period_start,
                period_end: p.period_end,
                net_salary: p.net_salary,
                status: p.status
            })) || [];

            setStats({
                totalTeachers,
                totalPayroll,
                pendingApprovals: pendingData?.length || 0,
                paidThisMonth,
                outstandingArrears
            });

            setRecentPayslips(recent);
        } catch (error: any) {
            console.error('Error fetching dashboard data:', error);
            toast.error('Failed to load payroll data');
        } finally {
            setLoading(false);
        }
    };

    const StatCard: React.FC<{
        title: string;
        value: string | number;
        icon: React.ReactElement;
        color: string;
        trend?: string;
    }> = ({ title, value, icon, color, trend }) => (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm text-gray-600 font-medium">{title}</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-2">{value}</h3>
                    {trend && (
                        <p className="text-xs text-gray-500 mt-1">{trend}</p>
                    )}
                </div>
                <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center`}>
                    {React.cloneElement(icon, { className: 'w-6 h-6 text-white' })}
                </div>
            </div>
        </div>
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Paid':
                return 'bg-green-100 text-green-800';
            case 'Approved':
                return 'bg-blue-100 text-blue-800';
            case 'Draft':
                return 'bg-yellow-100 text-yellow-800';
            case 'Cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <h1 className="text-2xl font-bold text-gray-900">Payroll Dashboard</h1>
                <p className="text-sm text-gray-600 mt-1">
                    Manage teacher salaries and payroll
                </p>
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="Total Teachers"
                        value={stats.totalTeachers}
                        icon={<AnalyticsIcon />}
                        color="bg-indigo-500"
                        trend="With active salaries"
                    />
                    <StatCard
                        title="Monthly Payroll"
                        value={formatCurrency(stats.totalPayroll)}
                        icon={<DocumentTextIcon />}
                        color="bg-purple-500"
                        trend="Total monthly obligation"
                    />
                    <StatCard
                        title="Pending Approvals"
                        value={stats.pendingApprovals}
                        icon={<ClockIcon />}
                        color="bg-yellow-500"
                        trend="Payslips awaiting review"
                    />
                    <StatCard
                        title="Paid This Month"
                        value={formatCurrency(stats.paidThisMonth)}
                        icon={<CheckCircleIcon />}
                        color="bg-green-500"
                        trend="Successfully disbursed"
                    />
                </div>

                {/* Arrears Alert */}
                {stats.outstandingArrears > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start space-x-3">
                        <ExclamationCircleIcon className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h4 className="font-semibold text-orange-900">Outstanding Arrears</h4>
                            <p className="text-sm text-orange-800 mt-1">
                                {formatCurrency(stats.outstandingArrears)} in unpaid arrears requires attention
                            </p>
                        </div>
                        <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium">
                            View Arrears
                        </button>
                    </div>
                )}

                {/* Quick Actions */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                            <DocumentTextIcon className="w-5 h-5" />
                            <span>Generate Payslips</span>
                        </button>
                        <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
                            <CheckCircleIcon className="w-5 h-5" />
                            <span>Approve Payslips</span>
                        </button>
                        <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
                            <ChartBarIcon className="w-5 h-5" />
                            <span>View Reports</span>
                        </button>
                    </div>
                </div>

                {/* Recent Payslips */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-bold text-gray-900">Recent Payslips</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Teacher
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Period
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Net Salary
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {recentPayslips.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                            No payslips generated yet
                                        </td>
                                    </tr>
                                ) : (
                                    recentPayslips.map((payslip) => (
                                        <tr key={payslip.id} className="hover:bg-gray-50 cursor-pointer">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {payslip.teacher_name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-600">
                                                    {new Date(payslip.period_start).toLocaleDateString()} -{' '}
                                                    {new Date(payslip.period_end).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-semibold text-gray-900">
                                                    {formatCurrency(payslip.net_salary)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                                                        payslip.status
                                                    )}`}
                                                >
                                                    {payslip.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PayrollDashboard;
