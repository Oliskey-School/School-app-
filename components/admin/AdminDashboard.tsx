import React, { useState, useEffect, lazy, Suspense } from 'react';
import Header from '../ui/Header';
import { AdminBottomNav } from '../ui/DashboardBottomNav';
import { mockNotifications } from '../../data';
import { DashboardType } from '../../types';
import { supabase } from '../../lib/supabase';
import ErrorBoundary from '../shared/ErrorBoundary';

// Lazy load GlobalSearchScreen
const GlobalSearchScreen = lazy(() => import('../shared/GlobalSearchScreen'));

// Static Imports (All Components)
import DashboardOverview from './DashboardOverview';
import AnalyticsScreen from './AnalyticsScreen';
import ClassListScreen from './ClassListScreen';
import StudentListScreen from './StudentListScreen';
import AddStudentScreen from './AddStudentScreen';
import TeacherListScreen from './TeacherListScreen';
import TeacherPerformanceScreen from './TeacherPerformanceScreen';
import TimetableEditor from './TimetableEditor';
import TeacherAttendanceScreen from './TeacherAttendanceScreen';
import FeeManagement from './FeeManagement';
import FeeDetailsScreen from './FeeDetailsScreen';
import ExamManagement from './ExamManagement';
import AddExamScreen from './AddExamScreen';
import ReportCardPublishing from './ReportCardPublishing';
import UserRolesScreen from './UserRolesScreen';
import AuditLogScreen from './AuditLogScreen';
import ProfileSettings from './ProfileSettings';
import CommunicationHub from './CommunicationHub';
import ReportsScreen from './ReportsScreen';
import StudentProfileAdminView from './StudentProfileAdminView';
import EditProfileScreen from './EditProfileScreen';
import NotificationsSettingsScreen from './NotificationsSettingsScreen';
import SecuritySettingsScreen from './SecuritySettingsScreen';
import ChangePasswordScreen from './ChangePasswordScreen';
import OnlineStoreScreen from './OnlineStoreScreen';
import AdminSelectClassForReport from './AdminSelectClassForReport';
import AdminStudentListForReport from './AdminStudentListForReport';
import AdminStudentReportCardScreen from './AdminStudentReportCardScreen';
import SystemSettingsScreen from './SystemSettingsScreen';
import AcademicSettingsScreen from './AcademicSettingsScreen';
import FinancialSettingsScreen from './FinancialSettingsScreen';
import CommunicationSettingsScreen from './CommunicationSettingsScreen';
import BrandingSettingsScreen from './BrandingSettingsScreen';
import PersonalSecuritySettingsScreen from './PersonalSecuritySettingsScreen';
import TeacherDetailAdminView from './TeacherDetailAdminView';
import TeacherAttendanceDetail from './TeacherAttendanceDetail';
import AttendanceOverviewScreen from './AttendanceOverviewScreen';
import ClassAttendanceDetailScreen from './ClassAttendanceDetailScreen';
import AdminSelectTermForReport from './AdminSelectTermForReport';
import AdminMessagesScreen from './AdminMessagesScreen';
import AdminNewChatScreen from './AdminNewChatScreen';
import HealthLogScreen from './HealthLogScreen';
import TimetableGeneratorScreen from './TimetableGeneratorScreen';
import BusDutyRosterScreen from './BusDutyRosterScreen';

// Shared Imports
import CalendarScreen from '../shared/CalendarScreen';
import NotificationsScreen from '../shared/NotificationsScreen';
import ChatScreen from '../shared/ChatScreen';
import ReportCardInputScreen from '../teacher/ReportCardInputScreen';

// User Management Imports
import SelectUserTypeToAddScreen from './SelectUserTypeToAddScreen';
import AddTeacherScreen from './AddTeacherScreen';
import AddParentScreen from './AddParentScreen';
import ParentListScreen from './ParentListScreen';
import ParentDetailAdminView from './ParentDetailAdminView';

// Content Management - STATIC IMPORTS to verify resolution
import ManagePoliciesScreen from './ManagePoliciesScreen';
import ManageVolunteeringScreen from './ManageVolunteeringScreen';
import ManagePermissionSlipsScreen from './ManagePermissionSlipsScreen';
import ManageLearningResourcesScreen from './ManageLearningResourcesScreen';
import ManagePTAMeetingsScreen from './ManagePTAMeetingsScreen';
import SchoolInfoScreen from './SchoolInfoScreen';

interface ViewStackItem {
    view: string;
    props: any;
    title: string;
}

interface AdminDashboardProps {
    onLogout: () => void;
    setIsHomePage: (isHome: boolean) => void;
}

const DashboardSuspenseFallback = () => (
    <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-50">
        <div className="w-10 h-10 border-4 border-t-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin"></div>
    </div>
);

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, setIsHomePage }) => {
    const [activeBottomNav, setActiveBottomNav] = useState('home');
    const [viewStack, setViewStack] = useState<ViewStackItem[]>([{ view: 'overview', props: {}, title: 'Admin Dashboard' }]);
    const [version, setVersion] = useState(0);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');

    const forceUpdate = () => setVersion(v => v + 1);

    useEffect(() => {
        setIsHomePage(viewStack.length === 1 && !isSearchOpen);
    }, [viewStack, isSearchOpen, setIsHomePage]);

    // Database Connection Check
    useEffect(() => {
        const checkDb = async () => {
            try {
                // Try to fetch one row from a public table to verify connection
                const { error } = await supabase.from('students').select('id').limit(1).maybeSingle();
                if (error && error.code !== 'PGRST116') { // PGRST116 is just "no rows", which is fine for connection check
                    console.error("DB Connection Check Error:", error);
                    setDbStatus('error');
                } else {
                    setDbStatus('connected');
                }
            } catch (e) {
                console.error("DB Connection Exception:", e);
                setDbStatus('error');
            }
        };
        checkDb();
    }, []);

    // Define View Components INSIDE to access local context if needed, but mostly for simplicity re: closure
    // No useMemo to ensure fresh references
    const viewComponents: { [key: string]: React.ComponentType<any> } = {
        overview: DashboardOverview,
        analytics: AnalyticsScreen,
        reports: ReportsScreen,
        classList: ClassListScreen,
        teacherList: TeacherListScreen,
        teacherPerformance: TeacherPerformanceScreen,
        timetable: TimetableGeneratorScreen,
        timetableEditor: TimetableEditor,
        teacherAttendance: TeacherAttendanceScreen,
        feeManagement: FeeManagement,
        feeDetails: FeeDetailsScreen,
        examManagement: ExamManagement,
        addExam: AddExamScreen,
        reportCardPublishing: ReportCardPublishing,
        schoolCalendar: CalendarScreen,
        userRoles: UserRolesScreen,
        auditLog: AuditLogScreen,
        profileSettings: ProfileSettings,
        studentList: StudentListScreen,
        addStudent: AddStudentScreen,
        communicationHub: CommunicationHub,
        studentProfileAdminView: StudentProfileAdminView,
        editProfile: EditProfileScreen,
        notificationsSettings: NotificationsSettingsScreen,
        securitySettings: SecuritySettingsScreen,
        changePassword: ChangePasswordScreen,
        notifications: NotificationsScreen,
        onlineStore: OnlineStoreScreen,
        schoolReports: AdminSelectClassForReport,
        studentListForReport: AdminStudentListForReport,
        viewStudentReport: AdminStudentReportCardScreen,
        systemSettings: SystemSettingsScreen,
        academicSettings: AcademicSettingsScreen,
        financialSettings: FinancialSettingsScreen,
        communicationSettings: CommunicationSettingsScreen,
        brandingSettings: BrandingSettingsScreen,
        personalSecuritySettings: PersonalSecuritySettingsScreen,
        teacherDetailAdminView: TeacherDetailAdminView,
        teacherAttendanceDetail: TeacherAttendanceDetail,
        attendanceOverview: AttendanceOverviewScreen,
        classAttendanceDetail: ClassAttendanceDetailScreen,
        adminSelectTermForReport: AdminSelectTermForReport,

        // Wrappers
        adminReportCardInput: (props: any) => <ReportCardInputScreen {...props} isAdmin={true} />,
        adminMessages: (props: any) => (
            <AdminMessagesScreen
                {...props}
                onSelectChat={(conversation: any) => navigateTo('chat', conversation.participant.name, { conversation })}
                onNewChat={() => navigateTo('adminNewChat', 'New Chat')}
            />
        ),
        adminNewChat: AdminNewChatScreen,
        chat: (props: any) => <ChatScreen {...props} currentUserId={0} />,

        healthLog: HealthLogScreen,
        busDutyRoster: BusDutyRosterScreen,

        // User Management
        selectUserTypeToAdd: SelectUserTypeToAddScreen,
        addTeacher: AddTeacherScreen,
        addParent: AddParentScreen,
        parentList: ParentListScreen,
        parentDetailAdminView: ParentDetailAdminView,

        // Content Management
        managePolicies: ManagePoliciesScreen,
        manageVolunteering: ManageVolunteeringScreen,
        managePermissionSlips: ManagePermissionSlipsScreen,
        manageLearningResources: ManageLearningResourcesScreen,
        managePTAMeetings: ManagePTAMeetingsScreen,
        manageSchoolInfo: SchoolInfoScreen,
    };

    const notificationCount = mockNotifications.filter(n => !n.isRead && n.audience.includes('admin')).length;

    const navigateTo = (view: string, title: string, props: any = {}) => {
        console.log(`Navigating to: ${view}`);
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
                setViewStack([{ view: 'overview', props: {}, title: 'Admin Dashboard' }]);
                break;
            case 'messages':
                setViewStack([{ view: 'adminMessages', props: {}, title: 'Messages' }]);
                break;
            case 'communication':
                setViewStack([{ view: 'communicationHub', props: {}, title: 'Communication Hub' }]);
                break;
            case 'analytics':
                setViewStack([{ view: 'analytics', props: {}, title: 'School Analytics' }]);
                break;
            case 'settings':
                setViewStack([{ view: 'profileSettings', props: { onLogout }, title: 'Profile Settings' }]);
                break;
            default:
                setViewStack([{ view: 'overview', props: {}, title: 'Admin Dashboard' }]);
        }
    };

    const handleNotificationClick = () => {
        navigateTo('notifications', 'Notifications');
    };

    const currentNavigation = viewStack[viewStack.length - 1];
    const ComponentToRender = viewComponents[currentNavigation.view];

    const commonProps = {
        navigateTo,
        onLogout,
        handleBack,
        forceUpdate,
    };

    const renderContent = () => {
        if (!ComponentToRender) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8 text-center">
                    <p className="text-xl font-bold mb-2">View Not Found</p>
                    <p>The requested view <code className="bg-gray-200 px-1 rounded">{currentNavigation.view}</code> does not exist.</p>
                    <p className="text-sm mt-4 text-gray-400">Please contact support or try reloading the page.</p>
                </div>
            );
        }

        if (currentNavigation.view === 'notifications') {
            return <NotificationsScreen {...currentNavigation.props} {...commonProps} userType="admin" />;
        }

        return <ComponentToRender {...currentNavigation.props} {...commonProps} />;
    };

    return (
        <div className="flex flex-col h-full bg-gray-100 relative">
            {dbStatus === 'error' && (
                <div className="bg-red-600 text-white text-xs py-1 px-4 text-center font-medium z-50">
                    Network/Database Error: Cannot connect to the server. Please check your internet connection or try again later.
                </div>
            )}
            <Header
                title={currentNavigation.title}
                avatarUrl="https://i.pravatar.cc/150?u=admin"
                bgColor="bg-indigo-800"
                onLogout={onLogout}
                onBack={viewStack.length > 1 ? handleBack : undefined}
                onNotificationClick={handleNotificationClick}
                notificationCount={notificationCount}
                onSearchClick={() => setIsSearchOpen(true)}
            />
            <div className="flex-grow overflow-y-auto relative">
                <ErrorBoundary key={`${viewStack.length}-${currentNavigation.view}`}>
                    <div key={`${viewStack.length}-${version}`} className="animate-slide-in-up h-full">
                        {renderContent()}
                    </div>
                </ErrorBoundary>
            </div>
            <AdminBottomNav activeScreen={activeBottomNav} setActiveScreen={handleBottomNavClick} />
            <Suspense fallback={<DashboardSuspenseFallback />}>
                {isSearchOpen && (
                    <GlobalSearchScreen
                        dashboardType={DashboardType.Admin}
                        navigateTo={navigateTo}
                        onClose={() => setIsSearchOpen(false)}
                    />
                )}
            </Suspense>
        </div>
    );
};

export default AdminDashboard;
