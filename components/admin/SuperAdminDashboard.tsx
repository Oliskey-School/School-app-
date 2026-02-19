
import React, { lazy, Suspense, useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { SaaSProvider, useSaaS } from '../../contexts/SaaSContext';
import { supabase } from '../../lib/supabase';
import { LogOut, LayoutDashboard, Building, Briefcase, Settings, Menu, X, Bell, User, Search, CreditCard, DollarSign, BarChart, Shield, Users, Lock, Globe } from 'lucide-react';
import { Header } from './Header'; // Use shared Header
import { Toaster, toast } from 'react-hot-toast';
// import { realtimeService } from '../../services/RealtimeService';

// SaaS Imports
const SchoolManagementScreen = lazy(() => import('./saas/SchoolManagementScreen'));
const PlanManagementScreen = lazy(() => import('./saas/PlanManagementScreen'));
const SaaSDashboardOverview = lazy(() => import('./saas/SaaSDashboardOverview'));
const SubscriptionManagement = lazy(() => import('./saas/SubscriptionManagement'));
const PaymentDashboard = lazy(() => import('./saas/PaymentDashboard'));
const AnalyticsDashboard = lazy(() => import('./saas/AnalyticsDashboard'));
const NotificationCenter = lazy(() => import('./saas/NotificationCenter'));
const AuditLogViewer = lazy(() => import('./saas/AuditLogViewer'));
const RoleManagementScreen = lazy(() => import('./saas/RoleManagementScreen'));
const SecuritySettings = lazy(() => import('./saas/SecuritySettings'));
const ProfileSettings = lazy(() => import('../admin/ProfileSettings')); // Reuse settings
const PaymentGatewaySettings = lazy(() => import('./saas/PaymentGatewaySettings'));

interface SuperAdminDashboardProps {
    onLogout?: () => void;
    setIsHomePage?: (isHome: boolean) => void;
    currentUser?: any;
}

const SuperAdminDashboardContent: React.FC<SuperAdminDashboardProps> = ({ onLogout, setIsHomePage, currentUser }) => {
    const [activeScreen, setActiveScreen] = useState('overview');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        setIsHomePage(activeScreen === 'overview');
    }, [activeScreen, setIsHomePage]);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: userData } = await supabase.from('users').select('id').eq('email', user.email).single();
                setCurrentUserId(userData ? userData.id : '0');

                // Real-time Service Integration for Super Admin - Removed
                /*
                realtimeService.subscribeToNotifications(user.id, (notif) => {
                    toast(notif.message || notif.content || 'System Alert', {
                        icon: '⚠️',
                        duration: 5000,
                        style: {
                            borderRadius: '10px',
                            background: '#333',
                            color: '#fff',
                        }
                    });
                });

                // Global table sync for Audit Logs or Schools
                realtimeService.subscribeToTable('schools', null, (payload) => {
                    console.log('Real-time School Update:', payload);
                    // Could trigger a data refresh here
                });
                */
            }
        };
        getUser();

        /*
        return () => {
            realtimeService.unsubscribeAll();
        };
        */
    }, []);

    const renderContent = () => {
        switch (activeScreen) {
            case 'overview': return <SaaSDashboardOverview navigateTo={(screen) => setActiveScreen(screen)} />;
            case 'schools': return <SchoolManagementScreen navigateTo={(screen) => setActiveScreen(screen)} />;
            case 'plans': return <PlanManagementScreen navigateTo={(screen) => setActiveScreen(screen)} />;
            case 'subscriptions': return <SubscriptionManagement navigateTo={(screen) => setActiveScreen(screen)} />;
            case 'payments': return <PaymentDashboard navigateTo={(screen) => setActiveScreen(screen)} />;
            case 'analytics': return <AnalyticsDashboard navigateTo={(screen) => setActiveScreen(screen)} />;
            case 'notifications': return <NotificationCenter navigateTo={(screen) => setActiveScreen(screen)} />;
            case 'audit-logs': return <AuditLogViewer navigateTo={(screen) => setActiveScreen(screen)} />;
            case 'roles': return <RoleManagementScreen navigateTo={(screen) => setActiveScreen(screen)} />;
            case 'security': return <SecuritySettings navigateTo={(screen) => setActiveScreen(screen)} />;
            case 'gateways': return <PaymentGatewaySettings navigateTo={(screen) => setActiveScreen(screen)} />;
            case 'settings': return <ProfileSettings onLogout={onLogout} navigateTo={(screen) => setActiveScreen(screen)} />;
            default: return <SaaSDashboardOverview navigateTo={(screen) => setActiveScreen(screen)} />;
        }
    };

    return (
        <div className="flex h-screen w-full bg-gray-100 overflow-hidden">
            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0`}>
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="h-16 flex items-center px-6 bg-slate-950 border-b border-slate-800">
                        <Building className="w-6 h-6 text-purple-400 mr-3" />
                        <span className="font-bold text-lg tracking-wide">SaaS Control</span>
                    </div>

                    {/* Nav Items */}
                    <div className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
                        <NavItem
                            icon={LayoutDashboard}
                            label="Overview"
                            isActive={activeScreen === 'overview'}
                            onClick={() => setActiveScreen('overview')}
                        />
                        <NavItem
                            icon={Building}
                            label="Manage Schools"
                            isActive={activeScreen === 'schools'}
                            onClick={() => setActiveScreen('schools')}
                        />
                        <NavItem
                            icon={Briefcase}
                            label="Subscription Plans"
                            isActive={activeScreen === 'plans'}
                            onClick={() => setActiveScreen('plans')}
                        />
                        <NavItem
                            icon={CreditCard}
                            label="Subscriptions"
                            isActive={activeScreen === 'subscriptions'}
                            onClick={() => setActiveScreen('subscriptions')}
                        />
                        <NavItem
                            icon={DollarSign}
                            label="Payments & Billing"
                            isActive={activeScreen === 'payments'}
                            onClick={() => setActiveScreen('payments')}
                        />
                        <NavItem
                            icon={BarChart}
                            label="Analytics & Reports"
                            isActive={activeScreen === 'analytics'}
                            onClick={() => setActiveScreen('analytics')}
                        />
                        <NavItem
                            icon={Bell}
                            label="Notifications"
                            isActive={activeScreen === 'notifications'}
                            onClick={() => setActiveScreen('notifications')}
                        />
                        <NavItem
                            icon={Shield}
                            label="Audit Logs"
                            isActive={activeScreen === 'audit-logs'}
                            onClick={() => setActiveScreen('audit-logs')}
                        />
                        <NavItem
                            icon={Users}
                            label="Roles & Permissions"
                            isActive={activeScreen === 'roles'}
                            onClick={() => setActiveScreen('roles')}
                        />
                        <div className="pt-6 pb-2">
                            <div className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Account</div>
                        </div>
                        <NavItem
                            icon={Lock}
                            label="Security"
                            isActive={activeScreen === 'security'}
                            onClick={() => setActiveScreen('security')}
                        />
                        <NavItem
                            icon={Globe}
                            label="Gateway Settings"
                            isActive={activeScreen === 'gateways'}
                            onClick={() => setActiveScreen('gateways')}
                        />
                        <NavItem
                            icon={Settings}
                            label="Settings"
                            isActive={activeScreen === 'settings'}
                            onClick={() => setActiveScreen('settings')}
                        />
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-800 bg-slate-950">
                        <button
                            onClick={onLogout}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-slate-900 rounded-lg transition-colors"
                        >
                            <LogOut className="w-5 h-5 mr-3" />
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6 lg:px-8 z-40">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <div className="text-xl font-bold text-gray-800 lg:ml-0 ml-4">
                        {activeScreen === 'overview' && 'Dashboard Overview'}
                        {activeScreen === 'schools' && 'Manage Schools'}
                        {activeScreen === 'plans' && 'Subscription Plans'}
                        {activeScreen === 'settings' && 'Settings'}
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold border border-purple-200">
                            SUPER ADMIN
                        </span>
                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-300">
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=SuperAdmin`} alt="Avatar" className="h-full w-full" />
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    <Suspense fallback={
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                        </div>
                    }>
                        {renderContent()}
                    </Suspense>
                </main>
            </div>
        </div>
    );
};

// Sub-components
const NavItem = ({ icon: Icon, label, isActive, onClick }: any) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center px-4 py-3 rounded-lg transition-all duration-200 group ${isActive
            ? 'bg-purple-600 text-white shadow-md shadow-purple-900/20'
            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
    >
        <Icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
        <span className="font-medium">{label}</span>
    </button>
);

const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = (props) => {
    return (
        <SaaSProvider>
            <SuperAdminDashboardContent {...props} />
        </SaaSProvider>
    );
};

export default SuperAdminDashboard;
