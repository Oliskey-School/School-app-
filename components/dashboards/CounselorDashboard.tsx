import React, { useState } from 'react';
import { DashboardType } from '../../types';
// Note: DashboardSidebar doesn't have a default export, using separate sidebars directly
import {
    UsersIcon,
    CalendarIcon,
    BookOpenIcon,
    HeartIcon,
    BellIcon,
    SearchIcon,
    MessagesIcon as MessageSquareIcon
} from '../../constants';

interface CounselorDashboardProps {
    onLogout: () => void;
    setIsHomePage: (isHome: boolean) => void;
    currentUser: any;
}

const CounselorDashboard: React.FC<CounselorDashboardProps> = ({ onLogout, setIsHomePage, currentUser }) => {
    const [activeTab, setActiveTab] = useState('overview');

    const stats = [
        { title: 'Total Students', value: '1,240', color: 'bg-blue-500', icon: UsersIcon },
        { title: 'Appointments Today', value: '8', color: 'bg-purple-500', icon: CalendarIcon },
        { title: 'Pending Referrals', value: '3', color: 'bg-orange-500', icon: BellIcon },
        { title: 'Wellness Checks', value: '12', color: 'bg-green-500', icon: HeartIcon },
    ];

    const upcomingAppointments = [
        { id: 1, student: 'Alice Johnson', time: '09:00 AM', reason: 'Career Guidance', status: 'Confirmed' },
        { id: 2, student: 'Michael Brown', time: '10:30 AM', reason: 'Academic Stress', status: 'Pending' },
        { id: 3, student: 'Sarah Davis', time: '02:00 PM', reason: 'Personal Issue', status: 'Confirmed' },
    ];

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar temporarily removed - CounselorDashboard needs custom sidebar implementation */}
            <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800">Counselor Portal</h2>
                </div>
                <button
                    onClick={onLogout}
                    className="mt-auto p-4 text-red-600 hover:bg-red-50 flex items-center justify-center"
                >
                    Logout
                </button>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
                    <div className="flex items-center">
                        <h1 className="text-2xl font-bold text-gray-800">Counselor Dashboard</h1>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search students..."
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
                            />
                        </div>
                        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                            <BellIcon className="h-6 w-6" />
                        </button>
                        <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                {currentUser?.name?.[0] || 'C'}
                            </div>
                            <span className="font-medium text-gray-700">{currentUser?.name || 'Counselor'}</span>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Overview</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {stats.map((stat, index) => (
                                <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                                            <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                                        </div>
                                        <div className={`p-3 rounded-lg ${stat.color} bg-opacity-10`}>
                                            <stat.icon className={`h-6 w-6 ${stat.color.replace('bg-', 'text-')}`} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Appointments Column */}
                        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-gray-800">Today's Schedule</h3>
                                <button className="text-sm text-indigo-600 font-medium hover:text-indigo-700">View Calendar</button>
                            </div>
                            <div className="space-y-4">
                                {upcomingAppointments.map((apt) => (
                                    <div key={apt.id} className="flex items-center p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                                        <div className="flex-shrink-0 w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                                            {apt.student[0]}
                                        </div>
                                        <div className="ml-4 flex-1">
                                            <h4 className="text-sm font-bold text-gray-900">{apt.student}</h4>
                                            <p className="text-sm text-gray-500">{apt.reason}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-gray-900">{apt.time}</p>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${apt.status === 'Confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {apt.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quick Actions Column */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-6">Quick Actions</h3>
                            <div className="space-y-3">
                                <button className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors group">
                                    <div className="flex items-center">
                                        <div className="p-2 bg-white rounded-md shadow-sm group-hover:shadow-md transition-shadow">
                                            <MessageSquareIcon className="h-5 w-5 text-gray-500 group-hover:text-indigo-500" />
                                        </div>
                                        <span className="ml-3 font-medium">Log Session Note</span>
                                    </div>
                                    <span className="text-gray-400 group-hover:text-indigo-500">→</span>
                                </button>
                                <button className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors group">
                                    <div className="flex items-center">
                                        <div className="p-2 bg-white rounded-md shadow-sm group-hover:shadow-md transition-shadow">
                                            <UserIcon className="h-5 w-5 text-gray-500 group-hover:text-indigo-500" />
                                        </div>
                                        <span className="ml-3 font-medium">Student Lookup</span>
                                    </div>
                                    <span className="text-gray-400 group-hover:text-indigo-500">→</span>
                                </button>
                                <button className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors group">
                                    <div className="flex items-center">
                                        <div className="p-2 bg-white rounded-md shadow-sm group-hover:shadow-md transition-shadow">
                                            <HeartIcon className="h-5 w-5 text-gray-500 group-hover:text-indigo-500" />
                                        </div>
                                        <span className="ml-3 font-medium">Wellness Report</span>
                                    </div>
                                    <span className="text-gray-400 group-hover:text-indigo-500">→</span>
                                </button>
                            </div>

                            <div className="mt-8">
                                <div className="bg-indigo-900 rounded-xl p-6 text-white text-center">
                                    <h4 className="font-bold text-lg mb-2">Need Help?</h4>
                                    <p className="text-indigo-200 text-sm mb-4">Access the guidance counselor handbook and resources.</p>
                                    <button className="px-4 py-2 bg-white text-indigo-900 rounded-lg text-sm font-bold hover:bg-indigo-50 transition-colors">
                                        View Resources
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

// Helper Icon for this component locally if needed, but imported ones are better.
const UserIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
    </svg>
);

export default CounselorDashboard;
