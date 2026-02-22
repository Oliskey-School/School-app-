import React, { useState, useEffect } from 'react';
import {
    StudentsIcon,
    StaffIcon,
    ReportIcon,
    ReceiptIcon,
    HeartIcon,
    ChevronRightIcon,
    PlusIcon,
    MegaphoneIcon,
    LoginIcon,
    EditIcon,
    PublishIcon,
    DollarSignIcon,
    ClipboardListIcon,
    UsersIcon,
    BusVehicleIcon,
    TrashIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    TrendingUpIcon,
    AttendanceSummaryIcon,
    ViewGridIcon,
    UserIcon,
    CheckCircleIcon,
    ClockIcon,
    SUBJECT_COLORS,
    XCircleIcon,
    DocumentTextIcon,
    HelpingHandIcon,
    ElearningIcon,
    SchoolLogoIcon,
    BookOpenIcon,
    SecurityIcon,
    FileTextIcon,
} from '../../constants';
// Mock data removed
import { AuditLog, RoleName } from '../../types';
import DonutChart from '../ui/DonutChart';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { fetchAuditLogs } from '../../lib/database';
import { EmergencyBroadcastModal } from './EmergencyBroadcastModal';
import { AlertTriangle, Activity, Flame, ShieldCheck, Shield, FileText, Rocket, Beaker, Calendar, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';
import { useApi } from '../../lib/hooks/useApi';
import api from '../../lib/api';
import { useAutoSync } from '../../hooks/useAutoSync';


// --- NEW, REFINED UI/UX COMPONENTS ---

const StatCard: React.FC<{
    label: string;
    value: string | number;
    icon: React.ReactElement<{ className?: string }>;
    colorClasses: string;
    onClick: () => void;
    trend: string;
    trendColor: string;
}> = ({ label, value, icon, colorClasses, onClick, trend, trendColor }) => (
    <button onClick={onClick} className={`w-full text-left p-4 sm:p-6 rounded-3xl text-white relative overflow-hidden transition-transform transform hover:-translate-y-1 ${colorClasses}`}>
        {React.cloneElement(icon, { className: "absolute -right-6 -bottom-6 h-24 sm:h-32 w-24 sm:w-32 text-white/10" })}
        <div className="relative z-10">
            <div className="flex justify-between items-start">
                <p className="text-white/90 font-bold text-base sm:text-lg">{label}</p>
                <div className="p-2 sm:p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                    {React.cloneElement(icon, { className: "h-6 w-6 sm:h-10 sm:w-10" })}
                </div>
            </div>
            <p className="text-3xl sm:text-4xl lg:text-5xl font-bold mt-2 sm:mt-3 tracking-tight truncate">{value}</p>
            <div className={`mt-1 sm:mt-2 text-xs sm:text-sm font-bold flex items-center space-x-1 ${trendColor}`}>
                {trend.startsWith('+') ? <ArrowUpIcon className="w-4 h-4 sm:w-5 sm:h-5" /> : <ArrowDownIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
                <span>{trend}</span>
                <span className="text-white/70 font-medium ml-1 hidden xs:inline">last 30 days</span>
            </div>
        </div>
    </button>
);


const QuickActionCard: React.FC<{ label: string; icon: React.ReactElement<{ className?: string }>; onClick: () => void; color: string; }> = ({ label, icon, onClick, color }) => (
    <button onClick={onClick} className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center hover:bg-gray-50 hover:shadow-md hover:ring-2 hover:ring-indigo-200 transition-all duration-200 group h-full">
        <div className={`p-3 sm:p-4 rounded-full ${color} group-hover:scale-110 transition-transform duration-200 flex-shrink-0`}>
            {React.cloneElement(icon, { className: "h-6 w-6 sm:h-8 sm:w-8 text-white" })}
        </div>
        <p className="font-bold text-gray-700 mt-2 sm:mt-3 text-xs sm:text-sm leading-tight line-clamp-2 md:line-clamp-none">{label}</p>
    </button>
);

// Added Register Exams button locally since previous edit failed
const AlertCard: React.FC<{ label: string; value: string | number; icon: React.ReactElement<{ className?: string }>; onClick: () => void; color: string; }> = ({ label, value, icon, onClick, color }) => (
    <button onClick={onClick} className={`w-full bg-white p-4 rounded-xl shadow-sm flex items-center space-x-4 text-left border-l-4 ${color.replace('text-', 'border-')} hover:bg-gray-50 transition-colors`}>
        <div className={`${color.replace('text-', 'bg-').replace('-500', '-100')} p-3 rounded-xl`}>
            {React.cloneElement(icon, { className: `h-6 w-6 ${color}` })}
        </div>
        <div>
            <p className="font-bold text-gray-800 text-lg">{value} {label}</p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Action required</p>
        </div>
        <ChevronRightIcon className="h-6 w-6 text-gray-400 ml-auto" />
    </button>
);

const EnrollmentLineChart = ({ data, color }: { data: { year: number, count: number }[], color: string }) => {
    const width = 300; const height = 100; const padding = 20;
    const maxCount = data.length > 0 ? Math.ceil(Math.max(...data.map(d => d.count)) / 100) * 100 : 100;
    const minCount = data.length > 0 ? Math.floor(Math.min(...data.map(d => d.count)) / 100) * 100 : 0;
    const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;
    const countRange = maxCount - minCount;
    const stepY = countRange > 0 ? (height - padding * 2) / countRange : 0;
    const points = data.map((d, i) => `${padding + i * stepX},${height - padding - (d.count - minCount) * stepY}`).join(' ');
    return (
        <div className="relative mt-2">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
            </svg>
            <div className="flex justify-between px-4 -mt-6">
                {data.map(item => <span key={item.year} className="text-xs text-gray-500 font-medium">{item.year}</span>)}
            </div>
        </div>
    );
};


const actionTypeIcons: { [key in AuditLog['type']]: React.ReactNode } = {
    login: <LoginIcon className="h-5 w-5 text-green-500" />,
    logout: <LoginIcon className="h-5 w-5 text-gray-500 transform scale-x-[-1]" />,
    create: <PlusIcon className="h-5 w-5 text-sky-500" />,
    update: <EditIcon className="h-5 w-5 text-amber-500" />,
    delete: <TrashIcon className="h-5 w-5 text-red-500" />,
    publish: <PublishIcon className="h-5 w-5 text-purple-500" />,
    payment: <DollarSignIcon className="h-5 w-5 text-indigo-500" />,
};

const formatDistanceToNow = (isoDate: string): string => {
    const date = new Date(isoDate);
    const now = new Date();
    const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return `${days}d ago`;
};

const ActivityLogItem: React.FC<{ log: AuditLog, isLast: boolean }> = ({ log, isLast }) => (
    <div className="relative pl-12">
        <div className="absolute left-4 top-2 w-0.5 h-full bg-gray-200"></div>
        <div className="absolute left-0 top-0 w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-gray-100 ring-4 ring-gray-50">
            {actionTypeIcons[log.type]}
        </div>
        <div className="text-sm">
            <p className="text-gray-800">
                <span className="font-semibold">{log.user.name}</span> {log.action}
            </p>
            <p className="text-xs text-gray-400">{formatDistanceToNow(log.timestamp)}</p>
        </div>
    </div>
);


// --- WIDGETS FOR LARGE SCREENS ---
const AddUserWidget = ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} className="bg-white p-4 rounded-xl shadow-sm text-left hover:bg-gray-50 transition-colors h-full flex flex-col">
        <div className="flex items-center space-x-3">
            <div className="p-2 bg-sky-100 rounded-lg"><PlusIcon className="h-5 w-5 text-sky-600" /></div>
            <h4 className="font-bold text-gray-800">Add New User</h4>
        </div>
        <div className="flex-grow flex items-center justify-center space-x-4 mt-2">
            <div className="text-center"><div className="p-3 bg-gray-100 rounded-full"><StudentsIcon className="text-gray-500" /></div><p className="text-xs mt-1">Student</p></div>
            <div className="text-center"><div className="p-3 bg-gray-100 rounded-full"><StaffIcon className="text-gray-500" /></div><p className="text-xs mt-1">Teacher</p></div>
            <div className="text-center"><div className="p-3 bg-gray-100 rounded-full"><UsersIcon className="text-gray-500" /></div><p className="text-xs mt-1">Parent</p></div>
        </div>
    </button>
);

const PublishReportsWidget = ({ onClick, count }: { onClick: () => void; count: number }) => {
    return (
        <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col h-full">
            <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg"><ReportIcon className="h-5 w-5 text-purple-600" /></div>
                <h4 className="font-bold text-gray-800">Publish Reports</h4>
            </div>
            <div className="flex-grow flex flex-col items-center justify-center text-center">
                <p className="text-5xl font-bold text-purple-600">{count}</p>
                <p className="text-sm text-gray-600">reports are pending review</p>
            </div>
            <button onClick={onClick} className="w-full mt-2 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700">View Reports</button>
        </div>
    );
};

const TimetableWidget = ({ onClick, schedule }: { onClick: () => void; schedule: any[] }) => {
    return (
        <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col h-full">
            <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-100 rounded-lg"><ClipboardListIcon className="h-5 w-5 text-indigo-600" /></div>
                <h4 className="font-bold text-gray-800">Today's Timetable</h4>
            </div>
            <div className="flex-grow space-y-2 mt-3 text-sm">
                {schedule.length > 0 ? schedule.slice(0, 3).map((item, index) => (
                    <div key={index} className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-500 w-16">{item.start_time}</span>
                        <span className={`px-2 py-1 rounded-md text-xs font-semibold ${SUBJECT_COLORS[item.subject] || 'bg-gray-100'}`}>
                            {item.subject} <span className="text-gray-400 font-normal">({item.class_name})</span>
                        </span>
                    </div>
                )) : <p className="text-gray-500 text-center pt-8">No classes scheduled for today.</p>}
            </div>
            <button onClick={onClick} className="w-full mt-2 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700">Manage Timetable</button>
        </div>
    );
};

const AnnounceWidget = ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} className="bg-white p-4 rounded-xl shadow-sm text-left hover:bg-gray-50 transition-colors h-full flex flex-col">
        <div className="flex items-center space-x-3">
            <div className="p-2 bg-teal-100 rounded-lg"><MegaphoneIcon className="h-5 w-5 text-teal-600" /></div>
            <h4 className="font-bold text-gray-800">Send Announcement</h4>
        </div>
        <div className="flex-grow flex items-center justify-center">
            <div className="text-center">
                <MegaphoneIcon className="h-16 w-16 text-teal-200" />
                <p className="mt-2 text-sm text-gray-600">Reach parents, teachers, and students instantly.</p>
            </div>
        </div>
    </button>
);


const BusRosterWidget = ({ onClick, assigned, total }: { onClick: () => void; assigned: number; total: number }) => {
    return (
        <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col h-full">
            <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg"><BusVehicleIcon className="h-5 w-5 text-orange-600" /></div>
                <h4 className="font-bold text-gray-800">Bus Roster</h4>
            </div>
            <div className="flex-grow flex flex-col items-center justify-center text-center">
                <p className="text-5xl font-bold text-orange-600">{assigned}/{total}</p>
                <p className="text-sm text-gray-600">routes assigned for today</p>
            </div>
            <button onClick={onClick} className="w-full mt-2 py-2 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600">View Roster</button>
        </div>
    );
};

const HealthLogWidget = ({ onClick, latestLog }: { onClick: () => void; latestLog: any }) => {
    return (
        <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col h-full">
            <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg"><HeartIcon className="h-5 w-5 text-red-600" /></div>
                <h4 className="font-bold text-gray-800">Recent Health Log</h4>
            </div>
            <div className="flex-grow space-y-2 mt-3 text-sm">
                {latestLog ? (
                    <div className="bg-gray-50 p-2 rounded-lg">
                        <p className="font-bold text-gray-800">{latestLog.studentName}</p>
                        <p className="text-gray-600">{latestLog.reason} - {latestLog.time}</p>
                    </div>
                ) : (
                    <p className="text-gray-500 text-center">No recent health logs</p>
                )}
            </div>
            <button onClick={onClick} className="w-full mt-2 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600">View Full Log</button>
        </div>
    );
};

// --- MAIN DASHBOARD COMPONENT ---

interface DashboardOverviewProps {
    navigateTo: (view: string, title: string, props?: any) => void;
    handleBack: () => void;
    forceUpdate: () => void;
    schoolId: string;
    currentBranchId: string | null;
    isMainBranch: boolean;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({ navigateTo, handleBack, forceUpdate, schoolId, currentBranchId, isMainBranch }) => {
    const { currentSchool, user } = useAuth();
    const { profile } = useProfile();

    // Fallback: If prop is missing (race condition), try to use profile or auth context
    const activeSchoolId = schoolId || profile?.schoolId || user?.user_metadata?.school_id;

    useEffect(() => {
        console.log('[Dashboard] Detected Context:', {
            currentSchoolId: currentSchool?.id,
            profileSchoolId: profile.schoolId,
            metadataSchoolId: user?.user_metadata?.school_id,
            resolvedSchoolId: schoolId
        });
    }, [schoolId, currentSchool, profile, user]);

    const [totalStudents, setTotalStudents] = useState(0);
    const [studentTrend, setStudentTrend] = useState(0);

    const [totalStaff, setTotalStaff] = useState(0);
    const [teacherTrend, setTeacherTrend] = useState(0);

    const [totalParents, setTotalParents] = useState(0);
    const [parentTrend, setParentTrend] = useState(0);

    const [totalClasses, setTotalClasses] = useState(0);
    const [classTrend, setClassTrend] = useState(0);

    const [isLoadingCounts, setIsLoadingCounts] = useState(true);

    // --- DIAGNOSTIC LOGGING ---
    useEffect(() => {
        const runDiagnostics = async () => {
            if (isSupabaseConfigured) {
                console.log('🔍 [Diagnostic] Running RLS Inspection...');
                const { data, error } = await supabase.rpc('inspect_rls_context');
                if (error) {
                    console.error('❌ [Diagnostic] RPC Error:', error);
                } else {
                    console.log('✅ [Diagnostic] RLS Context Result:', JSON.stringify(data, null, 2));
                    // Check if current user has a profile
                    if (!data.context.profile_school_id) {
                        console.warn('⚠️ [Diagnostic] Current user has NO school_id in public.profiles!');
                    }
                }
            }
        };
        runDiagnostics();
    }, []);
    // --------------------------


    // Additional dashboard data
    const [overdueFees, setOverdueFees] = useState(0);
    const [recentActivities, setRecentActivities] = useState<AuditLog[]>([]);
    const [busRosterAssigned, setBusRosterAssigned] = useState(0);
    const [busRosterTotal, setBusRosterTotal] = useState(0);
    const [latestHealthLog, setLatestHealthLog] = useState<any>(null);
    const [enrollmentData, setEnrollmentData] = useState<{ year: number; count: number }[]>([]);

    const [unpublishedReports, setUnpublishedReports] = useState(0);
    const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0); // Added for student approvals

    const [timetablePreview, setTimetablePreview] = useState<any[]>([]);
    const [attendancePercentage, setAttendancePercentage] = useState(0);

    const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);

    // Use our new Contract-First Debug Hook
    const { execute: fetchStats, loading: isLoadingStats, error: statsError } = useApi();

    // Fetch real counts from Supabase
    useEffect(() => {
        if (activeSchoolId) {
            fetchDashboardData();
            fetchBusRoster();
        }
    }, [activeSchoolId, currentBranchId]); // Added currentBranchId

    // --- GLOBAL AUTO-SYNC ---
    // Single robust listener for all essential dashboard data with throttling
    const [lastSyncTime, setLastSyncTime] = useState(0);
    const SYNC_THROTTLE_MS = 5000; // 5 seconds

    useAutoSync(
        [
            'students',
            'teachers',
            'parents',
            'classes',
            'student_fees',
            'report_cards',
            'health_logs',
            'student_attendance',
            'timetable'
        ],
        () => {
            const now = Date.now();
            if (now - lastSyncTime > SYNC_THROTTLE_MS) {
                console.log(`🔄 [Dashboard] Auto-Sync triggered! (School: ${activeSchoolId}, Branch: ${currentBranchId || 'All'})`);
                setLastSyncTime(now);
                fetchDashboardData();
            } else {
                console.log('⏳ [Dashboard] Auto-Sync suppressed (throttled)');
            }
        }
    );

    const fetchBusRoster = async () => {
        if (isSupabaseConfigured) {
            let query = supabase
                .from('transport_buses')
                .select('id, driver_name, status')
                .eq('school_id', schoolId);

            if (currentBranchId && currentBranchId !== 'all') {
                // Show buses assigned to this branch OR global buses
                query = query.or(`branch_id.eq.${currentBranchId},branch_id.is.null`);
            }

            const { data, error } = await query;

            if (!error && data) {
                setBusRosterTotal(data.length);
                // Count assigned if they have a driver and are active
                const assigned = data.filter(b => b.driver_name && b.status === 'active').length;
                setBusRosterAssigned(assigned);
            }
        } else {
            // Sync with LocalStorage (Mock Mode) - Using 'schoolApp_buses' to match BusDutyRosterScreen
            const saved = localStorage.getItem('schoolApp_buses');
            if (saved) {
                try {
                    const buses = JSON.parse(saved);
                    setBusRosterTotal(buses.length);
                    // Check for driverName based on refactored screen
                    setBusRosterAssigned(buses.filter((b: any) => (b.driverName || b.driver) && b.status === 'active').length);
                } catch (e) { console.error(e); }
            }
        }
    };

    // fetchCounts is replaced by api.getDashboardStats in fetchDashboardData

    const fetchDashboardData = async () => {
        if (!isSupabaseConfigured) return;

        if (!activeSchoolId) {
            console.warn('[Dashboard] No School ID detected. Fetching ALL data (Admin Mode).');
        }

        // 1. Fetch Core Stats via Bridge
        const stats = await fetchStats(async () => {
            const data = await api.getDashboardStats(activeSchoolId, currentBranchId || undefined);
            return { data, error: null };
        });

        if (stats) {
            setTotalStudents(stats.totalStudents);
            setStudentTrend(stats.studentTrend || 0);
            setTotalStaff(stats.totalTeachers);
            setTeacherTrend(stats.teacherTrend || 0);
            setTotalParents(stats.totalParents);
            setParentTrend(stats.parentTrend || 0);
            setTotalClasses(stats.totalClasses || 0);
            setClassTrend(stats.classTrend || 0);
            setOverdueFees(stats.overdueFees);
            setUnpublishedReports(stats.unpublishedReports || 0);
        }

        try {
            // 2. Parallelize all other dashboard data fetches
            const today = new Date().toISOString().split('T')[0];
            const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

            // Helper to apply branch filter to direct supabase queries
            const applyBranch = (query: any) => {
                if (currentBranchId && currentBranchId !== 'all') {
                    return query.eq('branch_id', currentBranchId);
                }
                return query;
            };

            // Note: isMainBranch prop is no longer used for data filtering here 
            // but kept for UI labeling if needed.

            const [
                auditData,
                healthRes,
                studentsDataRes,
                unpublishedRes,
                pendingApprovalsRes,
                attendanceRes,
                timetableRes
            ] = await Promise.all([
                fetchAuditLogs(4, activeSchoolId, currentBranchId || undefined),
                applyBranch(supabase.from('health_logs').select('id, description, logged_date, students!health_logs_student_id_fkey(name)').eq('school_id', activeSchoolId))
                    .order('logged_date', { ascending: false })
                    .order('id', { ascending: false })
                    .limit(1)
                    .maybeSingle(),
                applyBranch(supabase.from('students').select('created_at').eq('school_id', activeSchoolId)),
                applyBranch(supabase.from('report_cards').select('id', { count: 'exact', head: true }).eq('school_id', activeSchoolId).eq('status', 'Submitted')),
                applyBranch(supabase.from('students').select('id', { count: 'exact', head: true }).eq('school_id', activeSchoolId).eq('status', 'Pending')),
                applyBranch(supabase.from('student_attendance').select('status').eq('school_id', activeSchoolId).eq('date', today)),
                applyBranch(supabase.from('timetable').select('id, start_time, subject, class_name').eq('school_id', activeSchoolId).eq('day', todayName)).order('start_time', { ascending: true }).limit(5)
            ]);

            // 3. Process results
            setPendingApprovalsCount(pendingApprovalsRes.count || 0); // Added
            if (auditData) {
                setRecentActivities(auditData.map((log: any) => ({
                    id: log.id,
                    user: {
                        name: log.profiles?.name || log.user_name || 'System',
                        avatarUrl: log.profiles?.avatar_url || 'https://i.pravatar.cc/150',
                        role: 'Admin' as RoleName
                    },
                    action: log.action,
                    timestamp: log.created_at,
                    type: log.action.toLowerCase() as any
                })));
            }

            if (healthRes.data) {
                setLatestHealthLog({
                    studentName: (Array.isArray(healthRes.data.students) ? healthRes.data.students[0]?.name : (healthRes.data.students as any)?.name) || 'Unknown',
                    reason: healthRes.data.description,
                    time: null,
                    date: healthRes.data.logged_date
                });
            }

            if (studentsDataRes.data) {
                const yearCounts: { [year: number]: number } = {};
                studentsDataRes.data.forEach((s: any) => {
                    const year = new Date(s.created_at).getFullYear();
                    yearCounts[year] = (yearCounts[year] || 0) + 1;
                });

                const trendData = Object.entries(yearCounts)
                    .map(([year, count]) => ({ year: parseInt(year), count }))
                    .sort((a, b) => a.year - b.year)
                    .slice(-5);

                setEnrollmentData(trendData.length > 0 ? trendData : [{ year: new Date().getFullYear(), count: stats?.totalStudents || 0 }]);
            }

            setUnpublishedReports(unpublishedRes.count || 0);

            if (attendanceRes.data && attendanceRes.data.length > 0) {
                const presentCount = attendanceRes.data.filter((a: any) => a.status === 'Present').length;
                setAttendancePercentage(Math.round((presentCount / attendanceRes.data.length) * 100));
            } else {
                setAttendancePercentage(0);
            }

            setTimetablePreview(timetableRes.data || []);

        } catch (err) {
            console.error('Error fetching dashboard data:', err);
        }
    };



    return (
        <div className="p-4 lg:p-6 bg-gray-50 min-h-full">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content Column */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 p-6 rounded-3xl">
                        <h2 className="text-2xl font-bold text-white mb-1">Welcome, Admin!</h2>
                        <p className="text-white/80">Here's your school's command center.</p>
                        <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 gap-4 mt-6">
                            <StatCard label="Total Students" value={totalStudents} icon={<StudentsIcon />} colorClasses="bg-gradient-to-br from-sky-400 to-sky-600" onClick={() => navigateTo('studentList', 'Manage Students', {})} trend={`+${studentTrend}`} trendColor="text-sky-200" />
                            <StatCard label="Total Teachers" value={totalStaff} icon={<StaffIcon />} colorClasses="bg-gradient-to-br from-purple-400 to-purple-600" onClick={() => navigateTo('teacherList', 'Manage Teachers', {})} trend={`+${teacherTrend}`} trendColor="text-purple-200" />
                            <StatCard label="Total Parents" value={totalParents} icon={<UsersIcon />} colorClasses="bg-gradient-to-br from-orange-400 to-orange-600" onClick={() => navigateTo('parentList', 'Manage Parents', {})} trend={`+${parentTrend}`} trendColor="text-orange-200" />
                            <StatCard label="Total Classes" value={totalClasses} icon={<ViewGridIcon />} colorClasses="bg-gradient-to-br from-indigo-400 to-indigo-600" onClick={() => navigateTo('classList', 'Manage Classes', {})} trend={`+${classTrend}`} trendColor="text-indigo-200" />
                        </div>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-gray-700 mb-3 px-1">Quick Actions</h2>
                        {/* Mobile/Tablet view */}
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-4">
                            <QuickActionCard label="Add User" icon={<PlusIcon />} onClick={() => navigateTo('selectUserTypeToAdd', 'Add New User', {})} color="bg-sky-500" />
                            <QuickActionCard label="Approvals" icon={<CheckCircleIcon />} onClick={() => navigateTo('studentApprovals', 'Student Approvals')} color="bg-indigo-600" />
                            <QuickActionCard label="Onboarding" icon={<SchoolLogoIcon />} onClick={() => navigateTo('manageSchoolInfo', 'School Onboarding')} color="bg-pink-600" />
                            <QuickActionCard label="Enroll Student" icon={<UserIcon />} onClick={() => navigateTo('enrollmentPage', 'New Student Enrollment')} color="bg-emerald-600" />
                            <QuickActionCard label="Register Exams" icon={<DocumentTextIcon />} onClick={() => navigateTo('exams', 'External Exams')} color="bg-indigo-600" />
                            <QuickActionCard label="Publish Reports" icon={<ReportIcon />} onClick={() => navigateTo('reportCardPublishing', 'Publish Reports', {})} color="bg-purple-500" />
                            <QuickActionCard label="Timetable" icon={<ClipboardListIcon />} onClick={() => navigateTo('timetable', 'AI Timetable')} color="bg-indigo-500" />
                            <QuickActionCard label="Announce" icon={<MegaphoneIcon />} onClick={() => navigateTo('communicationHub', 'Communication Hub')} color="bg-teal-500" />
                            <QuickActionCard label="Bus Roster" icon={<BusVehicleIcon />} onClick={() => navigateTo('busDutyRoster', 'Bus Duty Roster')} color="bg-orange-500" />
                            <QuickActionCard label="Health Log" icon={<HeartIcon />} onClick={() => navigateTo('healthLog', 'Health Log')} color="bg-red-500" />
                            <QuickActionCard label="Attendance" icon={<ClockIcon />} onClick={() => navigateTo('teacherAttendance', 'Teacher Attendance')} color="bg-amber-500" />
                            <QuickActionCard label="User Accounts" icon={<UsersIcon />} onClick={() => navigateTo('userAccounts', 'User Accounts')} color="bg-indigo-600" />
                            <QuickActionCard label="Compliance" icon={<Shield />} onClick={() => navigateTo('complianceOnboarding', 'School Compliance')} color="bg-violet-600" />
                            <QuickActionCard label="Track Attendance" icon={<Calendar />} onClick={() => navigateTo('attendanceTracker', 'Curriculum Attendance')} color="bg-green-600" />
                            <QuickActionCard label="Enter Results" icon={<TrendingUp />} onClick={() => navigateTo('resultsEntry', 'Results Entry')} color="bg-cyan-600" />
                            <QuickActionCard label="Launch Hub" icon={<Rocket className="animate-bounce" />} onClick={() => navigateTo('onboardingPage', 'Pilot Onboarding')} color="bg-gray-900" />
                            <QuickActionCard label="Emergency" icon={<AlertTriangle />} onClick={() => setIsBroadcastOpen(true)} color="bg-red-600 animate-pulse" />
                        </div>


                        {/* Content Management Section */}
                        <div className="mt-8">
                            <h2 className="text-xl font-bold text-gray-700 mb-3 px-1">Content Management</h2>
                            <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                                <QuickActionCard
                                    label="School Policies"
                                    icon={<DocumentTextIcon />}
                                    onClick={() => navigateTo('managePolicies', 'Manage Policies')}
                                    color="bg-pink-500"
                                />
                                <QuickActionCard
                                    label="Volunteering"
                                    icon={<HelpingHandIcon />}
                                    onClick={() => navigateTo('manageVolunteering', 'Manage Volunteering')}
                                    color="bg-emerald-500"
                                />
                                <QuickActionCard
                                    label="Permission Slips"
                                    icon={<ClipboardListIcon />}
                                    onClick={() => navigateTo('managePermissionSlips', 'Manage Permission Slips')}
                                    color="bg-cyan-500"
                                />
                                <QuickActionCard
                                    label="Learning Resources"
                                    icon={<ElearningIcon />}
                                    onClick={() => navigateTo('manageLearningResources', 'Manage Learning Resources')}
                                    color="bg-blue-500"
                                />
                                <QuickActionCard
                                    label="PTA Meetings"
                                    icon={<UsersIcon />}
                                    onClick={() => navigateTo('managePTAMeetings', 'Manage PTA Meetings')}
                                    color="bg-purple-500"
                                />
                                <QuickActionCard
                                    label="Curriculum"
                                    icon={<BookOpenIcon />}
                                    onClick={() => navigateTo('manageCurriculum', 'Curriculum Configuration')}
                                    color="bg-indigo-600"
                                />

                            </div>
                        </div>

                        {/* Infrastructure & Facilities Section - STEP 11 */}
                        <div className="mt-8">
                            <h2 className="text-xl font-bold text-gray-700 mb-3 px-1">Infrastructure & Facilities</h2>
                            <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                                <QuickActionCard
                                    label="Facility Register"
                                    icon={<SchoolLogoIcon />}
                                    onClick={() => navigateTo('facilityRegister', 'Facility Register')}
                                    color="bg-indigo-700"
                                />
                                <QuickActionCard
                                    label="Asset Inventory"
                                    icon={<ClipboardListIcon />}
                                    onClick={() => navigateTo('equipmentInventory', 'Equipment Inventory')}
                                    color="bg-sky-700"
                                />
                            </div>
                        </div>

                        {/* Phase 8: Step 12 Safety & Wellbeing Section */}
                        <div className="mt-8">
                            <h2 className="text-xl font-bold text-gray-700 mb-3 px-1">🛡️ Safety & Wellbeing</h2>
                            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                <QuickActionCard
                                    label="Emergency Alerts"
                                    icon={<AlertTriangle className="animate-pulse" />}
                                    onClick={() => navigateTo('emergencyAlert', 'Emergency Alerts')}
                                    color="bg-red-600"
                                />
                                <QuickActionCard
                                    label="Health & Incidents"
                                    icon={<Activity />}
                                    onClick={() => navigateTo('safetyHealthLogs', 'Safety & Health')}
                                    color="bg-emerald-600"
                                />
                                <QuickActionCard
                                    label="Emergency Drills"
                                    icon={<Flame />}
                                    onClick={() => navigateTo('safetyHealthLogs', 'Safety & Health')}
                                    color="bg-orange-600"
                                />
                                <QuickActionCard
                                    label="Safeguarding"
                                    icon={<ShieldCheck />}
                                    onClick={() => navigateTo('safetyHealthLogs', 'Safety & Health')}
                                    color="bg-indigo-600"
                                />
                            </div>
                        </div>

                        {/* Phase 9: Step 13 Governance & Ministry Section */}
                        <div className="mt-8">
                            <h2 className="text-xl font-bold text-gray-700 mb-3 px-1">🏛️ Governance & Ministry</h2>
                            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                <QuickActionCard
                                    label="Quality Assurance"
                                    icon={<Shield className="animate-pulse" />}
                                    onClick={() => navigateTo('inspectionHub', 'Inspection Hub')}
                                    color="bg-slate-800"
                                />
                                <QuickActionCard
                                    label="Ministry Reports"
                                    icon={<FileText />}
                                    onClick={() => navigateTo('inspectionHub', 'Inspection Hub')}
                                    color="bg-slate-700"
                                />
                                <QuickActionCard
                                    label="Live Compliance"
                                    icon={<Activity className="text-emerald-400" />}
                                    onClick={() => navigateTo('complianceDashboard', 'Compliance Dashboard')}
                                    color="bg-slate-900 shadow-xl shadow-slate-200"
                                />
                                <QuickActionCard
                                    label="Governance Hub"
                                    icon={<Shield className="text-yellow-400" />}
                                    onClick={() => navigateTo('governanceHub', 'Unified Governance')}
                                    color="bg-black shadow-xl"
                                />
                                <QuickActionCard
                                    label="System Validation"
                                    icon={<Beaker />}
                                    onClick={() => navigateTo('validationConsole', 'Validation Console')}
                                    color="bg-indigo-900"
                                />
                            </div>
                        </div>

                        {/* Desktop view */}
                        <div className="hidden lg:grid grid-cols-2 xl:grid-cols-3 gap-4 mt-8">
                            <AddUserWidget onClick={() => navigateTo('selectUserTypeToAdd', 'Add New User', {})} />
                            <PublishReportsWidget onClick={() => navigateTo('reportCardPublishing', 'Publish Reports', {})} count={unpublishedReports} />
                            <TimetableWidget onClick={() => navigateTo('timetable', 'Timetable Management')} schedule={timetablePreview} />
                            <AnnounceWidget onClick={() => navigateTo('communicationHub', 'Communication Hub')} />
                            <BusRosterWidget onClick={() => navigateTo('busDutyRoster', 'Bus Duty Roster')} assigned={busRosterAssigned} total={busRosterTotal} />
                            <HealthLogWidget onClick={() => navigateTo('healthLog', 'Health Log')} latestLog={latestHealthLog} />
                        </div>
                    </div>

                </div>

                {/* Sidebar Column */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-4 rounded-2xl shadow-sm">
                        <h2 className="text-lg font-bold text-gray-700 mb-3 px-1">School Health</h2>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                            <div>
                                <p className="font-semibold text-gray-800">Today's Attendance</p>
                                <p className="text-3xl font-bold text-indigo-600">{attendancePercentage > 0 ? `${attendancePercentage}%` : '--%'}</p>
                            </div>
                            <DonutChart percentage={attendancePercentage} color="#4f46e5" size={70} strokeWidth={8} />
                        </div>
                        <div className="mt-4">
                            <p className="font-semibold text-gray-800 px-1">Enrollment Trend</p>
                            <EnrollmentLineChart data={enrollmentData} color="#4f46e5" />
                        </div>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-gray-700 mb-3 px-1">Action Required</h2>
                        <div className="space-y-3">
                            {pendingApprovalsCount > 0 && (
                                <AlertCard label="Student Approvals" value={pendingApprovalsCount} icon={<CheckCircleIcon />} onClick={() => navigateTo('studentApprovals', 'Student Approvals')} color="text-indigo-600" />
                            )}
                            {unpublishedReports > 0 && (
                                <AlertCard label="Reports to Publish" value={unpublishedReports} icon={<ReportIcon />} onClick={() => navigateTo('reportCardPublishing', 'Publish Reports')} color="text-red-500" />
                            )}
                            {overdueFees > 0 && (
                                <AlertCard label="Overdue Fee Payments" value={overdueFees} icon={<ReceiptIcon />} onClick={() => navigateTo('feeManagement', 'Fee Management')} color="text-orange-500" />
                            )}
                            {unpublishedReports === 0 && overdueFees === 0 && (
                                <div className="bg-white p-4 rounded-xl shadow-sm text-center text-gray-500">
                                    No urgent tasks. Well done!
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-gray-700 mb-3 px-1">Recent Activity</h2>
                        <div className="bg-white p-4 rounded-2xl shadow-sm space-y-4">
                            {recentActivities.map((log, index) => <ActivityLogItem key={log.id} log={log} isLast={index === recentActivities.length - 1} />)}
                            <button onClick={() => navigateTo('auditLog', 'Audit Log')} className="mt-2 text-sm w-full text-center font-semibold text-indigo-600 hover:text-indigo-800">
                                View Full Log
                            </button>
                        </div>
                    </div>
                </div>
            </div >
        </div >
    );
};

export default DashboardOverview;
