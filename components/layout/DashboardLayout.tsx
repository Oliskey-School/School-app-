import React, { useState } from 'react';
import Header from '../ui/Header';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';
import { DashboardType } from '../../types';
import { THEME_CONFIG } from '../../constants';
import { AdminSidebar, TeacherSidebar, ParentSidebar, StudentSidebar, InspectorSidebar } from '../ui/DashboardSidebar';
import { AdminBottomNav, TeacherBottomNav, ParentBottomNav, StudentBottomNav, InspectorBottomNav } from '../ui/DashboardBottomNav';
import { X } from 'lucide-react';
import { BranchSwitcher } from '../shared/BranchSwitcher';
import { formatSchoolId } from '../../utils/idFormatter';
import { DEMO_ROLES_ORDER, DEMO_ACCOUNTS } from '../../lib/mockAuth';

interface DashboardLayoutProps {
    children: React.ReactNode;
    title?: string;
    onBack?: () => void;
    activeScreen?: string;
    setActiveScreen?: (screen: string) => void;
    hideHeader?: boolean;
    hidePadding?: boolean;
    onLogout?: () => void;
}

import { useProfile } from '../../context/ProfileContext';
import { useAutoSync } from '../../hooks/useAutoSync';

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, title, onBack, activeScreen = 'home', setActiveScreen = () => { }, hideHeader = false, hidePadding = false, onLogout }) => {
    const { user, role, signOut, currentSchool, isDemo, switchDemoRole } = useAuth();
    const { profile, refreshProfile } = useProfile(); // Use Profile Context
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [switchingRole, setSwitchingRole] = useState<string | null>(null);
    const notificationCount = useRealtimeNotifications(role?.toLowerCase() as any || 'admin');

    // Auto-sync profile data when any user-related table changes
    useAutoSync(['teachers', 'students', 'parents', 'users'], () => {
        console.log('🔄 [DashboardLayout] Sync event detected, refreshing profile...');
        refreshProfile();
    });

    const handleDemoRoleSwitch = async (roleKey: string) => {
        if (roleKey === role?.toLowerCase()) return;
        setSwitchingRole(roleKey);
        try {
            await switchDemoRole(roleKey);
        } finally {
            setSwitchingRole(null);
        }
    };

    const handleLogout = async () => {
        if (onLogout) {
            onLogout();
        } else if (signOut) {
            await signOut();
        } else {
            window.location.href = '/login';
        }
    };

    const formatId = (id: string | null | undefined) => {
        if (!id) return '';
        // If it's already a full standard ID with 3 underscores, return it
        if (id.split('_').length >= 4) return id;

        // Force 'OLISKEY' for demo mode
        const schoolCode = user?.school_code || user?.user_metadata?.school_code || 'OLISKEY';
        const branchCode = user?.branch_code || user?.user_metadata?.branch_code || 'MAIN';
        
        // Priority for role detection: 1. Auth role enum, 2. Profile role, 3. Metadata role, 4. Fallback Admin
        const rawRole = role || profile?.role || user?.role || user?.user_metadata?.role || 'Admin';
        const userRole = (typeof rawRole === 'string') ? (rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase()) : rawRole;

        return formatSchoolId(id, userRole as string, schoolCode, branchCode);
    };

    const getSidebar = (isMobile = false) => {
        const props = {
            activeScreen,
            setActiveScreen: (screen: string) => {
                React.startTransition(() => {
                    setActiveScreen(screen);
                    if (isMobile) setIsMobileMenuOpen(false);
                });
            },
            onLogout: handleLogout,
            schoolName: currentSchool?.name || user?.school?.name || user?.user_metadata?.school_name || 'Oliskey School',
            logoUrl: currentSchool?.logoUrl || user?.school?.logo_url || user?.user_metadata?.logo_url || ''
        };

        switch (role) {
            case DashboardType.Admin:
            case DashboardType.SuperAdmin:
            case DashboardType.Proprietor:
                return <AdminSidebar {...props} />;
            case DashboardType.Inspector:
                return <InspectorSidebar {...props} />;
            case DashboardType.Teacher:
                return <TeacherSidebar {...props} />;
            case DashboardType.Parent:
                return <ParentSidebar {...props} />;
            case DashboardType.Student:
                return <StudentSidebar {...props} />;
            default:
                return null;
        }
    };

    const getBottomNav = () => {
        const props = { 
            activeScreen, 
            setActiveScreen: (screen: string) => {
                React.startTransition(() => {
                    setActiveScreen(screen);
                });
            }
        };
        switch (role) {
            case DashboardType.Admin:
            case DashboardType.SuperAdmin:
            case DashboardType.Proprietor:
                return <AdminBottomNav {...props} />;
            case DashboardType.Inspector:
                return <InspectorBottomNav {...props} />;
            case DashboardType.Teacher:
                return <TeacherBottomNav {...props} />;
            case DashboardType.Parent:
                return <ParentBottomNav {...props} />;
            case DashboardType.Student:
                return <StudentBottomNav {...props} />;
            default:
                return null;
        }
    };

    const theme = role ? THEME_CONFIG[role as keyof typeof THEME_CONFIG] : THEME_CONFIG[DashboardType.Admin];

    return (
        <div className="flex h-screen w-full overflow-hidden bg-gray-50">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 left-0 z-40 bg-white border-r border-gray-200">
                {getSidebar()}
            </aside>

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Sidebar Drawer */}
            <aside className={`fixed inset-y-0 left-0 z-[60] w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="absolute top-4 right-4">
                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-4 border-b border-gray-50 bg-gray-50/30">
                    <BranchSwitcher align="left" />
                </div>
                {getSidebar(true)}
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen w-full lg:ml-64 overflow-hidden min-w-0 relative">

                {/* Demo Banner — visible in demo mode */}
                {isDemo && (
                    <div className="flex-shrink-0 bg-gradient-to-r from-blue-700 to-indigo-700 text-white px-4 py-2 flex items-center justify-between gap-2 text-xs font-medium z-30">
                        <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-300 animate-pulse" />
                            Demo Mode — changes reset daily
                        </span>
                        <button
                            onClick={() => {
                                sessionStorage.removeItem('is_demo_mode');
                                window.location.href = '/';
                            }}
                            className="bg-white text-blue-700 font-bold px-3 py-1 rounded-lg text-[10px] hover:bg-blue-50 transition flex-shrink-0"
                        >
                            Create Your School
                        </button>
                    </div>
                )}

                {!hideHeader && (
                    <Header
                        title={title || 'Dashboard'}
                        // Use profile.avatar_url (live state) -> fallback to top-level user field -> Supabase metadata -> empty
                        avatarUrl={profile?.avatar_url || user?.avatar_url || user?.user_metadata?.avatar_url || ''}
                        bgColor={theme?.mainBg || 'bg-blue-700'}
                        onLogout={handleLogout}
                        onBack={onBack}
                        onMenuClick={() => setIsMobileMenuOpen(true)}
                        notificationCount={notificationCount}
                        className="w-full flex-shrink-0"
                        userName={user?.full_name || profile?.full_name || user?.user_metadata?.full_name || 'User'}
                        customId={formatId(user?.school_generated_id || profile?.school_generated_id || user?.user_metadata?.school_generated_id)}
                    />
                )}

                <div className={`flex-1 overflow-y-auto overflow-x-hidden relative ${!hideHeader ? '-mt-8 sm:-mt-10 md:-mt-12 lg:-mt-16' : ''} ${!hidePadding ? 'pb-24 lg:pb-12' : 'pb-0'}`}>
                    <main className={`min-h-full ${!hideHeader ? 'pt-8 sm:pt-10 md:pt-12 lg:pt-16' : ''} ${!hidePadding ? 'px-4 sm:px-6 lg:px-8 max-w-7xl' : 'px-0 max-w-none'} mx-auto w-full`}>
                        <div className="animate-slide-in-up w-full h-full">
                            {children}
                        </div>
                    </main>
                </div>

                {/* Mobile/Tablet Bottom Nav */}
                <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md shadow-[0_-2px_10px_rgba(0,0,0,0.05)] border-t border-gray-100">
                    {getBottomNav()}
                </nav>

                {/* Demo Role Switcher Pill — REMOVED PER USER REQUEST */}
            </div>
        </div>
    );
};

export default DashboardLayout;
