import React, { useState, useEffect } from 'react';
import Header from '../ui/Header';
import { useProfile } from '../../context/ProfileContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { useAutoSync } from '../../hooks/useAutoSync';
import {
    AdminIcon,
    ClipboardListIcon,
    ExclamationCircleIcon,
    CheckCircleIcon,
    ChartBarIcon,
    DocumentTextIcon,
    ClockIcon
} from '../../constants';
import { api } from '../../lib/api';

interface ComplianceOfficerDashboardProps {
    onLogout?: () => void;
    setIsHomePage?: (isHome: boolean) => void;
    currentUser?: any;
}

const ComplianceOfficerDashboard: React.FC<ComplianceOfficerDashboardProps> = ({ onLogout, setIsHomePage, currentUser }) => {
    const { profile } = useProfile();
    const { currentSchool } = useAuth();
    const [complianceStats, setComplianceStats] = useState({
        activeAudits: 0,
        completedAudits: 0,
        criticalIssues: 0,
        resolvedIssues: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setIsHomePage(true);
        if (currentSchool?.id) {
            fetchStats();
        }
    }, [setIsHomePage, currentSchool]);

    useAutoSync(['school_documents', 'inspections'], () => {
        console.log('🔄 [ComplianceOfficerDashboard] Real-time auto-sync triggered');
        fetchStats();
    });

    const fetchStats = async () => {
        try {
            setLoading(true);
            const schoolId = currentSchool?.id;
            
            // Demo mode check
            if (currentUser?.email?.includes('demo') || !schoolId) {
                setComplianceStats({
                    activeAudits: 2,
                    completedAudits: 5,
                    criticalIssues: 1,
                    resolvedIssues: 3
                });
                setLoading(false);
                return;
            }

            // Fetch Document status (as audits/issues placeholder)
            let docsQuery = api
                .from('school_documents')
                .select('verification_status')
                .eq('school_id', schoolId);

            const branchId = (useAuth() as any).currentBranchId;
            if (branchId && branchId !== 'all') {
                docsQuery = docsQuery.eq('branch_id', branchId);
            }
            const { data: docs } = await docsQuery;

            // Fetch Inspections
            let inspectionsQuery = api
                .from('inspections')
                .select('status')
                .eq('school_id', schoolId);

            if (branchId && branchId !== 'all') {
                inspectionsQuery = inspectionsQuery.eq('branch_id', branchId);
            }
            const { data: inspections } = await inspectionsQuery;

            setComplianceStats({
                activeAudits: inspections?.filter(i => i.status === 'Scheduled' || i.status === 'In Progress').length || 0,
                completedAudits: inspections?.filter(i => i.status === 'Completed').length || 0,
                criticalIssues: docs?.filter(d => d.verification_status === 'Rejected').length || 0,
                resolvedIssues: docs?.filter(d => d.verification_status === 'Verified').length || 0
            });
        } catch (error) {
            console.error('Error fetching compliance stats:', error);
        } finally {
            setLoading(false);
        }
    };

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
                title="Compliance Officer Dashboard"
                avatarUrl={profile.avatarUrl}
                bgColor="bg-emerald-800"
                onLogout={onLogout}
                notificationCount={complianceStats.criticalIssues}
            />

            <main className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-xl p-6 text-white">
                    <h2 className="text-2xl font-bold">Welcome, {profile.name}</h2>
                    <p className="mt-2 text-emerald-100">Monitor compliance and quality standards</p>
                </div>

                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Compliance Overview</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <StatCard title="Active Audits" value={complianceStats.activeAudits} icon={<ClipboardListIcon />} color="bg-blue-500" />
                        <StatCard title="Completed Audits" value={complianceStats.completedAudits} icon={<CheckCircleIcon />} color="bg-green-500" />
                        <StatCard title="Critical Issues" value={complianceStats.criticalIssues} icon={<ExclamationCircleIcon />} color="bg-red-500" />
                        <StatCard title="Resolved Issues" value={complianceStats.resolvedIssues} icon={<AdminIcon />} color="bg-emerald-500" />
                    </div>
                </div>

                {complianceStats.criticalIssues > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3">
                        <ExclamationCircleIcon className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h4 className="font-semibold text-red-900">Critical Issue Requires Attention</h4>
                            <p className="text-sm text-red-800 mt-1">Fire extinguisher inspection overdue - Main Building</p>
                            <button className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
                                Review & Resolve
                            </button>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium">
                            <ClipboardListIcon className="w-5 h-5" />
                            <span>Create New Audit</span>
                        </button>
                        <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                            <DocumentTextIcon className="w-5 h-5" />
                            <span>View Reports</span>
                        </button>
                        <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
                            <ChartBarIcon className="w-5 h-5" />
                            <span>Compliance Analytics</span>
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ComplianceOfficerDashboard;

