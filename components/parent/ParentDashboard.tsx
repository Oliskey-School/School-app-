import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import { DashboardType, Student, StudentAttendance, AttendanceStatus, StudentAssignment } from '../../types';
import {
    THEME_CONFIG,
    ChevronRightIcon,
    BusVehicleIcon,
    ReceiptIcon,
    ReportIcon,
    ChartBarIcon,
    ClipboardListIcon,
    MegaphoneIcon,
    AttendanceSummaryIcon,
    ClockIcon,
    BookOpenIcon,
    SUBJECT_COLORS,
    ChevronLeftIcon,
    TrendingUpIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    StarIcon,
    CalendarIcon,
    CalendarPlusIcon,
    SparklesIcon,
    getFormattedClassName
} from '../../constants';
import { formatSchoolId } from '../../utils/idFormatter';
import PremiumLoader from '../ui/PremiumLoader';
import { supabase } from '../../lib/supabase';
import { getHomeworkStatus } from '../../utils/homeworkUtils';
import { realtimeService } from '../../services/RealtimeService';
import { syncEngine } from '../../lib/syncEngine';

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
import ParentMessagesScreen from '../parent/ParentMessagesScreen';
import ParentNewChatScreen from '../parent/ParentNewChatScreen';
import ChatScreen from '../shared/ChatScreen';
import SchoolUtilitiesScreen from '../parent/SchoolUtilitiesScreen';
import GlobalSearchScreen from '../shared/GlobalSearchScreen';

// Phase 5: Parent & Community Empowerment Components
import VolunteerSignup from '../parent/VolunteerSignup';
import ConferenceScheduling from '../shared/ConferenceScheduling';
import SurveysAndPolls from '../shared/SurveysAndPolls';
import DonationPortal from '../shared/DonationPortal';
import CommunityResourceDirectory from '../shared/CommunityResourceDirectory';
import ReferralSystem from '../shared/ReferralSystem';
import PanicButton from '../shared/PanicButton';
import MentalHealthResources from '../shared/MentalHealthResources';

const DashboardSuspenseFallback = () => (
    <PremiumLoader message="Syncing children's data..." />
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
        <div className="flex flex-col">
            <span className={feeInfo.status === 'overdue' ? 'text-red-600 font-bold' : 'text-gray-800 font-semibold'}>
                {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(feeInfo.totalDue)}
            </span>
            {feeInfo.nextDueDate && (
                <span className="text-xs text-gray-500 mt-0.5">
                    Due: {new Date(feeInfo.nextDueDate).toLocaleDateString('en-GB')}
                </span>
            )}
        </div>
    ) : <span className="text-green-600 font-semibold">All Paid</span>;

    return (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden transition-transform hover:shadow-lg">
            <div className="p-4" style={{ backgroundColor: `${colorTheme.bg}1A` }}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <img src={student.avatarUrl} alt={student.name} className="w-14 h-14 rounded-full object-cover border-2" style={{ borderColor: colorTheme.bg }} />
                        <div>
                            <h3 className="font-bold text-lg text-gray-800">{student.name}</h3>
                            <p className="text-sm font-semibold" style={{ color: colorTheme.text }}>{formattedClassName}</p>
                            <p className="text-xs text-gray-500 mt-1">ID: {student.schoolGeneratedId || `SCH-${student.id}`}</p>
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

const AcademicsTab = ({ student, navigateTo, schoolId, currentBranchId }: { student: Student; navigateTo: (view: string, title: string, props?: any) => void; schoolId?: string; currentBranchId?: string | null }) => {
    const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAcademics = async () => {
            try {
                let assignmentsQuery = supabase
                    .from('assignments')
                    .select('*')
                    .or(`class_name.ilike.%${student.grade}%,class_name.ilike.%${student.section}%`)
                    .eq('school_id', schoolId)
                    .gt('due_date', new Date().toISOString())
                    .order('due_date', { ascending: true });

                if (currentBranchId) assignmentsQuery = assignmentsQuery.eq('branch_id', currentBranchId);

                const { data: assignmentsData } = await assignmentsQuery;
                const { data: submissionsData } = await supabase.from('assignment_submissions').select('*').eq('school_id', schoolId).eq('student_id', student.id);

                if (assignmentsData) {
                    const merged: StudentAssignment[] = assignmentsData.map((a: any) => ({
                        id: a.id, title: a.title, description: a.description, className: a.class_name, subject: a.subject, dueDate: a.due_date,
                        totalStudents: a.total_students || 0,
                        submissionsCount: a.submissions_count || 0,
                        submission: submissionsData?.find((s: any) => s.assignment_id === a.id) ? {
                            id: submissionsData.find((s: any) => s.assignment_id === a.id).id, assignmentId: a.id,
                            student: { id: student.id, name: student.name, avatarUrl: student.avatarUrl },
                            submittedAt: submissionsData.find((s: any) => s.assignment_id === a.id).submitted_at,
                            isLate: false, status: submissionsData.find((s: any) => s.assignment_id === a.id).grade ? 'Graded' : 'Ungraded',
                            grade: submissionsData.find((s: any) => s.assignment_id === a.id).grade
                        } : undefined
                    }));
                    setAssignments(merged);
                }
            } catch (err) { console.error("Error fetching academics:", err); }
            finally { setLoading(false); }
        };
        fetchAcademics();
    }, [student, schoolId, currentBranchId]);

    const averageScore = useMemo(() => {
        if (!student.academicPerformance?.length) return 0;
        return Math.round(student.academicPerformance.reduce((acc, curr) => acc + curr.score, 0) / student.academicPerformance.length);
    }, [student]);

    return (
        <div className="p-4 space-y-4">
            <div className="bg-gradient-to-r from-green-500 to-teal-500 p-4 rounded-2xl shadow-lg flex items-center justify-between text-white">
                <div>
                    <h3 className="font-bold text-lg">Personalized Advice</h3>
                    <p className="text-sm opacity-90">Get AI-powered tips for your child.</p>
                </div>
                <button onClick={() => navigateTo('aiParentingTips', 'AI Parenting Tips', { student })} className="bg-white/20 px-4 py-2 rounded-lg font-semibold hover:bg-white/30 transition-colors flex items-center space-x-2">
                    <SparklesIcon className="h-5 w-5" /><span>Get Tips</span>
                </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm">
                    <div className="flex justify-between items-center">
                        <div><h4 className="font-bold text-gray-800">Term Performance</h4><p className="text-sm text-gray-700">Current Term</p></div>
                        {averageScore > 0 && <div className="text-right"><p className="font-bold text-2xl text-green-600">{averageScore}%</p><p className="text-xs text-gray-700">Overall Average</p></div>}
                    </div>
                    {student.academicPerformance && student.academicPerformance.length > 0 ? (
                        <div className="mt-3 space-y-2">
                            {student.academicPerformance.map((grade, i) => (
                                <div key={i} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                                    <span className="font-semibold text-sm text-gray-700">{grade.subject}</span>
                                    <span className="font-bold text-sm text-gray-800">{grade.score}%</span>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-sm text-gray-500 mt-2">No grades recorded yet.</p>}
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm">
                    <h4 className="font-bold text-gray-800 mb-3">Upcoming Homework</h4>
                    <div className="space-y-3">
                        {assignments.length > 0 ? assignments.map(hw => {
                            const status = getHomeworkStatus(hw);
                            return (
                                <div key={hw.id} className="flex justify-between items-center border-b pb-2 last:border-b-0">
                                    <div><p className="font-bold text-gray-800">{hw.title}</p><p className="text-sm text-gray-700">{hw.subject} &bull; Due {new Date(hw.dueDate).toLocaleDateString('en-GB')}</p></div>
                                    <div className={`flex items-center space-x-2 text-xs font-semibold px-2 py-1 rounded-full ${status.bg} ${status.color}`}>
                                        {React.cloneElement(status.icon as any, { className: `h-4 w-4 ${status.isComplete ? 'animate-checkmark-pop' : ''}`.trim() })}<span>{status.text}</span>
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
        <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {student.behaviorNotes && student.behaviorNotes.length > 0 ? [...student.behaviorNotes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(note => {
                    const isPositive = note.type === 'Positive';
                    return (
                        <div key={note.id} className={`p-4 rounded-xl border-l-4 ${isPositive ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'}`}>
                            <div className="flex justify-between items-start">
                                <h5 className={`font-bold ${isPositive ? 'text-green-800' : 'text-red-800'}`}>{note.title}</h5>
                                <p className="text-xs text-gray-700 font-medium flex-shrink-0 ml-2">{new Date(note.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                            </div>
                            <p className="text-sm text-gray-700 mt-1">{note.note}</p>
                            {note.suggestions && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <h6 className="font-semibold text-xs text-gray-600">Suggestions for Home:</h6>
                                    <ul className="list-disc list-inside text-sm text-gray-700 mt-1 space-y-1">{note.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
                                </div>
                            )}
                            <p className="text-xs text-gray-600 text-right mt-2 italic">- {note.by}</p>
                        </div>
                    );
                }) : <p className="md:col-span-2 text-sm text-gray-700 text-center py-8">No behavioral notes recorded.</p>}
            </div>
        </div>
    );
};

const AttendanceTab = ({ student }: { student: Student }) => {
    const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAttendance = async () => {
            const { data } = await supabase.from('student_attendance').select('*').eq('student_id', student.id);
            if (data) setAttendance(data.map((a: any) => ({ id: a.id, studentId: a.student_id, date: a.date, status: a.status })));
            setLoading(false);
        };
        fetchAttendance();
    }, [student.id]);

    const [currentDate, setCurrentDate] = useState(new Date());
    const attendanceMap = useMemo(() => {
        const map = new Map<string, AttendanceStatus>();
        attendance.forEach(att => map.set(att.date, att.status));
        return map;
    }, [attendance]);

    const firstDayOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), [currentDate]);
    const daysInMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate(), [currentDate]);
    const startingDayIndex = firstDayOfMonth.getDay();
    const goToPreviousMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const goToNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const attendanceColors: { [key in AttendanceStatus]: string } = { Present: 'bg-green-400 text-white', Absent: 'bg-red-400 text-white', Late: 'bg-blue-400 text-white', Leave: 'bg-gray-200 text-gray-500' };

    return (
        <div className="p-4 bg-white rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <button onClick={goToPreviousMonth} className="p-2 rounded-full hover:bg-gray-100"><ChevronLeftIcon className="h-5 w-5 text-gray-600" /></button>
                <h3 className="font-bold text-lg text-gray-800">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                <button onClick={goToNextMonth} className="p-2 rounded-full hover:bg-gray-100"><ChevronRightIcon className="h-5 w-5 text-gray-600" /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-700 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => <div key={day}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: startingDayIndex }).map((_, index) => <div key={`empty-${index}`} />)}
                {Array.from({ length: daysInMonth }).map((_, index) => {
                    const day = index + 1;
                    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                    const dateString = date.toISOString().split('T')[0];
                    const status = attendanceMap.get(dateString);
                    return <div key={day} className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-semibold ${status ? attendanceColors[status] : 'bg-gray-100 text-gray-400'}`}>{day}</div>;
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

const ChildDetailScreen = ({ student, initialTab, navigateTo, schoolId, currentBranchId }: { student: Student, initialTab?: ChildDetailTab, navigateTo: (view: string, title: string, props?: any) => void, schoolId?: string, currentBranchId?: string | null }) => {
    const [activeTab, setActiveTab] = useState<ChildDetailTab>(initialTab || 'academics');
    const TabButton = ({ id, label }: { id: ChildDetailTab, label: string }) => (
        <button onClick={() => setActiveTab(id)} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === id ? 'bg-green-500 text-white shadow' : 'text-gray-800'}`}>{label}</button>
    );
    return (
        <div className="flex flex-col h-full bg-gray-50">
            <div className="p-4 bg-white flex items-center space-x-4"><img src={student.avatarUrl} alt={student.name} className="w-16 h-16 rounded-full object-cover border-4 border-green-100" /><div><h3 className="text-xl font-bold text-gray-800">{student.name}</h3><p className="text-gray-700 font-medium">{getFormattedClassName(student.grade, student.section)}</p></div></div>
            <div className="px-4 py-2 bg-white"><div className="flex space-x-1 bg-gray-200 p-1 rounded-lg"><TabButton id="academics" label="Academics" /><TabButton id="behavior" label="Behavior" /><TabButton id="attendance" label="Attendance" /></div></div>
            <div className="flex-grow overflow-y-auto">
                {activeTab === 'academics' && <AcademicsTab student={student} navigateTo={navigateTo} schoolId={schoolId} currentBranchId={currentBranchId} />}
                {activeTab === 'behavior' && <BehaviorTab student={student} />}
                {activeTab === 'attendance' && <div className="p-4"><AttendanceTab student={student} /></div>}
            </div>
        </div>
    );
};

const ParentDashboardContent = ({ navigateTo, schoolId, currentUser, version, students, forceUpdate }: { navigateTo: (view: string, title: string, props?: any) => void, schoolId?: string, currentUser?: any, version?: number, students: Student[], forceUpdate: () => void }) => {
    const [childrenStats, setChildrenStats] = useState<any[]>([]);
    const quickAccessItems = [
        { label: 'Bus Route', icon: <BusVehicleIcon className="h-7 w-7" />, action: () => navigateTo('busRoute', 'Bus Route') },
        { label: 'Calendar', icon: <CalendarIcon className="h-7 w-7" />, action: () => navigateTo('calendar', 'School Calendar') },
        { label: 'Noticeboard', icon: <MegaphoneIcon className="h-7 w-7" />, action: () => navigateTo('noticeboard', 'Noticeboard') },
        { label: 'Appointments', icon: <CalendarPlusIcon className="h-7 w-7" />, action: () => navigateTo('appointments', 'Book Appointment') },
    ];

    useEffect(() => {
        const fetchStats = async () => {
            if (students.length === 0) return;
            const ids = students.map(s => s.id);
            try {
                const today = new Date().toISOString();
                const [allFees, allAttendance, allAssignments] = await Promise.all([
                    api.bulkFetchFees(ids, ['pending', 'partial']),
                    api.bulkFetchAttendance(ids),
                    api.getAssignments(schoolId as string)
                ]);
                const stats = students.map(student => {
                    const studentFees = (allFees || []).filter((f: any) => f.studentId === student.id);
                    const feeInfo = studentFees.length > 0 ? { totalDue: studentFees.reduce((sum: number, fee: any) => sum + (fee.amount - (fee.paidAmount || 0)), 0), nextDueDate: studentFees[0]?.dueDate, status: studentFees[0]?.status || 'pending' } : null;
                    const studentAtt = (allAttendance || []).filter((a: any) => a.student_id === student.id);
                    const presentCount = studentAtt.filter((a: any) => a.status === 'Present').length;
                    const attendancePercentage = studentAtt.length > 0 ? Math.round((presentCount / studentAtt.length) * 100) : 0;
                    const nextHomework = (allAssignments || []).find((a: any) => a.class_name?.toLowerCase().includes(String(student.grade).toLowerCase()) && a.class_name?.toLowerCase().includes(String(student.section).toLowerCase()));
                    return { student, feeInfo, nextHomework: nextHomework ? { subject: nextHomework.subject, title: nextHomework.title } : null, attendancePercentage };
                });
                setChildrenStats(stats);
            } catch (err) { console.error("Error batch fetching dashboard stats:", err); }
        };
        fetchStats();
        if (currentUser?.id && schoolId) {
            realtimeService.initialize(currentUser.id, schoolId);
            const handleUpdate = () => { fetchStats(); forceUpdate(); };
            window.addEventListener('realtime-update' as any, handleUpdate);
            return () => window.removeEventListener('realtime-update' as any, handleUpdate);
        }
    }, [students, schoolId, currentUser?.id]);

    const childColorThemes = [{ bg: '#3b82f6', text: '#1e40af' }, { bg: '#ec4899', text: '#831843' }];

    return (
        <div className="p-4 lg:p-6 bg-gray-50">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold text-gray-800">School Utilities</h3><button onClick={() => navigateTo('schoolUtilities', 'School Utilities')} className="text-sm text-blue-600 hover:text-blue-800 font-medium">View All</button></div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{quickAccessItems.map(item => (<button key={item.label} onClick={item.action} className="bg-gray-50 p-4 rounded-xl flex flex-col items-center justify-center space-y-2 hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200"><div className="text-blue-600">{item.icon}</div><span className="font-semibold text-gray-700 text-center text-xs">{item.label}</span></button>))}</div>
                    </div>
                    {childrenStats.map((data, index) => (<ChildStatCard key={data.student.id} data={data} navigateTo={navigateTo} colorTheme={childColorThemes[index % childColorThemes.length]} />))}
                </div>
            </div>
        </div>
    );
};

interface ParentDashboardProps {
    onLogout?: () => void;
    setIsHomePage?: (isHome: boolean) => void;
    currentUser?: any;
}

import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';

const ParentDashboard: React.FC<ParentDashboardProps> = ({ onLogout, setIsHomePage, currentUser }) => {
    const [viewStack, setViewStack] = useState<ViewStackItem[]>([{ view: 'dashboard', title: 'Parent Dashboard' }]);
    const [activeBottomNav, setActiveBottomNav] = useState('home');
    const [version, setVersion] = useState(0);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [parentId, setParentId] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [parentProfile, setParentProfile] = useState<{ name: string; avatarUrl: string; schoolGeneratedId?: string }>({ name: 'Parent', avatarUrl: 'https://i.pravatar.cc/150?u=parent', schoolGeneratedId: '' });
    const [students, setStudents] = useState<Student[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(true);
    const { currentSchool, currentBranchId, user } = useAuth();
    const schoolId = currentSchool?.id;
    const notificationCount = useRealtimeNotifications('parent');
    const forceUpdate = () => setVersion(v => v + 1);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: userData } = await supabase.from('users').select('id').eq('email', user.email).single();
                setCurrentUserId(userData ? userData.id : user?.id || '');
            }
        };
        getUser();
    }, [currentUser]);

    const fetchProfile = async () => {
        if (!schoolId) return;
        let query = supabase.from('parents').select('id, name, email, phone, avatar_url, school_generated_id').eq('school_id', schoolId);
        const email = user?.email || currentUser?.email;
        if (email) query = query.ilike('email', email);
        const { data, error } = await query.maybeSingle();
        if (data) { setParentId(data.id); setParentProfile({ name: data.name || 'Parent', avatarUrl: data.avatar_url || 'https://i.pravatar.cc/150?u=parent', schoolGeneratedId: data.school_generated_id }); }
    };

    useEffect(() => { fetchProfile(); }, [currentUser, schoolId]);

    useEffect(() => {
        const fetchChildren = async () => {
            if (!schoolId) return;
            setLoadingStudents(true);
            try {
                const studentsData = await api.getMyChildren();
                if (studentsData) {
                    setStudents(studentsData.map((s: any) => ({
                        id: s.id,
                        name: s.name,
                        email: s.email || '',
                        avatarUrl: s.avatar_url || 'https://via.placeholder.com/150',
                        grade: s.grade,
                        section: s.section,
                        attendanceStatus: s.attendance_status || 'Present',
                        birthday: s.birthday,
                        schoolGeneratedId: s.school_generated_id,
                        academicPerformance: (s.academic_performance || []).map((a: any) => ({ subject: a.subject, score: a.total || a.score })),
                        behaviorNotes: (s.behavior_records || []).map((b: any) => ({ id: b.id, date: b.date, type: b.type, title: b.title, note: b.description || '', by: b.reporter_name || 'Teacher' })),
                        reportCards: (s.report_cards || []).filter((r: any) => r.status === 'Published').map((r: any) => ({ term: r.term, session: r.session, status: r.status }))
                    } as any)));
                }
            } catch (err) {
                console.warn("Error fetching children via Hybrid API:", err);
            } finally {
                setLoadingStudents(false);
            }
        };
        fetchChildren();
    }, [parentId, schoolId, version, user]);

    useEffect(() => { const currentView = viewStack[viewStack.length - 1]; setIsHomePage(currentView.view === 'dashboard' && !isSearchOpen); }, [viewStack, isSearchOpen, setIsHomePage]);

    const navigateTo = (view: string, title: string, props: any = {}) => { setViewStack(stack => [...stack, { view, props, title }]); };
    const handleBack = () => { if (viewStack.length > 1) setViewStack(stack => stack.slice(0, -1)); };
    const handleBottomNavClick = (screen: string) => {
        setActiveBottomNav(screen);
        switch (screen) {
            case 'home': setViewStack([{ view: 'dashboard', title: 'Parent Dashboard' }]); break;
            case 'fees': setViewStack([{ view: 'feeStatus', title: 'Fee Status' }]); break;
            case 'reports': setViewStack([{ view: 'selectReport', title: 'Select Report Card' }]); break;
            case 'messages': setViewStack([{ view: 'messages', title: 'Messages' }]); break;
            case 'more': setViewStack([{ view: 'more', title: 'More Options' }]); break;
            default: setViewStack([{ view: 'dashboard', title: 'Parent Dashboard' }]);
        }
    };

    const viewComponents: { [key: string]: React.ComponentType<any> } = {
        dashboard: (props: any) => <ParentDashboardContent {...props} />,
        childDetail: ChildDetailScreen, examSchedule: ExamSchedule, noticeboard: (props: any) => <NoticeboardScreen {...props} userType="parent" />,
        notifications: (props: any) => <NotificationsScreen {...props} userType="parent" navigateTo={navigateTo} />,
        calendar: CalendarScreen, library: LibraryScreen, busRoute: BusRouteScreen, feeStatus: (props: any) => <FeeStatusScreen {...props} parentId={parentId} />,
        selectReport: (props: any) => <SelectChildForReportScreen {...props} parentId={parentId} />,
        reportCard: ReportCardScreen, timetable: TimetableScreen, more: ParentProfileScreen, editParentProfile: EditParentProfileScreen,
        feedback: FeedbackScreen, notificationSettings: ParentNotificationSettingsScreen, securitySettings: ParentSecurityScreen,
        learningResources: LearningResourcesScreen, schoolPolicies: SchoolPoliciesScreen, ptaMeetings: PTAMeetingScreen, photoGallery: ParentPhotoGalleryScreen,
        volunteering: VolunteeringScreen, permissionSlips: PermissionSlipScreen, appointments: (props: any) => <AppointmentScreen {...props} parentId={user?.id} students={students} />,
        aiParentingTips: AIParentingTipsScreen, messages: (props: any) => <ParentMessagesScreen {...props} onSelectChat={(convo: any) => navigateTo('chat', convo.participant?.name || 'Chat', { conversation: convo })} onNewChat={() => navigateTo('newChat', 'New Chat')} />,
        newChat: ParentNewChatScreen, chat: (props: any) => <ChatScreen {...props} currentUserId={currentUserId ?? 0} />, schoolUtilities: SchoolUtilitiesScreen,
        volunteerSignup: VolunteerSignup, conferenceScheduling: ConferenceScheduling, surveysAndPolls: SurveysAndPolls, donationPortal: DonationPortal, communityResources: CommunityResourceDirectory, referralSystem: ReferralSystem, panicButton: PanicButton, mentalHealthResources: MentalHealthResources,
    };

    const currentNavigation = viewStack[viewStack.length - 1];
    const ComponentToRender = viewComponents[currentNavigation.view];
    const commonProps = { navigateTo, onLogout, handleBack, forceUpdate, parentId, currentUser: user, currentUserId, schoolId, currentBranchId, version, students, loading: loadingStudents };

    return (
        <DashboardLayout
            title={currentNavigation.title}
            onBack={viewStack.length > 1 ? handleBack : undefined}
            activeScreen={activeBottomNav}
            setActiveScreen={handleBottomNavClick}
        >
            <div key={`${viewStack.length}-${version}`} className="w-full h-full">
                <Suspense fallback={<DashboardSuspenseFallback />}>
                    <ComponentToRender {...commonProps} {...currentNavigation.props} />
                </Suspense>
            </div>
            <Suspense fallback={<DashboardSuspenseFallback />}>
                {isSearchOpen && <GlobalSearchScreen onClose={() => setIsSearchOpen(false)} navigateTo={navigateTo} dashboardType={DashboardType.Parent} />}
            </Suspense>
        </DashboardLayout>
    );
};

export default ParentDashboard;
