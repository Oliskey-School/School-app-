import React, { useState } from 'react';
import Header from '../ui/Header';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';
import { DashboardType } from '../../types';
import { THEME_CONFIG } from '../../constants';
import { AdminSidebar, TeacherSidebar, ParentSidebar, StudentSidebar } from '../ui/DashboardSidebar';
import { AdminBottomNav, TeacherBottomNav, ParentBottomNav, StudentBottomNav } from '../ui/DashboardBottomNav';
import { X } from 'lucide-react';

interface DashboardLayoutProps {
    children: React.ReactNode;
    title?: string;
    onBack?: () => void;
    activeScreen?: string;
    setActiveScreen?: (screen: string) => void;
    hideHeader?: boolean;
    hidePadding?: boolean;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, title, onBack, activeScreen = 'home', setActiveScreen = () => { }, hideHeader = false, hidePadding = false }) => {
    const { user, role, signOut } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const notificationCount = useRealtimeNotifications(role?.toLowerCase() as any || 'admin');

    const handleLogout = async () => {
        if (signOut) {
            await signOut();
        } else {
            window.location.href = '/login';
        }
    };

    const getSidebar = (isMobile = false) => {
        const props = { 
            activeScreen, 
            setActiveScreen: (screen: string) => {
                setActiveScreen(screen);
                if (isMobile) setIsMobileMenuOpen(false);
            }, 
            onLogout: handleLogout,
            schoolName: user?.user_metadata?.school_name || 'Oliskey School',
            logoUrl: user?.user_metadata?.logo_url
        };

        switch (role) {
            case DashboardType.Admin:
            case DashboardType.SuperAdmin:
            case DashboardType.Proprietor:
                return <AdminSidebar {...props} />;
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
        const props = { activeScreen, setActiveScreen };
        switch (role) {
            case DashboardType.Admin:
            case DashboardType.SuperAdmin:
            case DashboardType.Proprietor:
                return <AdminBottomNav {...props} />;
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
                {getSidebar(true)}
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen w-full lg:ml-64 overflow-hidden min-w-0 relative">
                {!hideHeader && (
                    <Header
                        title={title || 'Dashboard'}
                        avatarUrl={user?.user_metadata?.avatar_url || ''}
                        bgColor={theme?.mainBg || 'bg-indigo-800'}
                        onLogout={handleLogout}
                        onBack={onBack}
                        onMenuClick={() => setIsMobileMenuOpen(true)}
                        notificationCount={notificationCount}
                        className="w-full flex-shrink-0"
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
            </div>
        </div>
    );
};

export default DashboardLayout;
