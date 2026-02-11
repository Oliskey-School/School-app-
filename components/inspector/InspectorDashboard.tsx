import React, { useState, useEffect } from 'react';
import {
    Search, Building2, FileCheck, TrendingUp, Calendar,
    Clock, CheckCircle, AlertTriangle, Download, Eye,
    Plus, Filter, ChevronRight, Award, MapPin, Users
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { offlineStorage } from '../../lib/offlineStorage';
import { useOnlineStatus } from '../shared/OfflineIndicator';
import { toast } from 'react-hot-toast';

interface InspectorDashboardProps {
    onLogout?: () => void;
    setIsHomePage?: (isHome: boolean) => void;
    currentUser?: any;
    inspectorId?: string;
    onNavigate?: (view: string, props?: any) => void;
}

type ViewStackItem = {
    view: string;
    props?: any;
    title: string;
};

export default function InspectorDashboard({ onLogout, setIsHomePage, currentUser }: InspectorDashboardProps) {
    const [inspectorId, setInspectorId] = useState<string | null>(null);
    const [inspector, setInspector] = useState<any>(null);
    const [viewStack, setViewStack] = useState<ViewStackItem[]>([
        { view: 'overview', props: {}, title: 'Inspector Dashboard' }
    ]);
    const [stats, setStats] = useState({
        totalInspections: 0,
        completedInspections: 0,
        scheduledInspections: 0,
        schoolsInspected: 0,
    });
    const [recentInspections, setRecentInspections] = useState<any[]>([]);
    const [upcomingInspections, setUpcomingInspections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRevalidating, setIsRevalidating] = useState(false);
    const isOnline = useOnlineStatus();

    const navigateTo = (view: string, props: any = {}, title: string = 'Inspector View') => {
        setViewStack(stack => [...stack, { view, props, title }]);
    };

    const handleBack = () => {
        if (viewStack.length > 1) {
            setViewStack(stack => stack.slice(0, -1));
        }
    };

    // Professional utility: Validate UUID to prevent 400 Bad Request on Supabase
    const isValidUUID = (id: string) => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id);
    };

    useEffect(() => {
        const getInspectorId = async () => {
            if (!currentUser?.email) {
                setLoading(false);
                return;
            }

            // TRY CACHE FIRST
            const cacheKey = `inspector_id_${currentUser.id}`;
            const cachedId = await offlineStorage.load<string>(cacheKey);
            if (cachedId) {
                console.info('Loaded Inspector ID from offline cache');
                setInspectorId(cachedId);
            }

            try {
                // Professional approach: explicitly separate mock/demo state from DB state
                const isDemoUser = currentUser.id?.toString().startsWith('mock-') ||
                    currentUser.email?.endsWith('@school.com') ||
                    currentUser.email?.includes('demo');

                if (isDemoUser) {
                    setInspectorId('demo-inspector-id');
                    return;
                }

                if (!isOnline && cachedId) return;

                // Only query the DB if the ID is a valid UUID format
                if (isValidUUID(currentUser.id)) {
                    const { data, error } = await supabase
                        .from('inspectors')
                        .select('id')
                        .eq('user_id', currentUser.id)
                        .maybeSingle();

                    if (error) console.error('Supabase query error:', error);

                    if (data) {
                        setInspectorId(data.id);
                        await offlineStorage.save(cacheKey, data.id);
                        return;
                    }
                }

                if (!cachedId) {
                    console.warn('Inspector profile not found and not in demo mode');
                    setLoading(false);
                }

            } catch (err) {
                console.error('Global profile loader error:', err);
                if (!cachedId) setLoading(false);
            }
        };
        getInspectorId();
    }, [currentUser, isOnline]);

    useEffect(() => {
        if (inspectorId) fetchDashboardData();
    }, [inspectorId]);

    const fetchDashboardData = async () => {
        if (!inspectorId) return;

        // 1. Initial State: If we have cache, show it and set loading to false
        const cacheKey = `dashboard_data_${inspectorId}`;
        const cachedData = await offlineStorage.load<any>(cacheKey);

        if (cachedData) {
            setInspector(cachedData.inspector);
            setStats(cachedData.stats);
            setRecentInspections(cachedData.recent);
            setUpcomingInspections(cachedData.upcoming);
            setLoading(false);
            setIsRevalidating(isOnline); // Only revalidate if online
        } else {
            setLoading(true);
        }

        try {
            const isDemoId = inspectorId === 'demo-inspector-id';

            if (isDemoId) {
                const demoData = {
                    inspector: {
                        id: 'demo-inspector-id',
                        full_name: 'Lead Inspector (Demo)',
                        inspector_code: 'INS-DEMO-001',
                        ministry_department: 'Quality Assurance',
                        region: 'Lagos State',
                        contact_email: currentUser.email
                    },
                    stats: {
                        totalInspections: 12,
                        completedInspections: 8,
                        scheduledInspections: 3,
                        schoolsInspected: 10,
                    },
                    recent: [],
                    upcoming: []
                };

                setInspector(demoData.inspector);
                setStats(demoData.stats);
                setRecentInspections(demoData.recent);
                setUpcomingInspections(demoData.upcoming);
                await offlineStorage.save(cacheKey, demoData);
                setLoading(false);
                setIsRevalidating(false);
                return;
            }

            if (!isOnline && cachedData) {
                return; // Stay with cached data if offline
            }

            // 2. Network Fetch (Background Revalidation)
            const { data: inspectorData } = await supabase
                .from('inspectors')
                .select('*')
                .eq('id', inspectorId)
                .single();

            const { data: inspections } = await supabase
                .from('inspections')
                .select('*, schools(name)')
                .eq('inspector_id', inspectorId)
                .order('inspection_date', { ascending: false });

            if (inspectorData && inspections) {
                const completed = inspections.filter(i => i.status === 'Completed').length;
                const scheduled = inspections.filter(i => i.status === 'Scheduled').length;
                const uniqueSchools = new Set(inspections.map(i => i.school_id)).size;

                const freshStats = {
                    totalInspections: inspections.length,
                    completedInspections: completed,
                    scheduledInspections: scheduled,
                    schoolsInspected: uniqueSchools,
                };

                const recent = inspections.filter(i => i.status === 'Completed').slice(0, 5);
                const upcoming = inspections.filter(i => i.status === 'Scheduled').slice(0, 5);

                // Update UI
                setInspector(inspectorData);
                setStats(freshStats);
                setRecentInspections(recent);
                setUpcomingInspections(upcoming);

                // Update Cache
                await offlineStorage.save(cacheKey, {
                    inspector: inspectorData,
                    stats: freshStats,
                    recent,
                    upcoming
                });
            }
        } catch (error) {
            console.error('Error in revalidation:', error);
            if (!cachedData) {
                toast.error('Could not connect to server. Showing offline data.');
            }
        } finally {
            setLoading(false);
            setIsRevalidating(false);
        }
    };

    const currentNavigation = viewStack[viewStack.length - 1];

    useEffect(() => {
        setIsHomePage(viewStack.length === 1);
    }, [viewStack, setIsHomePage]);

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

    if (!inspector && !loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50 p-6">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-100">
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Profile Not Found</h2>
                    <p className="text-slate-600 mb-8 text-lg">
                        We couldn't find an active inspector profile for <strong>{currentUser?.email}</strong>.
                    </p>
                    <button
                        onClick={onLogout}
                        className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
                    >
                        Sign Out & Try Again
                    </button>
                    <p className="mt-6 text-sm text-slate-400">
                        Error code: ERR_INSPECTOR_PROFILE_MISSING
                    </p>
                </div>
            </div>
        );
    }

    const renderContent = () => {
        // Simple switch for now, can be expanded like AdminDashboard
        switch (currentNavigation.view) {
            case 'overview':
                return (
                    <div className="max-w-7xl mx-auto">
                        {/* Header */}
                        <div className="mb-8 relative">
                            {isRevalidating && (
                                <div className="absolute -top-6 left-0 flex items-center gap-2 text-indigo-500 text-xs font-semibold animate-pulse">
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                                    Updating dashboard...
                                </div>
                            )}
                            {!isOnline && (
                                <div className="absolute -top-6 left-0 flex items-center gap-2 text-amber-500 text-xs font-semibold">
                                    <AlertTriangle className="w-3 h-3" />
                                    Offline Mode - Showing Cached Data
                                </div>
                            )}
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
                                        onClick={() => navigateTo('schoolSearch')}
                                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                                    >
                                        <Search className="w-5 h-5" />
                                        Search Schools
                                    </button>
                                    <button
                                        onClick={() => navigateTo('newInspection')}
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
                                                        onView={() => navigateTo('inspectionDetail', { inspectionId: inspection.id })}
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <Calendar className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                                                <p className="text-slate-500">No upcoming inspections scheduled</p>
                                                <button
                                                    onClick={() => navigateTo('scheduleInspection')}
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
                                                        onView={() => navigateTo('inspectionReport', { inspectionId: inspection.id })}
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
                                            onClick={() => navigateTo('schoolSearch')}
                                        />
                                        <QuickActionButton
                                            icon={<Plus />}
                                            label="Start Inspection"
                                            onClick={() => navigateTo('newInspection')}
                                        />
                                        <QuickActionButton
                                            icon={<FileCheck />}
                                            label="View History"
                                            onClick={() => navigateTo('inspectionHistory')}
                                        />
                                        <QuickActionButton
                                            icon={<Download />}
                                            label="Download Reports"
                                            onClick={() => navigateTo('downloadCenter')}
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
                );
            default:
                return <div className="p-8 text-center">View Not Found: {currentNavigation.view}</div>;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 lg:p-8">
            {renderContent()}
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
