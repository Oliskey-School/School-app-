import React, { useState, useEffect } from 'react';
import {
    Search, Building2, FileCheck, TrendingUp, Calendar,
    Clock, CheckCircle, AlertTriangle, Download, Eye,
    Plus, Filter, ChevronRight, Award, MapPin, Users
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface InspectorDashboardProps {
    inspectorId: string;
    onNavigate: (view: string, props?: any) => void;
}

export default function InspectorDashboard({ inspectorId, onNavigate }: InspectorDashboardProps) {
    const [inspector, setInspector] = useState<any>(null);
    const [stats, setStats] = useState({
        totalInspections: 0,
        completedInspections: 0,
        scheduledInspections: 0,
        schoolsInspected: 0,
    });
    const [recentInspections, setRecentInspections] = useState<any[]>([]);
    const [upcomingInspections, setUpcomingInspections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, [inspectorId]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // Fetch inspector profile
            const { data: inspectorData } = await supabase
                .from('inspectors')
                .select('*')
                .eq('id', inspectorId)
                .single();

            if (inspectorData) setInspector(inspectorData);

            // Fetch inspection stats
            const { data: inspections } = await supabase
                .from('inspections')
                .select('*, schools(name)')
                .eq('inspector_id', inspectorId)
                .order('inspection_date', { ascending: false });

            if (inspections) {
                const completed = inspections.filter(i => i.status === 'Completed').length;
                const scheduled = inspections.filter(i => i.status === 'Scheduled').length;
                const uniqueSchools = new Set(inspections.map(i => i.school_id)).size;

                setStats({
                    totalInspections: inspections.length,
                    completedInspections: completed,
                    scheduledInspections: scheduled,
                    schoolsInspected: uniqueSchools,
                });

                setRecentInspections(inspections.filter(i => i.status === 'Completed').slice(0, 5));
                setUpcomingInspections(inspections.filter(i => i.status === 'Scheduled').slice(0, 5));
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 font-medium">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 mb-2">
                                Inspector Dashboard
                            </h1>
                            <p className="text-slate-600">
                                Welcome back, <span className="font-semibold text-indigo-600">{inspector?.full_name}</span>
                            </p>
                            <p className="text-sm text-slate-500">
                                {inspector?.ministry_department} • {inspector?.region}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => onNavigate('schoolSearch')}
                                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                            >
                                <Search className="w-5 h-5" />
                                Search Schools
                            </button>
                            <button
                                onClick={() => onNavigate('newInspection')}
                                className="px-6 py-3 bg-white text-indigo-600 border-2 border-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-all flex items-center gap-2"
                            >
                                <Plus className="w-5 h-5" />
                                New Inspection
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        icon={<FileCheck className="w-6 h-6" />}
                        label="Total Inspections"
                        value={stats.totalInspections}
                        color="bg-blue-500"
                    />
                    <StatCard
                        icon={<CheckCircle className="w-6 h-6" />}
                        label="Completed"
                        value={stats.completedInspections}
                        color="bg-emerald-500"
                    />
                    <StatCard
                        icon={<Clock className="w-6 h-6" />}
                        label="Scheduled"
                        value={stats.scheduledInspections}
                        color="bg-amber-500"
                        badge={stats.scheduledInspections > 0 ? `${stats.scheduledInspections} upcoming` : undefined}
                    />
                    <StatCard
                        icon={<Building2 className="w-6 h-6" />}
                        label="Schools Inspected"
                        value={stats.schoolsInspected}
                        color="bg-purple-500"
                    />
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Recent & Upcoming */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Upcoming Inspections */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                            <div className="p-6 border-b border-slate-200">
                                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-indigo-600" />
                                    Upcoming Inspections
                                </h2>
                            </div>
                            <div className="p-6">
                                {upcomingInspections.length > 0 ? (
                                    <div className="space-y-4">
                                        {upcomingInspections.map((inspection) => (
                                            <InspectionCard
                                                key={inspection.id}
                                                inspection={inspection}
                                                onView={() => onNavigate('inspectionDetail', { inspectionId: inspection.id })}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <Calendar className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                                        <p className="text-slate-500">No upcoming inspections scheduled</p>
                                        <button
                                            onClick={() => onNavigate('scheduleInspection')}
                                            className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-medium hover:bg-indigo-100 transition-colors"
                                        >
                                            Schedule New Inspection
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recent Inspections */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                            <div className="p-6 border-b border-slate-200">
                                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                                    Recent Inspections
                                </h2>
                            </div>
                            <div className="p-6">
                                {recentInspections.length > 0 ? (
                                    <div className="space-y-4">
                                        {recentInspections.map((inspection) => (
                                            <CompletedInspectionCard
                                                key={inspection.id}
                                                inspection={inspection}
                                                onView={() => onNavigate('inspectionReport', { inspectionId: inspection.id })}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <FileCheck className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                                        <p className="text-slate-500">No completed inspections yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Quick Actions */}
                    <div className="space-y-6">
                        {/* Quick Actions */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                <QuickActionButton
                                    icon={<Search />}
                                    label="Search Schools"
                                    onClick={() => onNavigate('schoolSearch')}
                                />
                                <QuickActionButton
                                    icon={<Plus />}
                                    label="Start Inspection"
                                    onClick={() => onNavigate('newInspection')}
                                />
                                <QuickActionButton
                                    icon={<FileCheck />}
                                    label="View History"
                                    onClick={() => onNavigate('inspectionHistory')}
                                />
                                <QuickActionButton
                                    icon={<Download />}
                                    label="Download Reports"
                                    onClick={() => onNavigate('downloadCenter')}
                                />
                            </div>
                        </div>

                        {/* Inspector Info */}
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
                            <h3 className="text-lg font-bold mb-4">Inspector Profile</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex items-center gap-2">
                                    <Award className="w-4 h-4" />
                                    <span>Code: {inspector?.inspector_code}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    <span>Region: {inspector?.region}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4" />
                                    <span>{inspector?.ministry_department}</span>
                                </div>
                            </div>
                            <button className="mt-4 w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors">
                                Edit Profile
                            </button>
                        </div>

                        {/* Performance Summary */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <h3 className="text-lg font-bold text-slate-900 mb-4">Performance</h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-slate-600">Completion Rate</span>
                                        <span className="font-bold text-slate-900">
                                            {stats.totalInspections > 0
                                                ? Math.round((stats.completedInspections / stats.totalInspections) * 100)
                                                : 0}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                        <div
                                            className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                                            style={{
                                                width: `${stats.totalInspections > 0
                                                    ? (stats.completedInspections / stats.totalInspections) * 100
                                                    : 0}%`
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Stat Card Component
function StatCard({ icon, label, value, color, badge }: any) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 ${color} rounded-xl text-white`}>
                    {icon}
                </div>
                {badge && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                        {badge}
                    </span>
                )}
            </div>
            <p className="text-sm font-medium text-slate-600 mb-1">{label}</p>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
        </div>
    );
}

// Inspection Card Component
function InspectionCard({ inspection, onView }: any) {
    return (
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer" onClick={onView}>
            <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-100 rounded-lg">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                    <p className="font-semibold text-slate-900">{inspection.schools?.name || 'School Name'}</p>
                    <div className="flex items-center gap-4 text-sm text-slate-600 mt-1">
                        <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(inspection.inspection_date).toLocaleDateString()}
                        </span>
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                            {inspection.inspection_type}
                        </span>
                    </div>
                </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
        </div>
    );
}

// Completed Inspection Card
function CompletedInspectionCard({ inspection, onView }: any) {
    const { overall_rating } = inspection;
    const ratingColors: any = {
        'Outstanding': 'bg-emerald-100 text-emerald-700',
        'Good': 'bg-blue-100 text-blue-700',
        'Requires Improvement': 'bg-amber-100 text-amber-700',
        'Inadequate': 'bg-red-100 text-red-700',
    };

    return (
        <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors cursor-pointer" onClick={onView}>
            <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                    <p className="font-semibold text-slate-900">{inspection.schools?.name || 'School Name'}</p>
                    <div className="flex items-center gap-3 text-sm text-slate-600 mt-1">
                        <span>{new Date(inspection.inspection_date).toLocaleDateString()}</span>
                        {overall_rating && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${ratingColors[overall_rating] || 'bg-slate-100 text-slate-700'}`}>
                                {overall_rating}
                            </span>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                    <Download className="w-4 h-4 text-slate-600" />
                </button>
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                    <Eye className="w-4 h-4 text-slate-600" />
                </button>
            </div>
        </div>
    );
}

// Quick Action Button
function QuickActionButton({ icon, label, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left group"
        >
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors">
                {React.cloneElement(icon, { className: 'w-5 h-5' })}
            </div>
            <span className="font-medium text-slate-700 group-hover:text-slate-900">{label}</span>
            <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
        </button>
    );
}
