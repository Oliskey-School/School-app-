import React, { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
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
import PremiumModal from '../ui/PremiumModal';
import SchoolContextSwitcher from '../ui/SchoolContextSwitcher';


import { getHomeworkStatus } from '../../utils/homeworkUtils';
import { realtimeService } from '../../services/RealtimeService';
import { syncEngine } from '../../lib/syncEngine';
import { useAutoSync } from '../../hooks/useAutoSync';

// Import all view components
import AttendanceScreen from '../student/AttendanceScreen';
import FeeStatusScreen from './FeeStatusScreen';
import SelectChildForReportScreen from './SelectChildForReportScreen';
import ReportCardScreen from './ReportCardScreen';
import TimetableScreen from '../shared/TimetableScreen';
import ParentProfileScreen from './ParentProfileScreen';
import EditParentProfileScreen from './EditParentProfileScreen';
import FeedbackScreen from './FeedbackScreen';
import ParentNotificationSettingsScreen from './ParentNotificationSettingsScreen';
import ParentSecurityScreen from './ParentSecurityScreen';
import LearningResourcesScreen from './LearningResourcesScreen';
import SchoolPoliciesScreen from './SchoolPoliciesScreen';
import PTAMeetingScreen from './PTAMeetingScreen';
import ParentPhotoGalleryScreen from './ParentPhotoGalleryScreen';
import VolunteeringScreen from './VolunteeringScreen';
import PermissionSlipScreen from './PermissionSlipScreen';
import AppointmentScreen from './AppointmentScreen';
import AIParentingTipsScreen from './AIParentingTips';
import ParentMessagesScreen from './ParentMessagesScreen';
import ParentNewChatScreen from './ParentNewChatScreen';
import ChatScreen from '../shared/ChatScreen';
import SchoolUtilitiesScreen from './SchoolUtilitiesScreen';
import LinkChildScreen from './LinkChildScreen';
import GlobalSearchScreen from '../shared/GlobalSearchScreen';
import EmailVerificationPrompt from '../auth/EmailVerificationPrompt';
import ParentTodayWidget from './ParentTodayWidget';
import ParentChangePasswordScreen from './ParentChangePasswordScreen';
import { UnifiedParentHome } from './UnifiedParentHome';
import { FeesPiggyBank } from './FeesPiggyBank';
import { SmartCalendar } from './SmartCalendar';
import StudentProfileEnhanced from '../student/StudentProfileEnhanced';

// Shared View Components
import ExamSchedule from '../shared/ExamSchedule';
import NoticeboardScreen from '../shared/NoticeboardScreen';
import NotificationsScreen from '../shared/NotificationsScreen';
import CalendarScreen from '../shared/CalendarScreen';
import LibraryScreen from '../shared/LibraryScreen';
import BusRouteScreen from '../shared/BusRouteScreen';

// Phase 5: Parent & Community Empowerment Components
import VolunteerSignup from './VolunteerSignup';
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
    const { student, feeInfo, nextHomework, attendancePercentage, enrollments } = data;

    return (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden transition-transform hover:shadow-lg">
            <div className="p-4" style={{ backgroundColor: `${colorTheme.bg}1A` }}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <img src={student.avatarUrl} alt={student.name} className="w-14 h-14 rounded-full object-cover border-2" style={{ borderColor: colorTheme.bg }} />
                        <div>
                            <h3 className="font-bold text-lg text-gray-800">{student.name}</h3>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                                {enrollments && enrollments.length > 0 ? (
                                    enrollments.map((cls: string, idx: number) => (
                                        <span key={idx} className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/80 border" style={{ color: colorTheme.text, borderColor: `${colorTheme.bg}40` }}>
                                            {cls}
                                        </span>
                                    ))
                                ) : (
                                    <p className="text-sm font-semibold" style={{ color: colorTheme.text }}>{getFormattedClassName(student.grade, student.section)}</p>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">ID: {student.schoolGeneratedId || 'Pending'}</p>
                        </div>
                    </div>
                    <button onClick={() => navigateTo('childDetail', student.name, { student: student })} className="bg-white p-2 rounded-full shadow-sm hover:bg-gray-100">
                        <ChevronRightIcon className="text-gray-600" />
                    </button>
                </div>
            </div>

            <div className="px-4 py-3 grid grid-cols-2 gap-4 border-t border-gray-100">
                <StatItem icon={<AttendanceSummaryIcon className="h-5 w-5 text-green-600" />} label="Attendance" value={`${attendancePercentage}%`} colorClass="bg-green-100" />
                <StatItem icon={<ReceiptIcon className="h-5 w-5 text-red-600" />} label="Fees Due" value={feeInfo?.status || 'N/A'} colorClass="bg-red-100" />
                {nextHomework && <StatItem icon={<ClipboardListIcon className="h-5 w-5 text-purple-600" />} label="Homework" value={`${nextHomework.subject}`} colorClass="bg-purple-100" />}
                <StatItem icon={<ReportIcon className="h-5 w-5 text-sky-600" />} label="Report Card" value="View" colorClass="bg-sky-100" />
            </div>
        </div>
    );
};

const AcademicsTab = ({ student, navigateTo, schoolId, currentBranchId }: { student: Student; navigateTo: (view: string, title: string, props?: any) => void; schoolId?: string; currentBranchId?: string | null }) => {
    const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    
    const fetchAcademics = useCallback(async () => {
        try {
            setLoading(true);
            // 1. Fetch Assignments
            const assignmentsData = await api.getAssignments(schoolId || '', {
                classId: student.current_class_id || undefined
            });

            if (assignmentsData) {
                const merged: StudentAssignment[] = (assignmentsData || []).map((a: any) => {
                    const submission = a.submissions?.find((s: any) => s.student_id === student.id);
                    return {
                        id: a.id,
                        title: a.title,
                        description: a.description,
                        className: a.class_name,
                        subject: a.subject,
                        dueDate: a.due_date,
                        totalStudents: a.total_students || 0,
                        submissionsCount: a.submissions_count || 0,
                        submission: submission ? {
                            id: submission.id,
                            assignmentId: a.id,
                            student: { id: student.id, name: student.name, avatarUrl: student.avatarUrl },
                            submittedAt: submission.submitted_at,
                            isLate: false,
                            status: submission.grade ? 'Graded' : 'Ungraded',
                            grade: submission.grade
                        } : undefined
                    };
                });
                setAssignments(merged);
            }
        } catch (err) {
            console.error("Error fetching academics:", err);
        } finally {
            setLoading(false);
        }
    }, [student, schoolId]);

    // Real-time synchronization
    useAutoSync(['assignments', 'assignment_submissions'], fetchAcademics);

    useEffect(() => {
        fetchAcademics();
    }, [fetchAcademics]);

    const academicRecords = student.academicPerformance || [];

    const averageScore = useMemo(() => {
        if (!academicRecords.length) return 0;
        return Math.round(academicRecords.reduce((acc, curr) => acc + curr.score, 0) / academicRecords.length);
    }, [academicRecords]);

    return (
        <div className="p-4 space-y-4">
            <div className="bg-gradient-to-r from-green-500 to-teal-500 p-4 rounded-2xl shadow-lg flex items-center justify-between text-white">
                <div>
                    <h3 className="font-bold text-lg">Personalized Advice</h3>
                    <p className="text-sm opacity-90">Get AI-powered tips for your child.</p>
                </div>
                <button onClick={() => navigateTo('aiParentingTips', 'AI Parenting Tips', { student: { ...student, academicPerformance: academicRecords } })} className="bg-white/20 px-4 py-2 rounded-lg font-semibold hover:bg-white/30 transition-colors flex items-center space-x-2">
                    <SparklesIcon className="h-5 w-5" /><span>Get Tips</span>
                </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm">
                    <div className="flex justify-between items-center">
                        <div><h4 className="font-bold text-gray-800">Term Performance</h4><p className="text-sm text-gray-700">Current Term</p></div>
                        {averageScore > 0 && <div className="text-right"><p className="font-bold text-2xl text-green-600">{averageScore}%</p><p className="text-xs text-gray-700">Overall Average</p></div>}
                    </div>
                    {academicRecords.length > 0 ? (
                        <div className="mt-3 space-y-2">
                            {academicRecords.map((grade, i) => (
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
    const [notes, setNotes] = useState<any[]>(student.behaviorNotes || []);
    const [loading, setLoading] = useState(!student.behaviorNotes);

    useEffect(() => {
        const fetchNotes = async () => {
            if (student.behaviorNotes && student.behaviorNotes.length > 0) return;
            try {
                setLoading(true);
                const data = await api.getBehaviorNotes(student.id);
                setNotes(data || []);
            } catch (err) {
                console.error("Error fetching behavior notes:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchNotes();
    }, [student.id]);

    if (loading) return <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div></div>;

    return (
        <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {notes.length > 0 ? [...notes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(note => {
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
    
    const fetchAttendance = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getAttendanceByStudent(student.id);
            if (data) setAttendance(data.map((a: any) => ({
                id: a.id,
                studentId: a.student_id,
                date: a.date,
                status: a.status
            })));
        } catch (err) {
            console.error("Error fetching attendance:", err);
        } finally {
            setLoading(false);
        }
    }, [student.id]);

    // Real-time synchronization
    useAutoSync(['student_attendance'], fetchAttendance);

    useEffect(() => {
        fetchAttendance();
    }, [fetchAttendance]);

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
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <div key={`${day}-${index}`}>{day}</div>)}
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

// Consolidated data fetching logic moved to ParentDashboard main component

interface ParentDashboardProps {
    onLogout?: () => void;
    setIsHomePage?: (isHome: boolean) => void;
    currentUser?: any;
}

import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';

// Helper to strip heavy props before saving to localStorage to prevent QuotaExceededError
const pruneViewStack = (stack: ViewStackItem[]): ViewStackItem[] => {
    // Limit stack depth to prevent overflow
    const limitedStack = stack.length > 8 ? stack.slice(-8) : stack;
    
    return limitedStack.map(item => {
        if (!item.props) return item;
        
        // Create a shallow copy of props
        const prunedProps = { ...item.props };
        
        // Remove known heavy data objects
        // We keep IDs so components can re-derive data from the main students array in commonProps
        const heavyFields = ['student', 'academicPerformance', 'behaviorNotes', 'reportCards', 'students', 'allTeachers'];
        heavyFields.forEach(field => {
            if (prunedProps[field]) {
                // Preserve ID if it's a student object
                if (field === 'student' && prunedProps[field].id && !prunedProps.studentId) {
                    prunedProps.studentId = prunedProps[field].id;
                }
                delete prunedProps[field];
            }
        });
        
        return { ...item, props: prunedProps };
    });
};

const ParentDashboard: React.FC<ParentDashboardProps> = ({ onLogout, setIsHomePage, currentUser }) => {
    const { currentSchool, currentBranchId, user } = useAuth();
    
    // 1. Initialize viewStack from localStorage or default
    const [viewStack, setViewStack] = useState<ViewStackItem[]>(() => {
        const saved = localStorage.getItem(`parent_view_stack_${user?.id}`);
        try {
            return saved ? JSON.parse(saved) : [{ view: 'dashboard', title: 'Parent Dashboard' }];
        } catch (e) {
            return [{ view: 'dashboard', title: 'Parent Dashboard' }];
        }
    });

    // 2. Initialize activeBottomNav from localStorage or default
    const [activeBottomNav, setActiveBottomNav] = useState(() => {
        return localStorage.getItem(`parent_bottom_nav_${user?.id}`) || 'home';
    });

    // 3. Persist navigation state to localStorage
    useEffect(() => {
        if (user?.id) {
            try {
                const prunedStack = pruneViewStack(viewStack);
                localStorage.setItem(`parent_view_stack_${user?.id}`, JSON.stringify(prunedStack));
                localStorage.setItem(`parent_bottom_nav_${user?.id}`, activeBottomNav);
            } catch (e) {
                console.warn('Failed to save dashboard state to localStorage:', e);
                // If it fails, we at least don't crash. 
                // We could try clearing other items if it's a QuotaExceededError
                if (e instanceof Error && e.name === 'QuotaExceededError') {
                    // Try to save just the current view to at least have some persistence
                    try {
                        const minimalStack = [{ view: viewStack[viewStack.length - 1].view, title: viewStack[viewStack.length - 1].title }];
                        localStorage.setItem(`parent_view_stack_${user?.id}`, JSON.stringify(minimalStack));
                    } catch (innerE) {
                        // Give up persistence for now
                    }
                }
            }
        }
    }, [viewStack, activeBottomNav, user?.id]);
    const handleLogout = () => {
        if (user?.id) {
            localStorage.removeItem(`parent_view_stack_${user?.id}`);
            localStorage.removeItem(`parent_bottom_nav_${user?.id}`);
        }
        onLogout?.();
    };

    const [version, setVersion] = useState(0);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
    const [parentId, setParentId] = useState<string | null>(null);

    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [parentProfile, setParentProfile] = useState<{ name: string; avatarUrl: string; schoolGeneratedId?: string }>({ 
        name: user?.user_metadata?.full_name || 'Parent', 
        avatarUrl: user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.user_metadata?.full_name || 'Parent')}&background=random`, 
        schoolGeneratedId: user?.user_metadata?.school_generated_id || '...' 
    });
    const [students, setStudents] = useState<Student[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(true);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [profileError, setProfileError] = useState(false);
    const [profileFetched, setProfileFetched] = useState(false);
    // Derive schoolId from core sources
    const schoolId = currentSchool?.id || (user as any)?.school_id;
    const notificationCount = useRealtimeNotifications('parent');
    const forceUpdate = () => setVersion(v => v + 1);

    // 4. Consolidated Initial Data Load
    const initData = useCallback(async () => {
        if (!schoolId) return;

        // Start multiple parallel flows
        const flows = [];

        // Flow A: Auth User Info (from AuthContext — no Supabase needed)
        flows.push((async () => {
            if (user?.id) {
                setCurrentUserId(user.id);
            }
        })());

        // Flow B: Parent Profile & Children
        flows.push((async () => {
            try {
                setLoadingProfile(true);
                const profile = await api.getMyParentProfile();
                if (profile) {
                    setParentId(profile.id);
                    setParentProfile({
                        name: profile.name || profile.full_name || 'Parent',
                        avatarUrl: profile.avatar_url || 'https://i.pravatar.cc/150?u=parent',
                        schoolGeneratedId: profile.school_generated_id
                    });

                    // Fetch children now that we have parentId
                    const childrenData = await api.getMyChildren();
                    if (childrenData) {
                        setStudents(childrenData.map((s: any) => ({
                            id: s.id,
                            name: s.name || s.full_name || '',
                            email: s.email || '',
                            avatarUrl: s.avatar_url || 'https://via.placeholder.com/150',
                            grade: s.grade,
                            section: s.section,
                            attendanceStatus: s.attendance_status || 'Present',
                            birthday: s.birthday,
                            schoolGeneratedId: s.school_generated_id,
                            schoolId: s.school_id,
                            branchId: s.branch_id,
                            academicPerformance: (s.academic_performance || []).map((a: any) => ({ subject: a.subject, score: a.total || a.score })),
                            behaviorNotes: (s.behavior_notes || []).map((b: any) => ({ id: b.id, date: b.date, type: b.category, title: b.category, note: b.note || '', by: b.reporter_name || 'Teacher' })),
                            reportCards: (s.report_cards || []).filter((r: any) => r.status === 'Published').map((r: any) => ({ term: r.term, session: r.session, status: r.status }))
                        } as any)));
                    }
                } else {
                    setProfileError(true);
                }
            } catch (err) {
                console.error("Error in Parent Portal data load:", err);
                setProfileError(true);
            } finally {
                setLoadingProfile(false);
                setLoadingStudents(false);
                setProfileFetched(true);
            }
        })());

        await Promise.all(flows);
    }, [schoolId, user?.id]);

    // Real-time synchronization for core parent data
    useAutoSync(['parents', 'students', 'parent_student_links'], initData);

    useEffect(() => {
        if (schoolId) initData();
    }, [schoolId, initData]);

    useEffect(() => { const currentView = viewStack[viewStack.length - 1]; setIsHomePage(currentView.view === 'dashboard' && !isSearchOpen); }, [viewStack, isSearchOpen, setIsHomePage]);

    const navigateTo = (view: string, title: string, props: any = {}) => {
        React.startTransition(() => {
            setViewStack(stack => [...stack, { view, props, title }]);
        });
    };
    const handleBack = () => {
        if (viewStack.length > 1) {
            React.startTransition(() => {
                setViewStack(stack => stack.slice(0, -1));
            });
        }
    };
    const handleBottomNavClick = (screen: string) => {
        React.startTransition(() => {
            setActiveBottomNav(screen);
            switch (screen) {
                case 'home': setViewStack([{ view: 'dashboard', title: 'Parent Dashboard' }]); break;
                case 'fees': setViewStack([{ view: 'feeStatus', title: 'Fee Status' }]); break;
                case 'reports': setViewStack([{ view: 'selectReport', title: 'Select Report Card' }]); break;
                case 'messages': setViewStack([{ view: 'messages', title: 'Messages' }]); break;
                case 'more': setViewStack([{ view: 'more', title: 'More Options' }]); break;
                default: setViewStack([{ view: 'dashboard', title: 'Parent Dashboard' }]);
            }
        });
    };

    const viewComponents: { [key: string]: React.ComponentType<any> } = {
        dashboard: UnifiedParentHome,
        piggyBank: (props: any) => <FeesPiggyBank {...props} />,
        smartCalendar: SmartCalendar,
        todaySummary: (props: any) => <ParentTodayWidget {...props} />,
        childDetail: (props: any) => (
            <StudentProfileEnhanced 
                studentId={props.studentId || props.student?.id} 
                student={props.student} 
                navigateTo={props.navigateTo} 
                initialTab={props.initialTab}
            />
        ),
        examSchedule: ExamSchedule,
        noticeboard: (props: any) => <NoticeboardScreen {...props} userType="parent" />,
        notifications: (props: any) => <NotificationsScreen {...props} userType="parent" navigateTo={navigateTo} />,
        calendar: CalendarScreen,
        library: LibraryScreen,
        busRoute: BusRouteScreen,
        feeStatus: (props: any) => <FeeStatusScreen {...props} parentId={parentId} />,
        selectReport: (props: any) => <SelectChildForReportScreen {...props} parentId={parentId} />,
        reportCard: ReportCardScreen,
        timetable: (props: any) => <TimetableScreen {...props} context={{ userType: 'parent', userId: parentId || '' }} students={students} />,
        more: ParentProfileScreen,
        editParentProfile: EditParentProfileScreen,
        feedback: FeedbackScreen,
        notificationSettings: ParentNotificationSettingsScreen,
        securitySettings: ParentSecurityScreen,
        parentChangePassword: ParentChangePasswordScreen,
        learningResources: LearningResourcesScreen,
        schoolPolicies: SchoolPoliciesScreen,
        ptaMeetings: PTAMeetingScreen,
        photoGallery: ParentPhotoGalleryScreen,
        volunteering: VolunteeringScreen,
        permissionSlips: PermissionSlipScreen,
        appointments: (props: any) => <AppointmentScreen {...props} parentId={user?.id} students={students} />,
        aiParentingTips: AIParentingTipsScreen,
        messages: (props: any) => <ParentMessagesScreen {...props} onSelectChat={(convo: any) => navigateTo('chat', convo.participant?.name || 'Chat', { conversation: convo })} onNewChat={() => navigateTo('newChat', 'New Chat')} />,
        newChat: ParentNewChatScreen,
        chat: (props: any) => <ChatScreen {...props} currentUserId={currentUserId ?? 0} />,
        schoolUtilities: SchoolUtilitiesScreen,
        volunteerSignup: VolunteerSignup,
        conferenceScheduling: ConferenceScheduling,
        surveysAndPolls: SurveysAndPolls,
        donationPortal: DonationPortal,
        communityResources: CommunityResourceDirectory || (() => null),
        referralSystem: ReferralSystem || (() => null),
        panicButton: PanicButton || (() => null),
        mentalHealthResources: MentalHealthResources || (() => null),
        attendance: (props: any) => <AttendanceScreen {...props} />,
        // Alias mappings for widget navigation
        attendanceOverview: (props: any) => <AttendanceScreen {...props} />,
        parentMessages: (props: any) => <ParentMessagesScreen {...props} onSelectChat={(convo: any) => navigateTo('chat', convo.participant?.name || 'Chat', { conversation: convo })} onNewChat={() => navigateTo('newChat', 'New Chat')} />,
        schoolCalendar: CalendarScreen,
        assignments: (props: any) => {
            const student = props.student || students[0];
            return student ? <ChildDetailScreen {...props} student={student} initialTab="academics" /> : <UnifiedParentHome {...props} />;
        },
        linkChild: (props: any) => <LinkChildScreen {...props} />,
    };

    // Expose navigation for automated E2E audits (runs every render so keys are always fresh)
    useEffect(() => {
        if (window.__AUDIT_MODE__ || localStorage.getItem('audit_mode') === 'true') {
            window.PARENT_NAVIGATE = navigateTo;
            window.PARENT_COMPONENTS = Object.keys(viewComponents);
        }
    });

    const currentNavigation = viewStack[viewStack.length - 1];
    
    // Safety check for Component rendering
    const ComponentToRender = viewComponents[currentNavigation.view] || (() => (
        <div className="flex flex-col items-center justify-center h-[60vh] p-8 text-center bg-gray-50 rounded-3xl m-4">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ExclamationCircleIcon className="w-8 h-8 text-amber-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Feature Coming Soon</h2>
                <p className="text-gray-500 mt-2">The requested view "{currentNavigation.view}" is being optimized or is not available for your account yet.</p>
                <button 
                    onClick={() => setViewStack([{ view: 'dashboard', title: 'Parent Dashboard' }])}
                    className="mt-6 w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                >
                    Back to Home
                </button>
            </div>
        </div>
    ));

    const commonProps = { navigateTo, onLogout, handleBack, forceUpdate, parentId, currentUser: user, currentUserId, schoolId, currentBranchId, version, students, loading: loadingStudents };

    // Only show loading for parent profile if we have schoolId and it's actually loading
    if (loadingProfile && !parentId && schoolId) {
        return <PremiumLoader message="Syncing parent profile..." />;
    }

    if (profileError && !parentId) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-6 text-center bg-gray-50">
                <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">👪</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Parent Profile Not Found</h2>
                    <p className="text-gray-600 mb-6">
                        We couldn't find a parent record linked to your account.
                        Please contact the school administrator to link your account to your children.
                    </p>
                    <button
                        onClick={() => onLogout?.()}
                        className="w-full py-3 px-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-200"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <DashboardLayout
            title={currentNavigation.title}
            onBack={viewStack.length > 1 ? handleBack : undefined}
            onLogout={handleLogout}
            activeScreen={activeBottomNav}
            setActiveScreen={handleBottomNavClick}
        >
            <div key={`${viewStack.length}-${version}`} className="w-full h-full flex flex-col">
                <div className="absolute top-0 right-0 p-4 z-30 pointer-events-none">
                    <div className="pointer-events-auto">
                        <SchoolContextSwitcher currentSchoolName={currentSchool?.name || 'My School'} />
                    </div>
                </div>

                <Suspense fallback={<DashboardSuspenseFallback />}>
                    <ComponentToRender {...commonProps} {...currentNavigation.props} />
                </Suspense>
            </div>
            <Suspense fallback={<DashboardSuspenseFallback />}>
                {isSearchOpen && <GlobalSearchScreen onClose={() => setIsSearchOpen(false)} navigateTo={navigateTo} dashboardType={DashboardType.Parent} />}
            </Suspense>
            <PremiumModal 
                isOpen={isPremiumModalOpen} 
                onClose={() => setIsPremiumModalOpen(false)} 
                featureName="Advanced Student Insights" 
            />
        </DashboardLayout>

    );
};

export default ParentDashboard;
