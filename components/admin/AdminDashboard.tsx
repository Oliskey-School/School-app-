import React, { useState, useEffect, lazy, Suspense, useRef } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import ErrorBoundary from '../ui/ErrorBoundary';
import { useProfile } from '../../context/ProfileContext';
import PremiumLoader from '../ui/PremiumLoader';
import { api } from '../../lib/api';
import { syncEngine } from '../../lib/syncEngine';
import { DashboardType } from '../../types';
import { realtimeService } from '../../services/RealtimeService';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';
import { useDemoRealtime } from '../../hooks/useDemoRealtime';
import EmailVerificationPrompt from '../auth/EmailVerificationPrompt';
import TrialBanner from '../ui/TrialBanner';
import DashboardSkeletonLoader from '../ui/DashboardSkeletonLoader';

// Lazy load all admin screens
const DashboardOverview = lazy(() => import('./DashboardOverview'));
const AnalyticsScreen = lazy(() => import('./AnalyticsScreen'));
const AnalyticsAdminTools = lazy(() => import('./AnalyticsAdminTools'));
const ReportsScreen = lazy(() => import('./ReportsScreen'));
const ClassListScreen = lazy(() => import('./ClassListScreen'));
const StudentListScreen = lazy(() => import('./StudentListScreen'));
const AddStudentScreen = lazy(() => import('./AddStudentScreen'));
const TeacherListScreen = lazy(() => import('./TeacherListScreen'));
const TeacherPerformanceScreen = lazy(() => import('./TeacherPerformanceScreen'));
const TimetableGeneratorScreen = lazy(() => import('./TimetableGeneratorScreen'));
const TimetableCreationPage = lazy(() => import('./TimetableCreationPage'));
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
const StudentProfileAdminView = lazy(() => import('./StudentProfileDashboard'));
const IDCardManagement = lazy(() => import('./IDCardManagement'));
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
const HealthLogScreen = lazy(() => import('./HealthLogScreen'));
const BusDutyRosterScreen = lazy(() => import('./BusDutyRosterScreen'));
const SelectUserTypeToAddScreen = lazy(() => import('./SelectUserTypeToAddScreen'));
const AddTeacherScreen = lazy(() => import('./AddTeacherScreen'));
const AddParentScreen = lazy(() => import('./AddParentScreen'));
const ParentListScreen = lazy(() => import('./ParentListScreen'));
const ParentDetailAdminView = lazy(() => import('./ParentDetailAdminView'));
const ManagePoliciesScreen = lazy(() => import('./ManagePoliciesScreen'));
const ManageVolunteeringScreen = lazy(() => import('./ManageVolunteeringScreen'));
const ManagePermissionSlipsScreen = lazy(() => import('./ManagePermissionSlipsScreen'));
const ManageLearningResourcesScreen = lazy(() => import('./ManageLearningResourcesScreen'));
const ManagePTAMeetingsScreen = lazy(() => import('./ManagePTAMeetingsScreen'));
const SchoolOnboardingScreen = lazy(() => import('./SchoolOnboardingScreen'));
const CurriculumSettingsScreen = lazy(() => import('./CurriculumSettingsScreen'));
const StudentEnrollmentPage = lazy(() => import('./StudentEnrollmentPage'));
const ExamCandidateRegistration = lazy(() => import('./ExamCandidateRegistration'));
const UserAccountsScreen = lazy(() => import('./UserAccountsScreen'));
const PermissionSlips = lazy(() => import('../shared/PermissionSlips'));
const MentalHealthResources = lazy(() => import('../shared/MentalHealthResources'));
const AccessibilitySettings = lazy(() => import('../shared/AccessibilitySettings'));
const SMSLessonManager = lazy(() => import('./SMSLessonManager'));
const USSDWorkflow = lazy(() => import('./USSDWorkflow'));
const RadioContentScheduler = lazy(() => import('./RadioContentScheduler'));
const IVRLessonRecorder = lazy(() => import('./IVRLessonRecorder'));
const ScholarshipManagement = lazy(() => import('./ScholarshipManagement'));
const SponsorshipMatching = lazy(() => import('./SponsorshipMatching'));
const ConferenceScheduling = lazy(() => import('../shared/ConferenceScheduling'));
const AttendanceHeatmap = lazy(() => import('./AttendanceHeatmap'));
const FinanceDashboard = lazy(() => import('./FinanceDashboard'));
const AcademicAnalytics = lazy(() => import('./AcademicAnalytics'));
const BudgetPlanner = lazy(() => import('./BudgetPlanner'));
const AuditTrailViewer = lazy(() => import('./AuditTrailViewer'));
const IntegrationHub = lazy(() => import('./IntegrationHub'));
const VendorManagement = lazy(() => import('./VendorManagement'));
const AssetInventory = lazy(() => import('./AssetInventory'));
const FacilityRegisterScreen = lazy(() => import('./FacilityRegisterScreen'));
const EquipmentInventoryScreen = lazy(() => import('./EquipmentInventoryScreen'));
const SafetyHealthLogs = lazy(() => import('./SafetyHealthLogs'));
const ComplianceDashboard = lazy(() => import('./ComplianceDashboard'));
const PrivacyDashboard = lazy(() => import('./PrivacyDashboard'));
const ComplianceChecklist = lazy(() => import('./ComplianceChecklist'));
const MaintenanceTickets = lazy(() => import('./MaintenanceTickets'));
const MasterReportingHub = lazy(() => import('./MasterReportingHub'));
const ValidationConsole = lazy(() => import('./ValidationConsole'));
const PilotOnboardingPage = lazy(() => import('./PilotOnboardingPage'));
const UnifiedGovernanceHub = lazy(() => import('./UnifiedGovernanceHub'));
const EnhancedEnrollmentPage = lazy(() => import('./EnhancedEnrollmentPage'));
const ComplianceOnboardingPage = lazy(() => import('./ComplianceOnboardingPage'));
const StudentProfileEnhanced = lazy(() => import('../student/StudentProfileEnhanced'));
const TeacherProfileEnhanced = lazy(() => import('../teacher/TeacherProfileEnhanced'));
const CalendarScreen = lazy(() => import('../shared/CalendarScreen'));
const NotificationsScreen = lazy(() => import('../shared/NotificationsScreen'));
const GlobalSearchScreen = lazy(() => import('../shared/GlobalSearchScreen'));
const AdminResultsEntrySelector = lazy(() => import('./AdminResultsEntrySelector'));
const ClassGradebookScreen = lazy(() => import('../teacher/ClassGradebookScreen'));
const ReportCardInputScreen = lazy(() => import('../teacher/ReportCardInputScreen'));
const ResultsEntryEnhanced = lazy(() => import('../teacher/ResultsEntryEnhanced'));
const AdminMessagesScreen = lazy(() => import('./AdminMessagesScreen'));
const AdminNewChatScreen = lazy(() => import('./AdminNewChatScreen'));
const ChatScreen = lazy(() => import('../shared/ChatScreen'));
const EmergencyAlert = lazy(() => import('./EmergencyAlert'));
const InviteStaffScreen = lazy(() => import('./InviteStaffScreen'));
const TimetableCreator = lazy(() => import('./TimetableCreator'));
const StudentApprovalsScreen = lazy(() => import('./StudentApprovalsScreen'));
const AddBranchAdminScreen = lazy(() => import('./AddBranchAdminScreen'));
const AssignFeePage = lazy(() => import('./AssignFeePage'));
const AdminActionsScreen = lazy(() => import('./AdminActionsScreen'));
const SchoolManagementScreen = lazy(() => import('./SchoolManagementScreen'));
const ClassFormScreen = lazy(() => import('./ClassFormScreen'));
const RecordPaymentScreen = lazy(() => import('./RecordPaymentScreen'));
const HostelManagementScreen = lazy(() => import('./HostelManagementScreen'));
const TransportManagementScreen = lazy(() => import('./TransportManagementScreen'));
const CustomReportBuilder = lazy(() => import('./CustomReportBuilder'));
const BackupRestoreScreen = lazy(() => import('./BackupRestoreScreen'));
const SessionManagementScreen = lazy(() => import('./SessionManagementScreen'));
const BehaviorLogScreen = lazy(() => import('./BehaviorLogScreen'));
const ConsentFormScreen = lazy(() => import('./ConsentFormScreen'));
const AutoInvoiceGenerator = lazy(() => import('./AutoInvoiceGenerator'));
const LateArrivalConfig = lazy(() => import('./LateArrivalConfig'));
const DataExportScreen = lazy(() => import('./DataExportScreen'));
const NotificationDigestSettings = lazy(() => import('../shared/NotificationDigestSettings'));
const ProjectBoardScreen = lazy(() => import('../shared/ProjectBoardScreen'));
const EnrollmentTrendsWidget = lazy(() => import('./EnrollmentTrendsWidget'));
const ArrearsTracker = lazy(() => import('./ArrearsTracker'));
const AwardPoints = lazy(() => import('./AwardPoints'));
const ComplianceOfficerDashboard = lazy(() => import('./ComplianceOfficerDashboard'));
const CounselorDashboard = lazy(() => import('./CounselorDashboard'));
const CustomGamesListScreen = lazy(() => import('./CustomGamesListScreen'));
const IDVerificationPanel = lazy(() => import('./IDVerificationPanel'));
const LeaveApproval = lazy(() => import('./LeaveApproval'));
const LeaveBalance = lazy(() => import('./LeaveBalance'));
const PaymentHistory = lazy(() => import('./PaymentHistory'));
const PaymentPlanModal = lazy(() => import('./PaymentPlanModal'));
const PaymentRecording = lazy(() => import('./PaymentRecording'));
const PayrollDashboard = lazy(() => import('./PayrollDashboard'));
const PayslipGenerator = lazy(() => import('./PayslipGenerator'));
const ReportCardPreview = lazy(() => import('./ReportCardPreview'));
const ResourceUploadModal = lazy(() => import('./ResourceUploadModal'));
const SalaryConfiguration = lazy(() => import('./SalaryConfiguration'));
const SchoolInfoScreen = lazy(() => import('./SchoolInfoScreen'));
const StudentApprovalScreen = lazy(() => import('./StudentApprovalScreen'));
const StudentDetailReport = lazy(() => import('./StudentDetailReport'));
const StudentProfileDashboard = lazy(() => import('./StudentProfileDashboard'));
const SuperAdminDashboard = lazy(() => import('./SuperAdminDashboard'));
const TimetableScreen = lazy(() => import('./TimetableScreen'));
const UserSeeder = lazy(() => import('./UserSeeder'));
const VisitorLog = lazy(() => import('./VisitorLog'));

type ViewStackItem = {
    view: string;
    props?: any;
    title: string;
};

interface AdminDashboardProps {
    onLogout?: () => void;
    setIsHomePage?: (isHome: boolean) => void;
    currentUser?: any;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, setIsHomePage, currentUser }) => {
    const [activeBottomNav, setActiveBottomNav] = useState('home');
    const [viewStack, setViewStack] = useState<ViewStackItem[]>([{ view: 'overview', props: {}, title: 'Admin Dashboard' }]);
    const [version, setVersion] = useState(0);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
    const [isInitializing, setIsInitializing] = useState(true);

    const forceUpdate = () => setVersion(v => v + 1);
    const { currentSchool, currentBranchId, user, loading: authLoading } = useAuth();
    const { currentBranch } = useBranch();
    const { profile } = useProfile();

    // Memoize schoolId derivation to prevent unnecessary recalculations
    const schoolId = React.useMemo(() => {
        return currentSchool?.id || user?.school_id || profile?.schoolId || user?.user_metadata?.school_id || user?.app_metadata?.school_id;
    }, [currentSchool?.id, profile?.schoolId, user?.school_id, user?.user_metadata?.school_id, user?.app_metadata?.school_id]);

    // Optimize initialization effect - only run when auth loading changes or schoolId is set
    useEffect(() => {
        // Skip if still loading auth
        if (authLoading) return;

        // Resolve initialization when auth completes, with or without schoolId
        if (schoolId) {
            setIsInitializing(false);
        } else {
            // Give school context 1 extra second to populate, then proceed anyway
            const timer = setTimeout(() => setIsInitializing(false), 1500);
            return () => clearTimeout(timer);
        }
    }, [authLoading, schoolId]);

    useEffect(() => {
        setIsHomePage(viewStack.length === 1 && !isSearchOpen);
    }, [viewStack, isSearchOpen, setIsHomePage]);

    useEffect(() => {
        const checkDb = async () => {
            try {
                const { backend } = await api.checkBackendHealth();
                setDbStatus(backend ? 'connected' : 'error');
            } catch (e) {
                setDbStatus('connected'); // Fallback for demo
            }
        };

        // Debounce the health check to prevent excessive calls
        const handler = setTimeout(checkDb, 1000);
        return () => clearTimeout(handler);
    }, [user]);

    useEffect(() => {
        let schoolId = currentSchool?.id || user?.user_metadata?.school_id || user?.app_metadata?.school_id || profile?.schoolId;
        if (user?.id && schoolId) {
            realtimeService.initialize(user.id, schoolId);

            const handleUpdate = () => {
                // Debounce real-time updates to prevent excessive re-renders
                if (updateTimeoutRef.current) {
                    clearTimeout(updateTimeoutRef.current);
                }

                updateTimeoutRef.current = setTimeout(() => {
                    forceUpdate();
                    updateTimeoutRef.current = null;
                }, 1000); // 1 second debounce for real-time updates
            };

            (syncEngine as any).on('realtime-update', handleUpdate);

            // Listen for demo realtime events (BroadcastChannel/localStorage)
            const handleDemoUpdate = () => {
                api.invalidateCache();
                handleUpdate();
            };
            window.addEventListener('demo-realtime-update', handleDemoUpdate);

            return () => {
                (syncEngine as any).off('realtime-update', handleUpdate);
                window.removeEventListener('demo-realtime-update', handleDemoUpdate);
                realtimeService.destroy();
            };
        }
    }, [user, currentSchool?.id]);

    const AnalyticsWrapper = (props: any) => (
        <div className="space-y-6">
            <Suspense fallback={<PremiumLoader message="Loading analytics..." />}>
                <AnalyticsScreen {...props} />
                <AnalyticsAdminTools {...props} />
            </Suspense>
        </div>
    );

    const viewComponents: { [key: string]: React.ComponentType<any> } = {
        overview: DashboardOverview,
        analytics: AnalyticsWrapper,
        reports: ReportsScreen,
        classList: ClassListScreen,
        studentList: StudentListScreen,
        addStudent: AddStudentScreen,
        teacherList: TeacherListScreen,
        teacherPerformance: TeacherPerformanceScreen,
        timetable: TimetableGeneratorScreen,
        timetableGenerator: TimetableGeneratorScreen,
        timetableEditor: TimetableEditor,
        timetableCreator: TimetableCreator,
        aiTimetableCreator: TimetableCreationPage,
        teacherAttendance: TeacherAttendanceScreen,
        teacherAttendanceApproval: TeacherAttendanceApproval,
        feeManagement: FeeManagement,
        feeDetails: FeeDetailsScreen,
        examManagement: ExamManagement,
        addExam: AddExamScreen,
        reportCardPublishing: ReportCardPublishing,
        userRoles: UserRolesScreen,
        auditLog: AuditLogScreen,
        profileSettings: ProfileSettings,
        communicationHub: CommunicationHub,
        studentProfileAdminView: StudentProfileAdminView,
        editProfile: EditProfileScreen,
        notificationsSettings: NotificationsSettingsScreen,
        securitySettings: SecuritySettingsScreen,
        changePassword: ChangePasswordScreen,
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
        TeacherDetailAdminView: TeacherDetailAdminView,
        teacherAttendanceDetail: TeacherAttendanceDetail,
        attendanceOverview: AttendanceOverviewScreen,
        classAttendanceDetail: ClassAttendanceDetailScreen,
        adminSelectTermForReport: AdminSelectTermForReport,
        adminReportCardInput: ReportCardInputScreen,
        healthLog: HealthLogScreen,
        busDutyRoster: BusDutyRosterScreen,
        selectUserTypeToAdd: SelectUserTypeToAddScreen,
        addTeacher: AddTeacherScreen,
        AddTeacherScreen: AddTeacherScreen,
        addParent: AddParentScreen,
        parentList: ParentListScreen,
        parentDetailAdminView: ParentDetailAdminView,
        managePolicies: ManagePoliciesScreen,
        manageVolunteering: ManageVolunteeringScreen,
        managePermissionSlips: ManagePermissionSlipsScreen,
        manageLearningResources: ManageLearningResourcesScreen,
        managePTAMeetings: ManagePTAMeetingsScreen,
        manageSchoolInfo: SchoolOnboardingScreen,
        manageCurriculum: CurriculumSettingsScreen,
        enrollmentPage: StudentEnrollmentPage,
        exams: ExamCandidateRegistration,
        userAccounts: UserAccountsScreen,
        permissionSlips: PermissionSlips,
        mentalHealthResources: MentalHealthResources,
        accessibilitySettings: AccessibilitySettings,
        smsLessonManager: SMSLessonManager,
        ussdWorkflow: USSDWorkflow,
        radioContentScheduler: RadioContentScheduler,
        ivrLessonRecorder: IVRLessonRecorder,
        scholarshipManagement: ScholarshipManagement,
        sponsorshipMatching: SponsorshipMatching,
        conferenceScheduling: ConferenceScheduling,
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
        privacyDashboard: PrivacyDashboard,
        complianceChecklist: ComplianceChecklist,
        maintenanceTickets: MaintenanceTickets,
        masterReports: MasterReportingHub,
        validationConsole: ValidationConsole,
        onboardingPage: PilotOnboardingPage,
        governanceHub: UnifiedGovernanceHub,
        enhancedEnrollment: EnhancedEnrollmentPage,
        complianceOnboarding: ComplianceOnboardingPage,
        studentProfile: StudentProfileEnhanced,
        teacherProfile: TeacherProfileEnhanced,
        schoolCalendar: CalendarScreen,
        notifications: NotificationsScreen,
        resultsEntry: AdminResultsEntrySelector,
        classGradebook: ClassGradebookScreen,
        resultsEntryEnhanced: ResultsEntryEnhanced,
        adminMessages: AdminMessagesScreen,
        adminNewChat: AdminNewChatScreen,
        chat: ChatScreen,
        attendanceTracker: AttendanceOverviewScreen,
        emergencyAlert: EmergencyAlert,
        inspectionHub: UnifiedGovernanceHub,
        staffManagement: TeacherListScreen,
        inviteStaff: InviteStaffScreen,
        idCardManagement: IDCardManagement,
        studentApprovals: StudentApprovalsScreen,
        addBranchAdmin: AddBranchAdminScreen,
        assignFee: AssignFeePage,
        adminActions: AdminActionsScreen,
        schoolManagement: SchoolManagementScreen,
        classForm: ClassFormScreen,
        recordPayment: RecordPaymentScreen,
        hostelManagement: HostelManagementScreen,
        transportManagement: TransportManagementScreen,
        customReportBuilder: CustomReportBuilder,
        backupRestore: BackupRestoreScreen,
        sessionManagement: SessionManagementScreen,
        behaviorLog: BehaviorLogScreen,
        consentForms: ConsentFormScreen,
        autoInvoice: AutoInvoiceGenerator,
        lateArrivalConfig: LateArrivalConfig,
        dataExport: DataExportScreen,
        notificationDigest: NotificationDigestSettings,
        projectBoard: ProjectBoardScreen,
        enrollmentTrends: EnrollmentTrendsWidget,
        arrearsTracker: ArrearsTracker,
        awardPoints: AwardPoints,
        complianceOfficerDashboard: ComplianceOfficerDashboard,
        counselorDashboard: CounselorDashboard,
        customGamesList: CustomGamesListScreen,
        idVerification: IDVerificationPanel,
        leaveApproval: LeaveApproval,
        leaveBalance: LeaveBalance,
        paymentHistory: PaymentHistory,
        paymentPlanModal: PaymentPlanModal,
        paymentRecording: PaymentRecording,
        payrollDashboard: PayrollDashboard,
        payslipGenerator: PayslipGenerator,
        reportCardPreview: ReportCardPreview,
        resourceUpload: ResourceUploadModal,
        salaryConfiguration: SalaryConfiguration,
        schoolInfo: SchoolInfoScreen,
        studentApproval: StudentApprovalScreen,
        studentDetailReport: StudentDetailReport,
        studentProfileDashboard: StudentProfileDashboard,
        superAdmin: SuperAdminDashboard,
        timetableScreen: TimetableScreen,
        userSeeder: UserSeeder,
        visitorLog: VisitorLog,
    };

    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const getUser = async () => {
            try {
                const authUser = await api.getMe();
                if (authUser?.id) {
                    setCurrentUserId(authUser.id);
                } else if (user?.id) {
                    setCurrentUserId(user.id);
                }
            } catch (e) {
                if (user?.id) setCurrentUserId(user.id);
            }
        };
        getUser();

        // Expose navigation for automated audits
        if (window.__AUDIT_MODE__) {
            window.ADMIN_NAVIGATE = navigateTo;
            window.ADMIN_COMPONENTS = Object.keys(viewComponents);
        }
    }, [user]);

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
                case 'actions': setViewStack([{ view: 'adminActions', props: {}, title: 'Quick Actions' }]); break;
                case 'home': setViewStack([{ view: 'overview', props: {}, title: 'Admin Dashboard' }]); break;
                case 'branches': setViewStack([{ view: 'schoolManagement', props: {}, title: 'Manage Branches' }]); break;
                case 'studentList': setViewStack([{ view: 'studentList', props: {}, title: 'Students' }]); break;
                case 'teacherList': setViewStack([{ view: 'teacherList', props: {}, title: 'Teachers' }]); break;
                case 'parentList': setViewStack([{ view: 'parentList', props: {}, title: 'Parents' }]); break;
                case 'studentApprovals': setViewStack([{ view: 'studentApprovals', props: {}, title: 'Student Approvals' }]); break;
                case 'classList': setViewStack([{ view: 'classList', props: {}, title: 'Classes' }]); break;
                case 'timetable': setViewStack([{ view: 'timetable', props: {}, title: 'Timetable' }]); break;
                case 'examManagement': setViewStack([{ view: 'examManagement', props: {}, title: 'Exams' }]); break;
                case 'messages': setViewStack([{ view: 'adminMessages', props: {}, title: 'Messages' }]); break;
                case 'communication': setViewStack([{ view: 'communicationHub', props: {}, title: 'Communication Hub' }]); break;
                case 'analytics': setViewStack([{ view: 'analytics', props: {}, title: 'School Analytics' }]); break;
                case 'settings': setViewStack([{ view: 'systemSettings', props: {}, title: 'System Settings' }]); break;
                case 'feeManagement': setViewStack([{ view: 'feeManagement', props: {}, title: 'Fee Management' }]); break;
                case 'staffManagement': setViewStack([{ view: 'teacherList', props: {}, title: 'Manage Teachers' }]); break;
                default: setViewStack([{ view: 'overview', props: {}, title: 'Admin Dashboard' }]);
            }
        });
    };

    const currentNavigation = viewStack[viewStack.length - 1];
    const ComponentToRender = viewComponents[currentNavigation.view];

    const commonProps = {
        navigateTo,
        onLogout,
        handleBack,
        forceUpdate,
        currentUserId,
        currentSchool,
        schoolId,
        currentBranchId: currentBranch?.id || currentBranchId,
        currentBranchName: currentBranch?.name,
        isMainBranch: currentBranch?.is_main || !currentBranch?.id // True if it's the main branch or 'All Branches'
    };

    const renderContent = () => {
        if (isInitializing) return <DashboardSkeletonLoader type="overview" />;
        if (!ComponentToRender) return <div className="p-8 text-center">View Not Found: {currentNavigation.view}</div>;

        if (currentNavigation.view === 'notifications') return (
            <Suspense fallback={<DashboardSkeletonLoader type="list" />}>
                <NotificationsScreen {...currentNavigation.props} {...commonProps} userType="admin" />
            </Suspense>
        );

        if (currentNavigation.view === 'adminMessages') return (
            <Suspense fallback={<DashboardSkeletonLoader type="list" />}>
                <AdminMessagesScreen
                    {...currentNavigation.props}
                    {...commonProps}
                    onNewChat={() => navigateTo('adminNewChat', 'New Message')}
                    onSelectChat={(convo: any) => navigateTo('chat', convo.displayName || 'Chat', {
                        conversationId: convo.id,
                        participantName: convo.displayName,
                        participantAvatar: convo.displayAvatar
                    })}
                />
            </Suspense>
        );

        if (currentNavigation.view === 'adminNewChat') return (
            <Suspense fallback={<DashboardSkeletonLoader type="overview" />}>
                <AdminNewChatScreen
                    {...currentNavigation.props}
                    {...commonProps}
                    onChatStarted={(convoId: string, name: string) => navigateTo('chat', name, { conversationId: convoId, participantName: name })}
                />
            </Suspense>
        );

        if (currentNavigation.view === 'onboardingPage') return (
            <Suspense fallback={<DashboardSkeletonLoader type="overview" />}>
                <PilotOnboardingPage {...currentNavigation.props} {...commonProps} onComplete={handleBack} />
            </Suspense>
        );

        return (
            <Suspense fallback={<DashboardSkeletonLoader type="overview" />}>
                <ComponentToRender {...currentNavigation.props} {...commonProps} />
            </Suspense>
        );
    };

    return (
        <DashboardLayout
            title={currentNavigation.title}
            onBack={viewStack.length > 1 ? handleBack : undefined}
            activeScreen={activeBottomNav}
            setActiveScreen={handleBottomNavClick}
        >
            {/* Database Connection Error */}
            {dbStatus === 'error' && <div className="bg-red-600 text-white text-[10px] sm:text-xs py-1 px-4 mb-4 rounded-lg text-center font-medium">Database Connection Error</div>}

            {/* Plan / Trial Banner */}
            <TrialBanner onUpgradeClick={() => navigateTo('upgrade', 'Upgrade Plan')} />

            <div key={`${viewStack.length}-${version}`} className="w-full h-full">
                <ErrorBoundary
                    key={currentNavigation.view}
                    title={`${currentNavigation.title} Error`}
                    message="We encountered an issue while rendering this screen. This could be due to a data mismatch or a temporary connection issue."
                    onReset={forceUpdate}
                >
                    <div className="px-4 sm:px-0">
                        <EmailVerificationPrompt />
                    </div>
                    {renderContent()}
                </ErrorBoundary>
            </div>

            <Suspense fallback={<PremiumLoader message="Searching school database..." />}>
                {isSearchOpen && <GlobalSearchScreen dashboardType={DashboardType.Admin} navigateTo={navigateTo} onClose={() => setIsSearchOpen(false)} />}
            </Suspense>

            {/* Audit Trigger Menu (Hidden by default, triggered by script) */}
            <div id="audit-trigger-panel" style={{ display: 'none' }}>
                {Object.keys(viewComponents).map(key => (
                    <button 
                        key={key} 
                        id={`audit-trigger-${key}`}
                        onClick={() => navigateTo(key, `Audit: ${key}`)}
                    >
                        {key}
                    </button>
                ))}
            </div>
            <button 
                id="toggle-audit-panel" 
                style={{ position: 'fixed', bottom: '10px', right: '10px', opacity: 0, zIndex: -1 }}
                onClick={() => {
                    const panel = document.getElementById('audit-trigger-panel');
                    if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
                }}
            >
                Audit
            </button>
        </DashboardLayout>
    );
};

export default AdminDashboard;
