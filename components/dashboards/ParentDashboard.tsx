
import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { DashboardType, Student, BehaviorNote, StudentAttendance, AttendanceStatus, StudentAssignment, ProgressReport } from '../../types';
import {
    THEME_CONFIG,
    ChevronRightIcon,
    BusVehicleIcon,
    ReceiptIcon,
    ReportIcon,
    PhoneIcon,
    ChartBarIcon,
    ClipboardListIcon,
    MegaphoneIcon,
    AttendanceSummaryIcon,
    ClockIcon,
    BookOpenIcon,
    SUBJECT_COLORS,
    ChevronLeftIcon,
    XCircleIcon,
    TrendingUpIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    StarIcon,
    CalendarIcon,
    CalendarPlusIcon,
    SparklesIcon,
    getFormattedClassName
} from '../../constants';
import { supabase } from '../../lib/supabase';
import Header from '../ui/Header';
import { ParentBottomNav } from '../ui/DashboardBottomNav';
import { ParentSideNav } from '../ui/DashboardSideNav';
import { useProfile } from '../../context/ProfileContext';
import {
    mockFees,
    mockStudents,
    mockAssignments,
    mockSubmissions,
    mockNotices,
    mockStudentAttendance,
    mockTimetableData,
    mockNotifications,
    mockProgressReports,
} from '../../data';
import { fetchParentByEmail, fetchChildrenForParent, fetchParentByUserId, fetchStudentAssignments, fetchStudentAttendanceStats, fetchStudentFeeSummary } from '../../lib/database';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';

import DonutChart from '../ui/DonutChart';
import GlobalSearchScreen from '../shared/GlobalSearchScreen';
import ErrorBoundary from '../ui/ErrorBoundary';


// Import all view components
import ExamSchedule from '../shared/ExamSchedule';
import NoticeboardScreen from '../shared/NoticeboardScreen';
import NotificationsScreen from '../shared/NotificationsScreen';
import CalendarScreen from '../shared/CalendarScreen';
import LibraryScreen from '../shared/LibraryScreen';
import BusRouteScreen from '../shared/BusRouteScreen';
import FeeStatusScreen from '../parent/FeeStatusScreen';
import ReportCardScreen from '../parent/ReportCardScreen';
import SelectChildForReportScreen from '../parent/SelectChildForReportScreen';
import TimetableScreen from '../shared/TimetableScreen';
import ParentProfileScreen from '../parent/ParentProfileScreen';
import EditParentProfileScreen from '../parent/EditParentProfileScreen';
import FeedbackScreen from '../parent/FeedbackScreen';
import ParentNotificationSettingsScreen from '../parent/ParentNotificationSettingsScreen';
import ParentSecurityScreen from '../parent/ParentSecurityScreen';
import LearningResourcesScreen from '../parent/LearningResourcesScreen';
import SchoolPoliciesScreen from '../parent/SchoolPoliciesScreen';
import PTAMeetingScreen from '../parent/PTAMeetingScreen';
import ParentPhotoGalleryScreen from '../parent/ParentPhotoGalleryScreen';
import VolunteeringScreen from '../parent/VolunteeringScreen';
import PermissionSlipScreen from '../parent/PermissionSlipScreen';
import AppointmentScreen from '../parent/AppointmentScreen';
import AIParentingTipsScreen from '../parent/AIParentingTips';
// ParentMessagesScreen is now handled by MessagingLayout
import ParentNewChatScreen from '../parent/ParentNewChatScreen';
import ChatScreen from '../shared/ChatScreen';
import MessagingLayout from '../shared/MessagingLayout';


const DashboardSuspenseFallback = () => (
    <div className="flex justify-center items-center h-full p-8">
        <div className="w-10 h-10 border-4 border-t-4 border-gray-200 border-t-green-600 rounded-full animate-spin"></div>
    </div>
);

interface ViewStackItem {
    view: string;
    props?: any;
    title: string;
}

const StatItem = ({ icon, label, value, colorClass }: { icon: React.ReactNode, label: string, value: string | React.ReactNode, colorClass: string }) => (
    <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg ${colorClass}`}>
            {icon}
        </div>
        <div>
            <p className="text-xs text-gray-700">{label}</p>
            <p className="font-bold text-sm text-gray-800">{value}</p>
        </div>
    </div>
);

const ChildStatCard: React.FC<{ data: any, navigateTo: (view: string, title: string, props?: any) => void, colorTheme: { bg: string, text: string } }> = ({ data, navigateTo, colorTheme }) => {
    const { student, feeInfo, nextHomework, attendancePercentage } = data;
    const formattedClassName = getFormattedClassName(student.grade, student.section);

    const feeStatus = feeInfo ? (
        <span className={feeInfo.status === 'Overdue' ? 'text-red-600' : ''}>
            {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(feeInfo.totalFee - feeInfo.paidAmount)} due
        </span>
    ) : "All Paid";

    return (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="p-4" style={{ backgroundColor: `${colorTheme.bg}1A` }}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <img src={student.avatarUrl} alt={student.name} className="w-14 h-14 rounded-full object-cover border-2" style={{ borderColor: colorTheme.bg }} />
                        <div>
                            <h3 className="font-bold text-lg text-gray-800">{student.name}</h3>
                            <p className="text-sm font-semibold" style={{ color: colorTheme.text }}>{formattedClassName}</p>
                        </div>
                    </div>
                    <button onClick={() => navigateTo('childDetail', student.name, { student: student })} className="bg-white p-2 rounded-full shadow-sm hover:bg-gray-100">
                        <ChevronRightIcon className="text-gray-600" />
                    </button>
                </div>
            </div>

            <div className="px-4 py-3 grid grid-cols-2 gap-4 border-t border-gray-100">
                <StatItem icon={<AttendanceSummaryIcon className="h-5 w-5 text-green-600" />} label="Attendance" value={`${attendancePercentage}%`} colorClass="bg-green-100" />
                <StatItem icon={<ReceiptIcon className="h-5 w-5 text-red-600" />} label="Fees Due" value={feeStatus} colorClass="bg-red-100" />
                {nextHomework && <StatItem icon={<ClipboardListIcon className="h-5 w-5 text-purple-600" />} label="Homework" value={`${nextHomework.subject}`} colorClass="bg-purple-100" />}
                <StatItem icon={<ReportIcon className="h-5 w-5 text-sky-600" />} label="Report Card" value="View" colorClass="bg-sky-100" />
            </div>
        </div>
    );
};


const getHomeworkStatus = (assignment: StudentAssignment) => {
    const dueDate = new Date(assignment.dueDate);
    const now = new Date();

    if (assignment.submission) {
        if (assignment.submission.status === 'Graded') {
            return { text: `Graded: ${assignment.submission.grade}/100`, icon: <CheckCircleIcon />, color: 'text-green-600', bg: 'bg-green-50', isComplete: true };
        }
        return { text: 'Submitted', icon: <CheckCircleIcon />, color: 'text-sky-600', bg: 'bg-sky-50', isComplete: true };
    }

    if (dueDate < now) {
        return { text: 'Overdue', icon: <ExclamationCircleIcon />, color: 'text-red-600', bg: 'bg-red-50', isComplete: false };
    }
    return { text: 'Pending', icon: <ClockIcon />, color: 'text-amber-600', bg: 'bg-amber-50', isComplete: false };
};

const AcademicsTab = ({ student, assignments, reportCards, navigateTo }: { student: Student; assignments: any[]; reportCards: any[]; navigateTo: (view: string, title: string, props?: any) => void }) => {

    // Memoized data processing
    const { latestTerm, latestGrades, averageScore, studentHomework, progressReport } = useMemo(() => {
        const publishedReport = reportCards?.find((rc: any) => rc.status === 'Published');

        let term = 'N/A';
        let grades: { subject: string; score: number; teacherRemark?: string; }[] = [];
        let avg = 0;

        if (publishedReport) {
            term = `${publishedReport.term} (${publishedReport.session})`;
            grades = publishedReport.academic_records?.map((r: any) => ({ subject: r.subject, score: r.total, teacherRemark: r.remark })) || [];
            avg = grades.length > 0 ? Math.round(grades.reduce((acc, curr) => acc + curr.score, 0) / grades.length) : 0;
        } else {
            // Fallback to legacy structure if needed, or just show N/A
            // student.academic_performance is likely empty if relying on report cards
        }

        const homework = assignments
            .filter((a: any) => new Date(a.due_date) > new Date())
            .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
            .map((a: any) => ({
                id: a.id,
                title: a.title,
                subject: a.subject,
                dueDate: a.due_date,
                submission: a.assignment_submissions?.[0] // Assuming single submission join
            }));

        // AI Progress report - fetch from DB or generate? 
        // For now, let's look for a report in the list or leave empty
        const progress = null; // We can add fetching for this later if it's a specific table

        return { latestTerm: term, latestGrades: grades, averageScore: avg, studentHomework: homework, progressReport: progress };
    }, [student, assignments, reportCards]);

    return (
        <div className="p-4 space-y-4">
            {/* AI Parenting Tips Button */}
            <div className="bg-gradient-to-r from-green-500 to-teal-500 p-4 rounded-2xl shadow-lg flex items-center justify-between text-white">
                <div>
                    <h3 className="font-bold text-lg">Personalized Advice</h3>
                    <p className="text-sm opacity-90">Get AI-powered tips for your child.</p>
                </div>
                <button
                    onClick={() => navigateTo('aiParentingTips', 'AI Parenting Tips', { student })}
                    className="bg-white/20 px-4 py-2 rounded-lg font-semibold hover:bg-white/30 transition-colors flex items-center space-x-2"
                >
                    <SparklesIcon className="h-5 w-5" />
                    <span>Get Tips</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Term Performance */}
                <div className="bg-white p-4 rounded-xl shadow-sm">
                    <div className="flex justify-between items-center">
                        <div>
                            <h4 className="font-bold text-gray-800">Term Performance</h4>
                            <p className="text-sm text-gray-700">{latestTerm}</p>
                        </div>
                        {averageScore > 0 && (
                            <div className="text-right">
                                <p className="font-bold text-2xl text-green-600">{averageScore}%</p>
                                <p className="text-xs text-gray-700">Overall Average</p>
                            </div>
                        )}
                    </div>
                    {latestGrades.length > 0 ? (
                        <div className="mt-3 space-y-2">
                            {latestGrades.map((grade, i) => (
                                <div key={i} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                                    <span className="font-semibold text-sm text-gray-700">{grade.subject}</span>
                                    <span className="font-bold text-sm text-gray-800">{grade.score}%</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="mt-4 text-center py-4 text-gray-500 text-sm">No grades published for this term yet.</div>
                    )}
                </div>

                {/* Homework */}
                <div className="bg-white p-4 rounded-xl shadow-sm">
                    <h4 className="font-bold text-gray-800 mb-3">Upcoming Homework</h4>
                    <div className="space-y-3">
                        {studentHomework.length > 0 ? studentHomework.map((hw: any) => {
                            // Helper for status
                            const dueDate = new Date(hw.dueDate);
                            const now = new Date();
                            let status = { text: 'Pending', icon: <ClockIcon />, color: 'text-amber-600', bg: 'bg-amber-50', isComplete: false };

                            if (hw.submission) {
                                if (hw.submission.status === 'Graded') status = { text: `Graded: ${hw.submission.grade}`, icon: <CheckCircleIcon />, color: 'text-green-600', bg: 'bg-green-50', isComplete: true };
                                else status = { text: 'Submitted', icon: <CheckCircleIcon />, color: 'text-sky-600', bg: 'bg-sky-50', isComplete: true };
                            } else if (dueDate < now) {
                                status = { text: 'Overdue', icon: <ExclamationCircleIcon />, color: 'text-red-600', bg: 'bg-red-50', isComplete: false };
                            }

                            return (
                                <div key={hw.id} className="flex justify-between items-center border-b pb-2 last:border-b-0">
                                    <div>
                                        <p className="font-bold text-gray-800">{hw.title}</p>
                                        <p className="text-sm text-gray-700">{hw.subject} &bull; Due {new Date(hw.dueDate).toLocaleDateString('en-GB')}</p>
                                    </div>
                                    <div className={`flex items-center space-x-2 text-xs font-semibold px-2 py-1 rounded-full ${status.bg} ${status.color}`}>
                                        {React.cloneElement(status.icon, { className: `h-4 w-4` })}
                                        <span>{status.text}</span>
                                    </div>
                                </div>
                            );
                        }) : <p className="text-sm text-gray-700 text-center">No upcoming homework.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

const BehaviorTab = ({ student }: { student: Student }) => {
    return (
        <div className="p-4 bg-white rounded-xl shadow-sm text-center">
            <div className="py-8">
                <StarIcon className="h-12 w-12 text-yellow-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-800">Behavior Records</h3>
                <p className="text-gray-500 text-sm mt-1">No behavior incidents recorded for this term.</p>
                <p className="text-green-600 font-semibold text-sm mt-4">Keep up the good work!</p>
            </div>
        </div>
    );
};

const AttendanceTab = ({ student, attendance }: { student: Student; attendance: any[] }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const attendanceMap = useMemo(() => {
        const map = new Map<string, string>();
        attendance.forEach(att => map.set(att.date, att.status));
        return map;
    }, [attendance]);

    const firstDayOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), [currentDate]);
    const daysInMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate(), [currentDate]);
    const startingDayIndex = firstDayOfMonth.getDay();

    const goToPreviousMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const goToNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const attendanceColors: { [key: string]: string } = {
        Present: 'bg-green-400 text-white',
        Absent: 'bg-red-400 text-white',
        Late: 'bg-blue-400 text-white',
        Leave: 'bg-gray-200 text-gray-500',
    };

    return (
        <div className="p-4 bg-white rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <button onClick={goToPreviousMonth} className="p-2 rounded-full hover:bg-gray-100"><ChevronLeftIcon className="h-5 w-5 text-gray-600" /></button>
                <h3 className="font-bold text-lg text-gray-800">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                <button onClick={goToNextMonth} className="p-2 rounded-full hover:bg-gray-100"><ChevronRightIcon /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-700 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => <div key={day}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: startingDayIndex }).map((_, index) => <div key={`empty-${index}`} />)}
                {Array.from({ length: daysInMonth }).map((_, index) => {
                    const day = index + 1;
                    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                    // Adjust for local timezone to match string date from DB typically YYYY-MM-DD
                    // Simple fix: construct string manually to avoid timezone shift
                    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                    const status = attendanceMap.get(dateString);
                    return (
                        <div key={day} className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-semibold ${status ? attendanceColors[status] || 'bg-gray-100' : 'bg-gray-100 text-gray-400'}`}>
                            {day}
                        </div>
                    )
                })}
            </div>
            <div className="flex justify-center space-x-3 mt-4 text-xs">
                <span className="flex items-center"><div className="w-3 h-3 rounded-full bg-green-400 mr-1.5"></div>Present</span>
                <span className="flex items-center"><div className="w-3 h-3 rounded-full bg-red-400 mr-1.5"></div>Absent</span>
                <span className="flex items-center"><div className="w-3 h-3 rounded-full bg-blue-400 mr-1.5"></div>Late</span>
            </div>
        </div>
    );
};

type ChildDetailTab = 'academics' | 'behavior' | 'attendance';

const ChildDetailScreen = ({ student, initialTab, navigateTo }: { student: Student, initialTab?: ChildDetailTab, navigateTo: (view: string, title: string, props?: any) => void }) => {
    const [activeTab, setActiveTab] = useState<ChildDetailTab>(initialTab || 'academics');

    // State for Real Data
    const [assignments, setAssignments] = useState<any[]>([]);
    const [reportCards, setReportCards] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetailData = async () => {
            setLoading(true);
            try {
                // 1. Assignments (with submissions)
                const { data: assData } = await supabase
                    .from('assignments')
                    .select('*, assignment_submissions(*)')
                    .eq('class_name', getFormattedClassName(student.grade, student.section))
                    .order('due_date', { ascending: true }); // We sort later too

                if (assData) setAssignments(assData);

                // 2. Report Cards
                const { data: rcData } = await supabase
                    .from('report_cards')
                    .select('*, academic_records(*)')
                    .eq('student_id', student.id);

                if (rcData) setReportCards(rcData);

                // 3. Attendance
                const { data: attData } = await supabase
                    .from('student_attendance')
                    .select('*')
                    .eq('student_id', student.id);

                if (attData) setAttendance(attData);

            } catch (e) {
                console.error("Error fetching child details:", e);
            } finally {
                setLoading(false);
            }
        };

        if (student?.id) {
            fetchDetailData();
        }

        // Realtime Subscription
        const channel = supabase.channel(`child_detail_${student.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments', filter: `class_name=eq.${getFormattedClassName(student.grade, student.section)}` }, () => {
                fetchDetailData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'report_cards', filter: `student_id=eq.${student.id}` }, () => {
                fetchDetailData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'student_attendance', filter: `student_id=eq.${student.id}` }, () => {
                fetchDetailData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [student]);

    const TabButton = ({ id, label }: { id: ChildDetailTab, label: string }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === id ? 'bg-green-500 text-white shadow' : 'text-gray-800'
                }`}
        >
            {label}
        </button>
    );

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Child Header */}
            <div className="p-4 bg-white flex items-center space-x-4">
                <img src={student.avatarUrl} alt={student.name} className="w-16 h-16 rounded-full object-cover border-4 border-green-100" />
                <div>
                    <h3 className="text-xl font-bold text-gray-800">{student.name}</h3>
                    <p className="text-gray-700 font-medium">{getFormattedClassName(student.grade, student.section)}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="px-4 py-2 bg-white">
                <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg">
                    <TabButton id="academics" label="Academics" />
                    <TabButton id="behavior" label="Behavior" />
                    <TabButton id="attendance" label="Attendance" />
                </div>
            </div>

            <div className="flex-grow overflow-y-auto">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading child details...</div>
                ) : (
                    <>
                        {activeTab === 'academics' && <AcademicsTab student={student} assignments={assignments} reportCards={reportCards} navigateTo={navigateTo} />}
                        {activeTab === 'behavior' && <BehaviorTab student={student} />}
                        {activeTab === 'attendance' && <div className="p-4"><AttendanceTab student={student} attendance={attendance} /></div>}
                    </>
                )}
            </div>
        </div>
    );
};

const Dashboard = ({ navigateTo, children, parentId }: { navigateTo: (view: string, title: string, props?: any) => void, children: Student[], parentId: number }) => {
    const theme = THEME_CONFIG[DashboardType.Parent];

    // State for child data
    const [childrenData, setChildrenData] = useState<any[]>([]);
    const [loadingStats, setLoadingStats] = useState(true);

    const fetchChildStats = async () => {
        setLoadingStats(true);
        try {
            const stats = await Promise.all(children.map(async (student) => {
                // Fetch real data
                const [assignments, attendance, fees] = await Promise.all([
                    fetchStudentAssignments(student.id, student.grade, student.section),
                    fetchStudentAttendanceStats(student.id),
                    fetchStudentFeeSummary(student.id)
                ]);

                const feeInfo = fees || {
                    id: student.id, name: student.name, avatarUrl: student.avatarUrl, grade: student.grade, section: student.section,
                    totalFee: 0, paidAmount: 0, dueDate: new Date().toISOString(), status: 'Paid' // Default to paid if no fee record
                };

                const nextHomework = assignments[0]; // Already sorted by date in fetch
                const attendancePercentage = attendance.percentage;

                // Still using mock for grades if not available yet in DB utils
                const recentGrades = student.academicPerformance?.filter(p => p.term === 'Term 2').slice(0, 1) || [];

                return { student, feeInfo, nextHomework, recentGrades, attendancePercentage };
            }));
            setChildrenData(stats);
        } catch (error) {
            console.error("Error fetching child stats:", error);
        } finally {
            setLoadingStats(false);
        }
    };

    useEffect(() => {
        if (children.length > 0) {
            fetchChildStats();
        } else {
            setLoadingStats(false);
        }
    }, [children]);

    // REAL-TIME SUBSCRIPTIONS
    useEffect(() => {
        if (children.length === 0) return;

        // Subscribe to relevant tables for ALL children
        // We listen to widely to ensure updates are caught
        const channel = supabase.channel('parent-dashboard-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, () => {
                console.log('Assignments changed, refreshing dashboard...');
                fetchChildStats();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'student_attendance' }, () => {
                console.log('Attendance changed, refreshing dashboard...');
                fetchChildStats();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'student_fees' }, () => {
                console.log('Fees changed, refreshing dashboard...');
                fetchChildStats();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [children]);

    const quickAccessItems = [
        { label: 'Bus Route', icon: <BusVehicleIcon className="h-7 w-7" />, action: () => navigateTo('busRoute', 'Bus Route') },
        { label: 'Calendar', icon: <CalendarIcon className="h-7 w-7" />, action: () => navigateTo('calendar', 'School Calendar') },
        { label: 'Noticeboard', icon: <MegaphoneIcon className="h-7 w-7" />, action: () => navigateTo('noticeboard', 'Noticeboard') },
        { label: 'Appointments', icon: <CalendarPlusIcon className="h-7 w-7" />, action: () => navigateTo('appointments', 'Book Appointment') },
    ];

    const childColorThemes = [{ bg: '#3b82f6', text: '#1e40af' }, { bg: '#ec4899', text: '#831843' }];

    return (
        <div className="p-4 lg:p-6 bg-gray-50">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main content */}
                <div className="lg:col-span-2 space-y-6">
                    {loadingStats ? (
                        <div className="space-y-4">
                            {[1, 2].map(i => (
                                <div key={i} className="bg-white p-6 rounded-2xl shadow-sm animate-pulse">
                                    <div className="flex items-center space-x-4 mb-4">
                                        <div className="w-14 h-14 bg-gray-200 rounded-full"></div>
                                        <div className="space-y-2">
                                            <div className="h-5 w-32 bg-gray-200 rounded"></div>
                                            <div className="h-4 w-24 bg-gray-200 rounded"></div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="h-10 bg-gray-100 rounded"></div>
                                        <div className="h-10 bg-gray-100 rounded"></div>
                                        <div className="h-10 bg-gray-100 rounded"></div>
                                        <div className="h-10 bg-gray-100 rounded"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : childrenData.length === 0 ? (
                        <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
                            <h3 className="text-xl font-bold text-gray-800 mb-2">No Children Linked</h3>
                            <p className="text-gray-600 mb-4">You have not been linked to any students yet.</p>
                            <p className="text-sm text-gray-500">Please contact the school administrator to link your account to your child.</p>
                        </div>
                    ) : (
                        childrenData.map((data, index) => (
                            <ChildStatCard key={data.student.id} data={data} navigateTo={navigateTo} colorTheme={childColorThemes[index % childColorThemes.length]} />
                        ))
                    )}
                </div>
                {/* Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2 px-1">School Utilities</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {quickAccessItems.map((item) => (
                                <button key={item.label} onClick={item.action} className="bg-white p-3 rounded-2xl shadow-sm flex flex-col items-center justify-center space-y-2 hover:bg-gray-100 transition-colors">
                                    <div className="text-gray-600">{item.icon}</div>
                                    <span className="font-semibold text-gray-700 text-center text-xs">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface ParentDashboardProps {
    onLogout: () => void;
    setIsHomePage: (isHome: boolean) => void;
}

const ParentDashboard: React.FC<ParentDashboardProps> = ({ onLogout, setIsHomePage }) => {
    const { profile } = useProfile();
    const [viewStack, setViewStack] = useState<ViewStackItem[]>([{ view: 'dashboard', title: 'Parent Dashboard' }]);
    const [activeBottomNav, setActiveBottomNav] = useState('home');
    const [version, setVersion] = useState(0);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // Data State
    const [parent, setParent] = useState<any>(null);
    const [children, setChildren] = useState<Student[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    const forceUpdate = () => setVersion(v => v + 1);

    // Fetch Parent Data
    useEffect(() => {
        const loadPyarentData = async () => {
            if (!profile.email) return;
            setIsLoadingData(true);
            try {
                let parentData = null;

                // 1. Try fetching by User ID (Reliable)
                if (profile.id) {
                    parentData = await fetchParentByUserId(profile.id);
                }

                // 2. Fallback to Email (Legacy/Auth-less)
                if (!parentData && profile.email) {
                    console.log("Fetching parent by email fallback...");
                    parentData = await fetchParentByEmail(profile.email);
                }

                if (parentData) {
                    setParent(parentData);
                    const childrenData = await fetchChildrenForParent(parentData.id);
                    setChildren(childrenData);
                } else {
                    console.warn("Parent profile not found for user:", profile.email);
                    // Fallback to demo for development
                    if (profile.email === 'parent@school.com') {
                        setParent({ id: 1002, name: 'Mrs. Bello', email: 'parent@school.com', avatarUrl: null });
                        const mockKids = mockStudents.filter(s => [3, 4].includes(s.id));
                        setChildren(mockKids);
                    }
                }
            } catch (e) {
                console.error("Error loading parent data:", e);
            } finally {
                setIsLoadingData(false);
            }
        };
        loadPyarentData();
    }, [profile]);

    useEffect(() => {
        const currentView = viewStack[viewStack.length - 1];
        setIsHomePage(currentView.view === 'dashboard' && !isSearchOpen);
    }, [viewStack, isSearchOpen, setIsHomePage]);

    const notificationCount = useRealtimeNotifications();

    const navigateTo = (view: string, title: string, props: any = {}) => {
        setViewStack(stack => [...stack, { view, props, title }]);
    };

    const handleBack = () => {
        if (viewStack.length > 1) {
            setViewStack(stack => stack.slice(0, -1));
        }
    };

    const handleBottomNavClick = (screen: string) => {
        setActiveBottomNav(screen);
        switch (screen) {
            case 'home':
                setViewStack([{ view: 'dashboard', title: 'Parent Dashboard' }]);
                break;
            case 'reports':
                setViewStack([{ view: 'selectReport', title: 'Select Report Card' }]);
                break;
            case 'messages':
                setViewStack([{ view: 'messages', title: 'Messages' }]);
                break;
            case 'more':
                setViewStack([{ view: 'more', title: 'More Options' }]);
                break;
            default:
                setViewStack([{ view: 'dashboard', title: 'Parent Dashboard' }]);
        }
    };

    const handleNotificationClick = () => {
        navigateTo('notifications', 'Notifications', {});
    };

    const viewComponents: { [key: string]: React.ComponentType<any> } = {
        dashboard: (props: any) => <Dashboard {...props} children={children} parentId={parent?.id} />,
        childDetail: ChildDetailScreen,
        examSchedule: ExamSchedule,
        noticeboard: (props: any) => <NoticeboardScreen {...props} userType="parent" />,
        notifications: (props: any) => <NotificationsScreen {...props} userType="parent" navigateTo={navigateTo} />,
        calendar: CalendarScreen,
        library: LibraryScreen,
        busRoute: BusRouteScreen,
        feeStatus: (props: any) => <FeeStatusScreen {...props} parentId={parent?.id} />,
        selectReport: (props: any) => <SelectChildForReportScreen {...props} parentId={parent?.id} />,
        reportCard: ReportCardScreen,
        timetable: TimetableScreen,
        more: (props: any) => <ParentProfileScreen {...props} parentId={parent?.id} />,
        editParentProfile: (props: any) => <EditParentProfileScreen {...props} parentId={parent?.id} onProfileUpdate={(data) => {
            if (data) setParent((prev: any) => ({ ...prev, ...data }));
            forceUpdate();
        }} />,
        feedback: FeedbackScreen,
        notificationSettings: ParentNotificationSettingsScreen,
        securitySettings: ParentSecurityScreen,
        learningResources: LearningResourcesScreen,
        schoolPolicies: SchoolPoliciesScreen,
        ptaMeetings: PTAMeetingScreen,
        photoGallery: ParentPhotoGalleryScreen,
        volunteering: VolunteeringScreen,
        permissionSlips: PermissionSlipScreen,
        appointments: (props: any) => <AppointmentScreen {...props} parentId={parent?.id} />,
        aiParentingTips: AIParentingTipsScreen,
        messages: (props: any) => <MessagingLayout {...props} dashboardType={DashboardType.Parent} currentUserId={parent?.id} />,
        newChat: (props: any) => <ParentNewChatScreen {...props} children={children} />,
        chat: (props: any) => <ChatScreen {...props} currentUserId={parent?.id || 0} />,
    };

    const currentNavigation = viewStack[viewStack.length - 1];
    const ComponentToRender = viewComponents[currentNavigation.view];

    const commonProps = {
        navigateTo,
        onLogout,
        handleBack,
        forceUpdate,
    };

    if (isLoadingData) {
        return <DashboardSuspenseFallback />;
    }

    return (
        <div className="flex h-full bg-gray-100 relative overflow-hidden">
            {/* Sidebar for desktop */}
            <ParentSideNav activeScreen={activeBottomNav} setActiveScreen={handleBottomNavClick} />

            {/* Main Content Area */}
            <div className="flex flex-col flex-1 h-full relative overflow-hidden">
                <Header
                    title={currentNavigation.title}
                    avatarUrl={parent?.avatarUrl || profile.avatarUrl}
                    bgColor={THEME_CONFIG[DashboardType.Parent].mainBg}
                    onLogout={onLogout}
                    onBack={viewStack.length > 1 ? handleBack : undefined}
                    onNotificationClick={handleNotificationClick}
                    notificationCount={notificationCount}
                    onSearchClick={() => setIsSearchOpen(true)}
                />
                <div className="flex-grow overflow-y-auto h-full pb-32 lg:pb-0" style={{ marginTop: '-4rem' }}>
                    <div className="h-full pt-16">
                        <ErrorBoundary>
                            <div key={`${viewStack.length}-${version}`} className="animate-slide-in-up h-full">
                                {ComponentToRender ? (
                                    <ComponentToRender {...currentNavigation.props} {...commonProps} />
                                ) : (
                                    <div className="p-6">View not found: {currentNavigation.view}</div>
                                )}
                            </div>
                        </ErrorBoundary>
                    </div>
                </div>
                {/* Bottom Nav for mobile */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 shadow-lg">
                    <ParentBottomNav activeScreen={activeBottomNav} setActiveScreen={handleBottomNavClick} />
                </div>
            </div>

            {isSearchOpen && (
                <GlobalSearchScreen
                    dashboardType={DashboardType.Parent}
                    navigateTo={navigateTo}
                    onClose={() => setIsSearchOpen(false)}
                />
            )}
        </div>
    );
};

export default ParentDashboard;
