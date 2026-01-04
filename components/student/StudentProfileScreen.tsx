import React, { useState, useEffect } from 'react';
import { useProfile } from '../../context/ProfileContext';
import { Student } from '../../types';
import {
    BookOpenIcon,
    ClipboardListIcon,
    CakeIcon,
    UserIcon,
    NotificationIcon,
    SecurityIcon,
    LogoutIcon,
    SettingsIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    CameraIcon,
    LockIcon,
    ExamIcon,
    CheckCircleIcon
} from '../../constants';

interface StudentProfileScreenProps {
    studentId: number;
    student: Student;
    onLogout: () => void;
    navigateTo: (view: string, title: string, props?: any) => void;
}

const StudentProfileScreen: React.FC<StudentProfileScreenProps> = ({ studentId, student, onLogout, navigateTo }) => {
    // const { profile, updateProfile } = useProfile(); // Temporarily disabled for debugging
    const [loading, setLoading] = useState(false);

    // Safer defaults
    const displayAvatar = student?.avatarUrl || 'https://i.pravatar.cc/150?u=student'; // profile?.avatarUrl removed
    const displayName = student?.name || 'Student';
    // Safe string construction
    const displayGrade = student ? `Grade ${student.grade || '?'}${student.section || ''}` : 'Grade Info Unavailable';

    const settingsItems = [
        {
            icon: UserIcon,
            label: 'Personal Information',
            desc: 'View and update your details',
            color: 'bg-blue-100 text-blue-600',
            action: () => navigateTo('edit_profile', 'Edit Profile')
        },
        {
            icon: SecurityIcon,
            label: 'Login & Security',
            desc: 'Manage password and access',
            color: 'bg-green-100 text-green-600',
            action: () => console.log('Security')
        },
        {
            icon: NotificationIcon,
            label: 'Notifications',
            desc: 'Configure alert preferences',
            color: 'bg-purple-100 text-purple-600',
            action: () => console.log('Notifications')
        },
        {
            icon: BookOpenIcon,
            label: 'Academic History',
            desc: 'View past reports and records',
            color: 'bg-orange-100 text-orange-600',
            action: () => console.log('Academic')
        },
    ];

    // Helper to render icon safely
    const renderIcon = (IconComponent: any, className: string) => {
        return <span className={`inline-block bg-gray-200 rounded-full ${className}`} title="Icon Placeholder"></span>;
        // if (!IconComponent) return null;
        // return <IconComponent className={className} />;
    };

    return (
        <div className="pb-20 bg-gray-50 min-h-screen">
            {/* Header Section */}
            <div className="bg-gradient-to-br from-orange-400 via-orange-500 to-amber-600 pb-16 pt-28 px-6 rounded-b-[3rem] shadow-xl relative overflow-hidden">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-10 -mb-10 blur-2xl opacity-70"></div>
                <div className="absolute top-1/2 left-1/4 w-12 h-12 bg-yellow-300/20 rounded-full blur-xl"></div>

                <div className="flex flex-col items-center relative z-10 transition-all duration-700 ease-out transform translate-y-0 opacity-100">
                    <div className="relative mb-6 group cursor-pointer">
                        <div className="w-28 h-28 rounded-full border-[6px] border-white/30 shadow-2xl overflow-hidden bg-white transform transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3">
                            <img
                                src={displayAvatar}
                                alt="Profile"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://i.pravatar.cc/150?u=fallback';
                                }}
                            />
                        </div>
                        <button className="absolute bottom-1 right-1 bg-white text-orange-600 p-2.5 rounded-full shadow-lg hover:bg-gray-50 hover:text-orange-700 transition-all duration-300 transform group-hover:scale-110 hover:rotate-12">
                            {renderIcon(CameraIcon, "w-5 h-5")}
                        </button>
                    </div>

                    <h2 className="text-3xl font-bold text-white mb-2 tracking-tight text-center drop-shadow-sm">{displayName}</h2>
                    <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 shadow-inner">
                        <span className="text-orange-50 font-medium text-sm tracking-wide">
                            {displayGrade}
                        </span>
                    </div>

                    <div className="flex items-center mt-8 w-full max-w-sm justify-between bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/10 shadow-lg transform transition-transform hover:scale-105 duration-300">
                        <div className="flex-1 text-center border-r border-white/10">
                            <p className="text-orange-100/80 text-xs font-bold uppercase tracking-widest mb-1">Attendance</p>
                            <p className="text-2xl font-extrabold text-white">{student?.attendance || 95}%</p>
                        </div>
                        <div className="flex-1 text-center">
                            <p className="text-orange-100/80 text-xs font-bold uppercase tracking-widest mb-1">Average</p>
                            <p className="text-2xl font-extrabold text-white">{student?.performance || 88}%</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Menu Section */}
            <div className="px-5 -mt-8 relative z-20">
                <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-2 mb-6 transform transition-all hover:shadow-xl duration-300">
                    {settingsItems.map((item, index) => (
                        <button
                            key={index}
                            onClick={item.action}
                            className="w-full flex items-center p-4 hover:bg-orange-50 rounded-xl transition-all duration-200 border-b border-gray-50 last:border-0 group"
                        >
                            <div className={`p-3 rounded-xl ${item.color} mr-4 shadow-sm group-hover:scale-110 transition-transform duration-200`}>
                                {renderIcon(item.icon, "w-6 h-6")}
                            </div>
                            <div className="flex-1 text-left">
                                <h3 className="font-semibold text-gray-900 group-hover:text-orange-700 transition-colors">{item.label}</h3>
                                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                            </div>
                            <div className="text-gray-300 group-hover:text-orange-400 transform group-hover:translate-x-1 transition-all">
                                {renderIcon(ChevronRightIcon, "w-5 h-5")}
                            </div>
                        </button>
                    ))}
                </div>

                <div className="bg-white rounded-2xl shadow-md p-6 mb-20">
                    <h3 className="font-bold text-gray-900 mb-4 px-2">More Options</h3>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors group"
                    >
                        <div className="p-2 rounded-lg bg-red-100 mr-3 group-hover:rotate-12 transition-transform duration-300">
                            {renderIcon(LogoutIcon, "w-5 h-5")}
                        </div>
                        <span className="font-semibold">Log Out</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StudentProfileScreen;
