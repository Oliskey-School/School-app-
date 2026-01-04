import React, { useState, useEffect } from 'react';
import Header from '../ui/Header';
import { useProfile } from '../../context/ProfileContext';
import {
    ClipboardListIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    CalendarIcon,
    DocumentTextIcon,
    ChartBarIcon
} from '../../constants';

interface InspectorDashboardProps {
    onLogout: () => void;
    setIsHomePage: (isHome: boolean) => void;
}

const InspectorDashboard: React.FC<InspectorDashboardProps> = ({ onLogout, setIsHomePage }) => {
    const { profile } = useProfile();
    const [inspections, setInspections] = useState({
        scheduled: 3,
        completed: 15,
        pending: 2,
        followUpRequired: 1
    });

    useEffect(() => {
        setIsHomePage(true);
    }, [setIsHomePage]);

    const StatCard: React.FC<{
        title: string;
        value: string | number;
        icon: React.ReactElement;
        color: string;
    }> = ({ title, value, icon, color }) => (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm text-gray-600 font-medium">{title}</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-2">{value}</h3>
                </div>
                <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center`}>
                    {React.cloneElement(icon, { className: 'w-6 h-6 text-white' })}
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <Header
                title="Inspector Dashboard"
                avatarUrl={profile.avatarUrl}
                bgColor="bg-teal-800"
                onLogout={onLogout}
                notificationCount={inspections.followUpRequired}
            />

            <main className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="bg-gradient-to-r from-teal-600 to-teal-800 rounded-xl p-6 text-white">
                    <h2 className="text-2xl font-bold">Welcome, Inspector {profile.name}</h2>
                    <p className="mt-2 text-teal-100">Track inspections across schools</p>
                </div>

                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Inspection Overview</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <StatCard title="Scheduled" value={inspections.scheduled} icon={<CalendarIcon />} color="bg-blue-500" />
                        <StatCard title="Completed" value={inspections.completed} icon={<CheckCircleIcon />} color="bg-green-500" />
                        <StatCard title="Pending Reports" value={inspections.pending} icon={<DocumentTextIcon />} color="bg-yellow-500" />
                        <StatCard title="Follow-Up Required" value={inspections.followUpRequired} icon={<ExclamationCircleIcon />} color="bg-red-500" />
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium">
                            <DocumentTextIcon className="w-5 h-5" />
                            <span>Create Report</span>
                        </button>
                        <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                            <CalendarIcon className="w-5 h-5" />
                            <span>Schedule Inspection</span>
                        </button>
                        <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
                            <ChartBarIcon className="w-5 h-5" />
                            <span>View Analytics</span>
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default InspectorDashboard;
