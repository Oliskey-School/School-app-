import React from 'react';
import Header from '../ui/Header';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';
import { DashboardType } from '../../types';
import { THEME_CONFIG } from '../../constants';
import { AdminSidebar, TeacherSidebar, ParentSidebar, StudentSidebar } from '../ui/DashboardSidebar';
import { AdminBottomNav, TeacherBottomNav, ParentBottomNav, StudentBottomNav } from '../ui/DashboardBottomNav';

interface DashboardLayoutProps {
    children: React.ReactNode;
    title?: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, title }) => {
    const { user, role } = useAuth();
    const notificationCount = useRealtimeNotifications(role?.toLowerCase() as any || 'admin');

    const handleLogout = () => {
        // Implementation handled by App.tsx, but provided for consistency
        window.location.href = '/login';
    };

    const getSidebar = () => {
        switch (role) {
            case DashboardType.Admin:
            case DashboardType.SuperAdmin:
            case DashboardType.Proprietor:
                return <AdminSidebar activeScreen="home" setActiveScreen={() => { }} onLogout={handleLogout} />;
            case DashboardType.Teacher:
                return <TeacherSidebar activeScreen="home" setActiveScreen={() => { }} onLogout={handleLogout} />;
            case DashboardType.Parent:
                return <ParentSidebar activeScreen="home" setActiveScreen={() => { }} onLogout={handleLogout} />;
            case DashboardType.Student:
                return <StudentSidebar activeScreen="home" setActiveScreen={() => { }} onLogout={handleLogout} />;
            default:
                return null;
        }
    };

    const getBottomNav = () => {
        switch (role) {
            case DashboardType.Admin:
            case DashboardType.SuperAdmin:
            case DashboardType.Proprietor:
                return <AdminBottomNav activeScreen="home" setActiveScreen={() => { }} />;
            case DashboardType.Teacher:
                return <TeacherBottomNav activeScreen="home" setActiveScreen={() => { }} />;
            case DashboardType.Parent:
                return <ParentBottomNav activeScreen="home" setActiveScreen={() => { }} />;
            case DashboardType.Student:
                return <StudentBottomNav activeScreen="home" setActiveScreen={() => { }} />;
            default:
                return null;
        }
    };

    const theme = role ? THEME_CONFIG[role as keyof typeof THEME_CONFIG] : THEME_CONFIG[DashboardType.Admin];

    return (
        <div className="flex h-screen w-full overflow-hidden bg-gray-100">
            {/* Desktop Sidebar */}
            <div className="hidden lg:flex w-64 flex-col fixed inset-y-0 left-0 z-50">
                {getSidebar()}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen w-full lg:ml-64 overflow-hidden min-w-0">
                <Header
                    title={title || 'Dashboard'}
                    avatarUrl={user?.user_metadata?.avatar_url || ''}
                    bgColor={theme?.mainBg || 'bg-indigo-800'}
                    onLogout={handleLogout}
                    notificationCount={notificationCount}
                />
                <div className="flex-1 overflow-y-auto pb-56 lg:pb-0" style={{ marginTop: '-5rem' }}>
                    <main className="min-h-full pt-20 px-4 sm:px-6 lg:px-8">
                        <div className="animate-slide-in-up">
                            {children}
                        </div>
                    </main>
                </div>

                {/* Mobile/Tablet Bottom Nav */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
                    {getBottomNav()}
                </div>
            </div>
        </div>
    );
};

export default DashboardLayout;
