import React, { useState, useEffect } from 'react';
// Force Rebuild
import Header from '../ui/Header';
import { useProfile } from '../../context/ProfileContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
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
import {
    LayoutDashboard,
    Wallet,
    ShieldCheck,
    BookOpen,
    Beaker
} from 'lucide-react';
import { FinancialOverview } from './FinancialOverview';
import { ComplianceTracker } from './ComplianceTracker';
import { AcademicStandards } from './AcademicStandards';
import { STEMLabManager } from './STEMLabManager';
import { PeopleOverview } from './PeopleOverview';
import { ProprietorBottomNav } from '../ui/DashboardBottomNav';
import EmailVerificationPrompt from '../auth/EmailVerificationPrompt';


interface ProprietorDashboardProps {
    onLogout?: () => void;
    setIsHomePage?: (isHome: boolean) => void;
    currentUser?: any;
}

const ProprietorDashboard: React.FC<ProprietorDashboardProps> = ({ onLogout, setIsHomePage, currentUser }) => {
    const { profile } = useProfile();
    const { user } = useAuth();
    const [currentView, setCurrentView] = useState<'overview' | 'finance' | 'compliance' | 'academic' | 'stem' | 'people'>('overview');

    // feesCollected/pendingFees/totalStudents/totalTeachers come from live dashboard data.
    // There is no expense-tracking feature anywhere in the app, so expenses/net profit
    // are not shown here rather than fabricated.
    const [stats, setStats] = useState({
        feesCollected: 0,
        pendingFees: 0,
        totalStudents: 0,
        totalTeachers: 0
    });
    const [statsLoading, setStatsLoading] = useState(true);

    useEffect(() => {
        setIsHomePage(true);
        let cancelled = false;
        (async () => {
            try {
                const data = await api.getDashboardStats();
                if (cancelled) return;
                setStats({
                    feesCollected: data?.fees?.paid || 0,
                    pendingFees: (data?.fees?.overdue || 0) + (data?.fees?.unpaid || 0),
                    totalStudents: data?.totalStudents || 0,
                    totalTeachers: data?.totalTeachers || 0
                });
            } catch (error) {
                console.error('[ProprietorDashboard] Failed to load dashboard stats:', error);
            } finally {
                if (!cancelled) setStatsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [setIsHomePage]);

    const StatCard: React.FC<{
        title: string;
        value: string | number;
        icon: React.ReactElement<{ className?: string }>;
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

    const renderContent = () => {
        switch (currentView) {
            case 'finance': return <FinancialOverview />;
            case 'compliance': return <ComplianceTracker />;
            case 'academic': return <AcademicStandards />;
            case 'stem': return <STEMLabManager />;
            case 'people': return <PeopleOverview />;
            default: return (
                <div className="space-y-6">
                    {!user?.user_metadata?.email_verified && (
                        <EmailVerificationPrompt />
                    )}
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <StatCard
                                title="Fees Collected"
                                value={statsLoading ? '—' : formatCurrency(stats.feesCollected)}
                                icon={<DollarSignIcon />}
                                color="bg-green-500"
                            />
                            <StatCard
                                title="Pending Fees"
                                value={statsLoading ? '—' : formatCurrency(stats.pendingFees)}
                                icon={<ExclamationCircleIcon />}
                                color="bg-yellow-500"
                            />
                        </div>
                    </div>

                    {/* School Stats */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-4">School Statistics</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="cursor-pointer" onClick={() => handleNavClick('people')}>
                                <StatCard
                                    title="Total Students"
                                    value={statsLoading ? '—' : stats.totalStudents}
                                    icon={<UserGroupIcon />}
                                    color="bg-indigo-500"
                                />
                            </div>
                            <div className="cursor-pointer" onClick={() => handleNavClick('people')}>
                                <StatCard
                                    title="Teaching Staff"
                                    value={statsLoading ? '—' : stats.totalTeachers}
                                    icon={<UserGroupIcon />}
                                    color="bg-blue-500"
                                />
                            </div>
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
                </div>
            );
        }
    };

    const handleNavClick = (view: typeof currentView) => {
        setCurrentView(view);
    };

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden relative">

            {/* Sidebar Navigation - Desktop Only */}
            <div className={`
                hidden lg:flex flex-col fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white
            `}>
                <div className="p-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold tracking-wider">Proprietor<span className="text-indigo-400">Portal</span></h2>
                        <p className="text-xs text-slate-400 mt-1">School Management Suite</p>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
                    <button
                        onClick={() => handleNavClick('overview')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'overview' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                    >
                        <LayoutDashboard className="w-5 h-5" />
                        <span className="font-medium">Overview</span>
                    </button>

                    <div className="pt-4 pb-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Modules
                    </div>

                    <button
                        onClick={() => handleNavClick('finance')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'finance' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                    >
                        <Wallet className="w-5 h-5" />
                        <span className="font-medium">Financial Assurance</span>
                    </button>

                    <button
                        onClick={() => handleNavClick('compliance')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'compliance' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                    >
                        <ShieldCheck className="w-5 h-5" />
                        <span className="font-medium">Compliance & OEQA</span>
                    </button>

                    <button
                        onClick={() => handleNavClick('academic')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'academic' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                    >
                        <BookOpen className="w-5 h-5" />
                        <span className="font-medium">Curriculum Standards</span>
                    </button>

                    <button
                        onClick={() => handleNavClick('stem')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'stem' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                    >
                        <Beaker className="w-5 h-5" />
                        <span className="font-medium">STEM & Labs</span>
                    </button>

                    <button
                        onClick={() => handleNavClick('people')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'people' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                    >
                        <UserGroupIcon className="w-5 h-5" />
                        <span className="font-medium">People & Roles</span>
                    </button>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button onClick={onLogout} className="w-full py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium">
                        Sign Out
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden w-full lg:ml-64">
                <Header
                    title={
                        currentView === 'overview' ? 'Dashboard Overview' :
                            currentView === 'finance' ? 'Financial Hub' :
                                currentView === 'compliance' ? 'Compliance Center' :
                                    currentView === 'academic' ? 'Academic Standards' :
                                        currentView === 'stem' ? 'STEM Lab Manager' : 'Stakeholder Management'
                    }
                    avatarUrl={profile.avatarUrl}
                    bgColor="bg-gradient-to-r from-purple-600 to-purple-800 text-white border-0"
                    onLogout={onLogout}
                    notificationCount={3}
                    customId={user?.app_metadata?.custom_id || user?.user_metadata?.custom_id}
                />

                <main className="flex-1 overflow-y-auto bg-gray-50 pb-24 lg:pb-6">
                    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
                        {renderContent()}
                    </div>
                </main>

                {/* Mobile Bottom Navigation */}
                <div className="lg:hidden fixed bottom-0 left-0 z-50 w-full">
                    <ProprietorBottomNav activeScreen={currentView} setActiveScreen={(screen) => handleNavClick(screen as any)} />
                </div>
            </div>
        </div>
    );
};

export default ProprietorDashboard;
