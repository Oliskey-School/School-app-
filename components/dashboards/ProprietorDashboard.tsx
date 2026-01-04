import React, { useState, useEffect } from 'react';
import Header from '../ui/Header';
import { useProfile } from '../../context/ProfileContext';
import {
    ChartBarIcon,
    DollarSignIcon,
    UserGroupIcon,
    DocumentTextIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    TrendingUpIcon,
    CalendarIcon
} from '../../constants';

interface ProprietorDashboardProps {
    onLogout: () => void;
    setIsHomePage: (isHome: boolean) => void;
}

const ProprietorDashboard: React.FC<ProprietorDashboardProps> = ({ onLogout, setIsHomePage }) => {
    const { profile } = useProfile();
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        totalStudents: 0,
        totalTeachers: 0,
        pendingFees: 0
    });

    useEffect(() => {
        setIsHomePage(true);
        // TODO: Fetch actual stats from database
        setStats({
            totalRevenue: 15500000,
            totalExpenses: 8200000,
            netProfit: 7300000,
            totalStudents: 450,
            totalTeachers: 32,
            pendingFees: 3200000
        });
    }, [setIsHomePage]);

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
                        <p className="text-xs text-green-600 mt-1 flex items-center">
                            <TrendingUpIcon className="w-3 h-3 mr-1" />
                            {trend}
                        </p>
                    )}
                </div>
                <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center`}>
                    {React.cloneElement(icon, { className: 'w-6 h-6 text-white' })}
                </div>
            </div>
        </div>
    );

    const formatCurrency = (amount: number) => {
        return `₦${amount.toLocaleString('en-NG')}`;
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <Header
                title="Proprietor Dashboard"
                avatarUrl={profile.avatarUrl}
                bgColor="bg-purple-800"
                onLogout={onLogout}
                notificationCount={0}
            />

            <main className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Welcome Section */}
                <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-xl p-6 text-white">
                    <h2 className="text-2xl font-bold">Welcome back, {profile.name}</h2>
                    <p className="mt-2 text-purple-100">
                        Here's your school's performance overview
                    </p>
                </div>

                {/* Financial Stats */}
                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Financial Overview</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatCard
                            title="Total Revenue"
                            value={formatCurrency(stats.totalRevenue)}
                            icon={<DollarSignIcon />}
                            color="bg-green-500"
                            trend="+12% from last month"
                        />
                        <StatCard
                            title="Total Expenses"
                            value={formatCurrency(stats.totalExpenses)}
                            icon={<DocumentTextIcon />}
                            color="bg-red-500"
                            trend="+5% from last month"
                        />
                        <StatCard
                            title="Net Profit"
                            value={formatCurrency(stats.netProfit)}
                            icon={<TrendingUpIcon />}
                            color="bg-purple-500"
                            trend="+18% from last month"
                        />
                    </div>
                </div>

                {/* School Stats */}
                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">School Statistics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatCard
                            title="Total Students"
                            value={stats.totalStudents}
                            icon={<UserGroupIcon />}
                            color="bg-indigo-500"
                            trend="+8 new this month"
                        />
                        <StatCard
                            title="Teaching Staff"
                            value={stats.totalTeachers}
                            icon={<UserGroupIcon />}
                            color="bg-blue-500"
                            trend="2 new hires"
                        />
                        <StatCard
                            title="Pending Fees"
                            value={formatCurrency(stats.pendingFees)}
                            icon={<ExclamationCircleIcon />}
                            color="bg-yellow-500"
                        />
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
                            <ChartBarIcon className="w-5 h-5" />
                            <span>View Financial Reports</span>
                        </button>
                        <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                            <DocumentTextIcon className="w-5 h-5" />
                            <span>Review Payroll</span>
                        </button>
                        <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
                            <CalendarIcon className="w-5 h-5" />
                            <span>School Calendar</span>
                        </button>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
                    </div>
                    <div className="p-6">
                        <div className="space-y-4">
                            <div className="flex items-start space-x-3">
                                <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">Monthly Payroll Processed</p>
                                    <p className="text-xs text-gray-500">2 hours ago</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <DocumentTextIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">New Financial Report Generated</p>
                                    <p className="text-xs text-gray-500">5 hours ago</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <UserGroupIcon className="w-5 h-5 text-indigo-600 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">8 New Student Enrollments</p>
                                    <p className="text-xs text-gray-500">1 day ago</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ProprietorDashboard;
