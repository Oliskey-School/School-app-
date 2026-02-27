import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import ExamCandidateRegistration from '../admin/ExamCandidateRegistration';
import { 
    HomeIcon, 
    ReceiptIcon as CreditCardIcon, 
    ChartBarIcon, 
    MessagesIcon as ChatIcon, 
    SettingsIcon as CogIcon,
    ChevronLeftIcon,
    FolderIcon 
} from '../../constants';

/**
 * ExternalExamsScreen - A standalone mobile-responsive page for exam registration.
 * Replicates the UI requested in the user's mobile screenshot.
 */
const ExternalExamsScreen: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    
    // Header colors from screenshot: Deep Indigo/Purple gradient
    const headerGradient = "bg-gradient-to-b from-indigo-700 to-indigo-800";
    
    // User initial for avatar
    const userInitial = user?.email?.[0].toUpperCase() || 'U';

    return (
        <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
            {/* Header Section */}
            <div className={`${headerGradient} pt-6 pb-12 px-6 rounded-b-[40px] relative shadow-lg`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => navigate(-1)}
                            className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                        >
                            <ChevronLeftIcon className="w-6 h-6 text-white" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight">External Exams</h1>
                            <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider -mt-1 opacity-80">
                                {user?.email?.split('@')[0].toUpperCase() || 'ADMIN'} BRAIN...
                            </p>
                        </div>
                    </div>
                    
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full border-2 border-white/30 overflow-hidden bg-gray-200">
                             <img 
                                src={`https://ui-avatars.com/api/?name=${userInitial}&background=random&color=fff`} 
                                alt="Profile" 
                                className="w-full h-full object-cover"
                             />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area - Overlapping the rounded header */}
            <div className="flex-1 -mt-6 px-4 overflow-y-auto pb-24 z-10">
                <div className="bg-white rounded-3xl shadow-sm min-h-full border border-gray-100 overflow-hidden">
                    <ExamCandidateRegistration />
                </div>
            </div>

            {/* Bottom Navigation Bar */}
            <div className="bg-white border-t border-gray-100 py-3 px-6 flex justify-between items-center fixed bottom-0 left-0 right-0 z-20">
                <NavItem icon={<HomeIcon className="w-6 h-6" />} label="Home" active />
                <NavItem icon={<CreditCardIcon className="w-6 h-6" />} label="Fees" />
                <NavItem icon={<ChartBarIcon className="w-6 h-6" />} label="Analytics" />
                <NavItem icon={<ChatIcon className="w-6 h-6" />} label="Messages" />
                <NavItem icon={<CogIcon className="w-6 h-6" />} label="Settings" />
            </div>
        </div>
    );
};

const NavItem = ({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) => (
    <button className="flex flex-col items-center gap-1">
        <div className={active ? "text-indigo-600" : "text-gray-400"}>
            {icon}
        </div>
        <span className={`text-[10px] font-medium ${active ? "text-indigo-600" : "text-gray-500"}`}>
            {label}
        </span>
    </button>
);

export default ExternalExamsScreen;
