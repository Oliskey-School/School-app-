import React, { useState, useEffect } from 'react';
import Header from '../ui/Header';
import { useProfile } from '../../context/ProfileContext';
import { api } from '../../lib/api';
import {
    SchoolLogoIcon,
    ClipboardListIcon,
    UserGroupIcon,
    CalendarIcon,
    DocumentTextIcon,
    CheckCircleIcon,
    ClockIcon
} from '../../constants';

interface ExamOfficerDashboardProps {
    onLogout?: () => void;
    setIsHomePage?: (isHome: boolean) => void;
    currentUser?: any;
}

const ExamOfficerDashboard: React.FC<ExamOfficerDashboardProps> = ({ onLogout, setIsHomePage, currentUser }) => {
    const { profile } = useProfile();
    
    if (!profile) return <div className="p-8 text-center text-gray-500 font-medium">Loading exam dashboard...</div>;

    // Real stats from the database — start at zero, fill from the API (no mock data).
    const [examStats, setExamStats] = useState({
        upcomingExams: 0,
        totalCandidates: 0,
        completedExams: 0,
        pendingResults: 0
    });

    useEffect(() => {
        setIsHomePage?.(true);
    }, [setIsHomePage]);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const [examsRes, stats] = await Promise.all([
                    api.get('/exams').catch(() => []),
                    api.getDashboardStats().catch(() => null),
                ]);
                if (!active) return;
                const exams: any[] = Array.isArray(examsRes) ? examsRes : ((examsRes as any)?.data || []);
                const now = Date.now();
                const isPast = (e: any) => e?.date && new Date(e.date).getTime() < now;
                const isPublished = (e: any) => e?.results_published || e?.published || e?.is_published || e?.status === 'completed';
                setExamStats({
                    upcomingExams: exams.filter((e) => e?.date && new Date(e.date).getTime() >= now).length,
                    completedExams: exams.filter(isPast).length,
                    pendingResults: exams.filter((e) => isPast(e) && !isPublished(e)).length,
                    totalCandidates: (stats?.totalStudents ?? stats?.students ?? stats?.studentCount ?? 0) as number,
                });
            } catch {
                /* leave zeros — never show fabricated numbers */
            }
        })();
        return () => { active = false; };
    }, []);

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
                title="Exam Officer Dashboard"
                avatarUrl={profile.avatarUrl}
                bgColor="bg-amber-800"
                onLogout={onLogout}
                notificationCount={examStats.upcomingExams}
            />

            <main className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="bg-gradient-to-r from-amber-600 to-amber-800 rounded-xl p-6 text-white">
                    <h2 className="text-2xl font-bold">Welcome, {profile.name}</h2>
                    <p className="mt-2 text-amber-100">Manage exams and candidates</p>
                </div>

                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Examination Overview</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <StatCard title="Upcoming Exams" value={examStats.upcomingExams} icon={<CalendarIcon />} color="bg-amber-500" />
                        <StatCard title="Total Candidates" value={examStats.totalCandidates} icon={<UserGroupIcon />} color="bg-indigo-500" />
                        <StatCard title="Completed Exams" value={examStats.completedExams} icon={<CheckCircleIcon />} color="bg-green-500" />
                        <StatCard title="Pending Results" value={examStats.pendingResults} icon={<ClockIcon />} color="bg-yellow-500" />
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium">
                            <CalendarIcon className="w-5 h-5" />
                            <span>Schedule Exam</span>
                        </button>
                        <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                            <UserGroupIcon className="w-5 h-5" />
                            <span>Manage Candidates</span>
                        </button>
                        <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
                            <DocumentTextIcon className="w-5 h-5" />
                            <span>Generate Reports</span>
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ExamOfficerDashboard;
