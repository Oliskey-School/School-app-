import React from 'react';
import { Bell, Search, LogOut, ChevronLeft, Menu } from 'lucide-react';

interface HeaderProps {
    title: string;
    avatarUrl?: string;
    bgColor?: string;
    onLogout: () => void;
    onBack?: () => void;
    onNotificationClick: () => void;
    notificationCount: number;
    onSearchClick: () => void;
    onMenuClick?: () => void; // For mobile menu
}

export const Header: React.FC<HeaderProps> = ({
    title,
    avatarUrl,
    bgColor = 'bg-indigo-800',
    onLogout,
    onBack,
    onNotificationClick,
    notificationCount,
    onSearchClick,
    onMenuClick
}) => {
    return (
        <header className={`${bgColor} text-white shadow-lg z-40 transition-colors duration-300`}>
            <div className="flex items-center justify-between px-4 py-3 lg:px-8">

                {/* Left Section: Menu, Back, Title */}
                <div className="flex items-center space-x-4">
                    {onMenuClick && (
                        <button onClick={onMenuClick} className="lg:hidden p-1 hover:bg-white/10 rounded-lg transition-colors">
                            <Menu className="w-6 h-6" />
                        </button>
                    )}

                    {onBack && (
                        <button
                            onClick={onBack}
                            className="p-1.5 hover:bg-white/10 rounded-full transition-colors hidden sm:block"
                            title="Go Back"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                    )}

                    <h1 className="text-3xl font-extrabold tracking-tight truncate max-w-[200px] sm:max-w-md">
                        {title}
                    </h1>
                </div>

                {/* Right Section: Search, Notifs, Profile */}
                <div className="flex items-center space-x-2 sm:space-x-4">
                    <button
                        onClick={onSearchClick}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/90 hover:text-white"
                        title="Search"
                    >
                        <Search className="w-5 h-5" />
                    </button>

                    <button
                        onClick={onNotificationClick}
                        className="relative p-2 hover:bg-white/10 rounded-full transition-colors text-white/90 hover:text-white"
                        title="Notifications"
                    >
                        <Bell className="w-5 h-5" />
                        {notificationCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-indigo-900"></span>
                        )}
                    </button>

                    <div className="h-6 w-px bg-white/20 mx-2 hidden sm:block"></div>

                    <div className="flex items-center space-x-3 pl-1">
                        <img
                            src={avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin"}
                            alt="Profile"
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-white/20 shadow-sm bg-indigo-950"
                        />
                        <button
                            onClick={onLogout}
                            className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-white/10 hover:bg-red-500/20 text-xs font-semibold rounded-lg transition-all border border-transparent hover:border-red-400/30"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};
