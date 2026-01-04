import React, { useState, useEffect, lazy, Suspense } from 'react';
import Header from '../ui/Header';
import { AdminBottomNav } from '../ui/DashboardBottomNav';
import { AdminSidebar } from '../ui/DashboardSidebar';
import { DashboardType } from '../../types';
import { supabase } from '../../lib/supabase';
import ErrorBoundary from '../shared/ErrorBoundary';

// Lazy load GlobalSearchScreen
const GlobalSearchScreen = lazy(() => import('../shared/GlobalSearchScreen'));

// Static Imports (Converted to Lazy for Performance)
const DashboardOverview = lazy(() => import('./DashboardOverview'));
const AnalyticsScreen = lazy(() => import('./AnalyticsScreen'));
const ClassListScreen = lazy(() => import('./ClassListScreen'));
const StudentListScreen = lazy(() => import('./StudentListScreen'));
const AddStudentScreen = lazy(() => import('./AddStudentScreen'));
const TeacherListScreen = lazy(() => import('./TeacherListScreen'));
const TeacherPerformanceScreen = lazy(() => import('./TeacherPerformanceScreen'));
const TimetableEditor = lazy(() => import('./TimetableEditor'));
const TeacherAttendanceScreen = lazy(() => import('./TeacherAttendanceScreen'));
const TeacherAttendanceApproval = lazy(() => import('./TeacherAttendanceApproval'));
const FeeManagement = lazy(() => import('./FeeManagement'));
const FeeDetailsScreen = lazy(() => import('./FeeDetailsScreen'));
const ExamManagement = lazy(() => import('./ExamManagement'));
const AddExamScreen = lazy(() => import('./AddExamScreen'));
const ReportCardPublishing = lazy(() => import('./ReportCardPublishing'));
const UserRolesScreen = lazy(() => import('./UserRolesScreen'));
const AuditLogScreen = lazy(() => import('./AuditLogScreen'));
const ProfileSettings = lazy(() => import('./ProfileSettings'));
const CommunicationHub = lazy(() => import('./CommunicationHub'));
const ReportsScreen = lazy(() => import('./ReportsScreen'));
const StudentProfileAdminView = lazy(() => import('./StudentProfileAdminView'));
const EditProfileScreen = lazy(() => import('./EditProfileScreen'));
const NotificationsSettingsScreen = lazy(() => import('./NotificationsSettingsScreen'));
const SecuritySettingsScreen = lazy(() => import('./SecuritySettingsScreen'));
const ChangePasswordScreen = lazy(() => import('./ChangePasswordScreen'));
const OnlineStoreScreen = lazy(() => import('./OnlineStoreScreen'));
const AdminSelectClassForReport = lazy(() => import('./AdminSelectClassForReport'));
const AdminStudentListForReport = lazy(() => import('./AdminStudentListForReport'));
const AdminStudentReportCardScreen = lazy(() => import('./AdminStudentReportCardScreen'));
const SystemSettingsScreen = lazy(() => import('./SystemSettingsScreen'));
const AcademicSettingsScreen = lazy(() => import('./AcademicSettingsScreen'));
const FinancialSettingsScreen = lazy(() => import('./FinancialSettingsScreen'));
const CommunicationSettingsScreen = lazy(() => import('./CommunicationSettingsScreen'));
const BrandingSettingsScreen = lazy(() => import('./BrandingSettingsScreen'));
const PersonalSecuritySettingsScreen = lazy(() => import('./PersonalSecuritySettingsScreen'));
const TeacherDetailAdminView = lazy(() => import('./TeacherDetailAdminView'));
const TeacherAttendanceDetail = lazy(() => import('./TeacherAttendanceDetail'));
const AttendanceOverviewScreen = lazy(() => import('./AttendanceOverviewScreen'));
const ClassAttendanceDetailScreen = lazy(() => import('./ClassAttendanceDetailScreen'));
const AdminSelectTermForReport = lazy(() => import('./AdminSelectTermForReport'));
const AdminMessagesScreen = lazy(() => import('./AdminMessagesScreen'));
const AdminNewChatScreen = lazy(() => import('./AdminNewChatScreen'));
const HealthLogScreen = lazy(() => import('./HealthLogScreen'));
const TimetableGeneratorScreen = lazy(() => import('./TimetableGeneratorScreen'));
const BusDutyRosterScreen = lazy(() => import('./BusDutyRosterScreen'));

// Phase 4: Emergency & Safety Components
const EmergencyAlert = lazy(() => import('./EmergencyAlert'));
const VisitorLog = lazy(() => import('./VisitorLog'));
const PanicButton = lazy(() => import('../shared/PanicButton'));
const PermissionSlips = lazy(() => import('../shared/PermissionSlips'));
const MentalHealthResources = lazy(() => import('../shared/MentalHealthResources'));
const AccessibilitySettings = lazy(() => import('../shared/AccessibilitySettings'));

// Phase 5: Parent & Community Empowerment Components
const SMSLessonManager = lazy(() => import('./SMSLessonManager'));
const USSDWorkflow = lazy(() => import('./USSDWorkflow'));
const RadioContentScheduler = lazy(() => import('./RadioContentScheduler'));
const IVRLessonRecorder = lazy(() => import('./IVRLessonRecorder'));
const ScholarshipManagement = lazy(() => import('./ScholarshipManagement'));
const SponsorshipMatching = lazy(() => import('./SponsorshipMatching'));
const ConferenceScheduling = lazy(() => import('../shared/ConferenceScheduling'));
const SurveysAndPolls = lazy(() => import('../shared/SurveysAndPolls'));
const DonationPortal = lazy(() => import('../shared/DonationPortal'));
const CommunityResourceDirectory = lazy(() => import('../shared/CommunityResourceDirectory'));
const ReferralSystem = lazy(() => import('../shared/ReferralSystem'));

// Phase 6: Admin Ops, Analytics & Governance
const AttendanceHeatmap = lazy(() => import('./AttendanceHeatmap'));
const FinanceDashboard = lazy(() => import('./FinanceDashboard'));
const AcademicAnalytics = lazy(() => import('./AcademicAnalytics'));
const BudgetPlanner = lazy(() => import('./BudgetPlanner'));
const AuditTrailViewer = lazy(() => import('./AuditTrailViewer'));
const IntegrationHub = lazy(() => import('./IntegrationHub'));
const AnalyticsAdminTools = lazy(() => import('./AnalyticsAdminTools'));
const VendorManagement = lazy(() => import('./VendorManagement'));
const AssetInventory = lazy(() => import('./AssetInventory'));
const PrivacyDashboard = lazy(() => import('./PrivacyDashboard'));
const ComplianceChecklist = lazy(() => import('./ComplianceChecklist'));
const MaintenanceTickets = lazy(() => import('./MaintenanceTickets'));

// Shared Imports
const CalendarScreen = lazy(() => import('../shared/CalendarScreen'));
const NotificationsScreen = lazy(() => import('../shared/NotificationsScreen'));
const ChatScreen = lazy(() => import('../shared/ChatScreen'));
const ReportCardInputScreen = lazy(() => import('../teacher/ReportCardInputScreen'));

// User Management Imports
const SelectUserTypeToAddScreen = lazy(() => import('./SelectUserTypeToAddScreen'));
const AddTeacherScreen = lazy(() => import('./AddTeacherScreen'));
const AddParentScreen = lazy(() => import('./AddParentScreen'));
const ParentListScreen = lazy(() => import('./ParentListScreen'));
const ParentDetailAdminView = lazy(() => import('./ParentDetailAdminView'));

// Content Management - STATIC IMPORTS to verify resolution
// Content Management - Lazy Loaded to prevent circular dependencies
const ManagePoliciesScreen = lazy(() => import('./ManagePoliciesScreen'));
const ManageVolunteeringScreen = lazy(() => import('./ManageVolunteeringScreen'));
const ManagePermissionSlipsScreen = lazy(() => import('./ManagePermissionSlipsScreen'));
const ManageLearningResourcesScreen = lazy(() => import('./ManageLearningResourcesScreen'));
const ManagePTAMeetingsScreen = lazy(() => import('./ManagePTAMeetingsScreen'));
const SchoolOnboardingScreen = lazy(() => import('./SchoolOnboardingScreen'));
const CurriculumSettingsScreen = lazy(() => import('./CurriculumSettingsScreen'));
const StudentEnrollmentWizard = lazy(() => import('./StudentEnrollmentWizard'));
const EnhancedEnrollmentWizard = lazy(() => import('./EnhancedEnrollmentWizard'));
const ExamCandidateRegistration = lazy(() => import('./ExamCandidateRegistration'));
const UserAccountsScreen = lazy(() => import('./UserAccountsScreen'));
const FacilityRegisterScreen = lazy(() => import('./FacilityRegisterScreen'));
const EquipmentInventoryScreen = lazy(() => import('./EquipmentInventoryScreen'));
const SafetyHealthLogs = lazy(() => import('./SafetyHealthLogs'));
const InspectionFlowWizard = lazy(() => import('../inspector/InspectionFlowWizard'));
const ComplianceDashboard = lazy(() => import('./ComplianceDashboard'));
const MasterReportingHub = lazy(() => import('./MasterReportingHub'));
const ValidationConsole = lazy(() => import('./ValidationConsole'));
const PilotOnboardingWizard = lazy(() => import('./PilotOnboardingWizard'));
const UnifiedGovernanceHub = lazy(() => import('./UnifiedGovernanceHub'));
const StudentProfileEnhanced = lazy(() => import('../student/StudentProfileEnhanced'));
const TeacherProfileEnhanced = lazy(() => import('../teacher/TeacherProfileEnhanced'));
const AttendanceTrackSelector = lazy(() => import('../teacher/AttendanceTrackSelector'));
const ResultsEntryEnhanced = lazy(() => import('../teacher/ResultsEntryEnhanced'));
const ComplianceOnboardingWizard = lazy(() => import('./ComplianceOnboardingWizard'));

const AdminReportCardInputWrapper = (props: any) => <ReportCardInputScreen {...props} isAdmin={true} />;

const AdminMessagesWrapper = (props: any) => {
    // navigateTo is passed via commonProps
    const { navigateTo } = props;
    return (
        <AdminMessagesScreen
            {...props}
            onSelectChat={(conversation: any) => navigateTo('chat', conversation.participant.name, { conversation })}
            onNewChat={() => navigateTo('adminNewChat', 'New Chat')}
        />
    );
};

const ChatWrapper = (props: any) => <ChatScreen {...props} currentUserId={0} />;

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

    // Wrappers for combined views
    const AnalyticsWrapper = (props: any) => (
        <div className="space-y-6">
            {/* Charts & Metrics */}
            <AnalyticsScreen {...props} />

            {/* Admin Tools & Phase 6 Features */}
            <AnalyticsAdminTools {...props} />
        </div>
    );

    // Define View Components INSIDE to access local context if needed, but mostly for simplicity re: closure
    // No useMemo to ensure fresh references
    const viewComponents: { [key: string]: React.ComponentType<any> } = {
        overview: DashboardOverview,
        analytics: AnalyticsWrapper,
        reports: ReportsScreen,
        classList: ClassListScreen,
        teacherList: TeacherListScreen,
        teacherPerformance: TeacherPerformanceScreen,
        timetable: TimetableGeneratorScreen,
        timetableEditor: TimetableEditor,
        teacherAttendance: TeacherAttendanceScreen,
        teacherAttendanceApproval: TeacherAttendanceApproval,
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
        adminReportCardInput: AdminReportCardInputWrapper,
        adminMessages: AdminMessagesWrapper,
        adminNewChat: AdminNewChatScreen,
        chat: ChatWrapper,

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
        manageSchoolInfo: SchoolOnboardingScreen,
        manageCurriculum: CurriculumSettingsScreen,
        enrollmentWizard: StudentEnrollmentWizard,
        exams: ExamCandidateRegistration,
        userAccounts: UserAccountsScreen,

        // Phase 4: Emergency & Safety
        emergencyAlert: EmergencyAlert,
        visitorLog: VisitorLog,
        permissionSlips: PermissionSlips,
        mentalHealthResources: MentalHealthResources,
        accessibilitySettings: AccessibilitySettings,

        // Phase 5: Parent & Community Empowerment
        smsLessonManager: SMSLessonManager,
        ussdWorkflow: USSDWorkflow,
        radioContentScheduler: RadioContentScheduler,
        ivrLessonRecorder: IVRLessonRecorder,
        scholarshipManagement: ScholarshipManagement,
        sponsorshipMatching: SponsorshipMatching,
        conferenceScheduling: ConferenceScheduling,
        surveysAndPolls: SurveysAndPolls,
        donationPortal: DonationPortal,
        communityResourceDirectory: CommunityResourceDirectory,
        referralSystem: ReferralSystem,

        // Phase 6: Admin Ops, Analytics & Governance
        attendanceHeatmap: AttendanceHeatmap,
        financeDashboard: FinanceDashboard,
        academicAnalytics: AcademicAnalytics,
        budgetPlanner: BudgetPlanner,
        auditTrailViewer: AuditTrailViewer,
        integrationHub: IntegrationHub,
        analyticsAdminTools: AnalyticsAdminTools,
        vendorManagement: VendorManagement,
        assetInventory: AssetInventory,
        facilityRegister: FacilityRegisterScreen,
        equipmentInventory: EquipmentInventoryScreen,
        safetyHealthLogs: SafetyHealthLogs,
        complianceDashboard: ComplianceDashboard,
        inspectionHub: InspectionFlowWizard,
        privacyDashboard: PrivacyDashboard,
        complianceChecklist: ComplianceChecklist,
        maintenanceTickets: MaintenanceTickets,
        masterReports: MasterReportingHub,
        validationConsole: ValidationConsole,
        onboardingWizard: PilotOnboardingWizard,
        governanceHub: UnifiedGovernanceHub,
        enhancedEnrollment: EnhancedEnrollmentWizard,
        complianceOnboarding: ComplianceOnboardingWizard,
        studentProfile: StudentProfileEnhanced,
        teacherProfile: TeacherProfileEnhanced,
        attendanceTracker: AttendanceTrackSelector,
        resultsEntry: ResultsEntryEnhanced,
    };

    const [notificationCount, setNotificationCount] = useState(0);

    useEffect(() => {
        const fetchNotifsCount = async () => {
            const { count } = await supabase
                .from('notifications')
                .select('id', { count: 'exact', head: true })
                .eq('is_read', false)
                .contains('audience', ['admin']);
            setNotificationCount(count || 0);
        };
        fetchNotifsCount();
    }, []);

    const getHeaderAvatar = () => {
        if (currentNavigation.view === 'chat' && currentNavigation.props?.conversation) {
            // Try to find avatar in various likely locations on the object
            // The structure passed from AdminMessagesScreen is { conversation: { participant: { avatarUrl: ... } } }
            const convo = currentNavigation.props.conversation;
            return convo.participant?.avatarUrl ||
                convo.displayAvatar ||
                convo.participantAvatar ||
                "https://api.dicebear.com/7.x/avataaars/svg?seed=Guest";
        }
        return "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin";
    };

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
            case 'feeManagement':
                setViewStack([{ view: 'feeManagement', props: {}, title: 'Fee Management' }]);
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
        <div className="flex h-screen w-full overflow-hidden bg-gray-100">
            {/* Desktop Sidebar - Hidden on mobile, fixed on desktop */}
            <div className="hidden md:flex w-64 flex-col fixed inset-y-0 left-0 z-50">
                <AdminSidebar
                    activeScreen={activeBottomNav}
                    setActiveScreen={handleBottomNavClick}
                    onLogout={onLogout}
                />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen w-full md:ml-64 overflow-hidden">
                {dbStatus === 'error' && (
                    <div className="bg-red-600 text-white text-xs py-1 px-4 text-center font-medium z-50">
                        Network/Database Error: Cannot connect to the server. Please check your internet connection or try again later.
                    </div>
                )}
                <Header
                    title={currentNavigation.title}
                    avatarUrl={getHeaderAvatar()}
                    bgColor="bg-indigo-800"
                    onLogout={onLogout}
                    onBack={viewStack.length > 1 ? handleBack : undefined}
                    onNotificationClick={handleNotificationClick}
                    notificationCount={notificationCount}
                    onSearchClick={() => setIsSearchOpen(true)}
                />
                <div className="flex-1 overflow-y-auto">
                    <div className="h-full pb-20 md:pb-6">
                        <ErrorBoundary key={`${viewStack.length}-${currentNavigation.view}`}>
                            <Suspense fallback={<DashboardSuspenseFallback />}>
                                <div key={`${viewStack.length}-${version}`} className="animate-slide-in-up h-full">
                                    {renderContent()}
                                </div>
                            </Suspense>
                        </ErrorBoundary>
                    </div>
                </div>
                {/* Mobile Bottom Nav - Hidden on desktop */}
                <div className="md:hidden">
                    <AdminBottomNav activeScreen={activeBottomNav} setActiveScreen={handleBottomNavClick} />
                </div>
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
        </div>
    );
};

export default AdminDashboard;
