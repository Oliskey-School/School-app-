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
const DashboardOverview = lazy(() => import('../admin/DashboardOverview'));
const AnalyticsScreen = lazy(() => import('../admin/AnalyticsScreen'));
const AnalyticsAdminTools = lazy(() => import('../admin/AnalyticsAdminTools'));
const ReportsScreen = lazy(() => import('../admin/ReportsScreen'));
const ClassListScreen = lazy(() => import('../admin/ClassListScreen'));
const StudentListScreen = lazy(() => import('../admin/StudentListScreen'));
const AddStudentScreen = lazy(() => import('../admin/AddStudentScreen'));
const TeacherListScreen = lazy(() => import('../admin/TeacherListScreen'));
const TeacherPerformanceScreen = lazy(() => import('../admin/TeacherPerformanceScreen'));
const TimetableGeneratorScreen = lazy(() => import('../admin/TimetableGeneratorScreen'));
const TimetableCreationPage = lazy(() => import('../admin/TimetableCreationPage'));
const TimetableEditor = lazy(() => import('../admin/TimetableEditor'));
const TeacherAttendanceScreen = lazy(() => import('../admin/TeacherAttendanceScreen'));
const TeacherAttendanceApproval = lazy(() => import('./TeacherAttendanceApproval'));
const FeeManagement = lazy(() => import('../admin/FeeManagement'));
const FeeDetailsScreen = lazy(() => import('../admin/FeeDetailsScreen'));
const ExamManagement = lazy(() => import('../admin/ExamManagement'));
const AddExamScreen = lazy(() => import('../admin/AddExamScreen'));
const ReportCardPublishing = lazy(() => import('../admin/ReportCardPublishing'));
const UserRolesScreen = lazy(() => import('../admin/UserRolesScreen'));
const AuditLogScreen = lazy(() => import('../admin/AuditLogScreen'));
const ProfileSettings = lazy(() => import('../admin/ProfileSettings'));
const CommunicationHub = lazy(() => import('../admin/CommunicationHub'));
const StudentProfileAdminView = lazy(() => import('../admin/StudentProfileDashboard'));
const IDCardManagement = lazy(() => import('../admin/IDCardManagement'));
const EditProfileScreen = lazy(() => import('../admin/EditProfileScreen'));
const NotificationsSettingsScreen = lazy(() => import('../admin/NotificationsSettingsScreen'));
const SecuritySettingsScreen = lazy(() => import('../admin/SecuritySettingsScreen'));
const ChangePasswordScreen = lazy(() => import('../admin/ChangePasswordScreen'));
const OnlineStoreScreen = lazy(() => import('../admin/OnlineStoreScreen'));
const AdminSelectClassForReport = lazy(() => import('../admin/AdminSelectClassForReport'));
const AdminStudentListForReport = lazy(() => import('../admin/AdminStudentListForReport'));
const AdminStudentReportCardScreen = lazy(() => import('../admin/AdminStudentReportCardScreen'));
const SystemSettingsScreen = lazy(() => import('../admin/SystemSettingsScreen'));
const AcademicSettingsScreen = lazy(() => import('../admin/AcademicSettingsScreen'));
const FinancialSettingsScreen = lazy(() => import('../admin/FinancialSettingsScreen'));
const CommunicationSettingsScreen = lazy(() => import('../admin/CommunicationSettingsScreen'));
const BrandingSettingsScreen = lazy(() => import('../admin/BrandingSettingsScreen'));
const PersonalSecuritySettingsScreen = lazy(() => import('../admin/PersonalSecuritySettingsScreen'));
const TeacherDetailAdminView = lazy(() => import('../admin/TeacherDetailAdminView'));
const TeacherAttendanceDetail = lazy(() => import('../admin/TeacherAttendanceDetail'));
const AttendanceOverviewScreen = lazy(() => import('../admin/AttendanceOverviewScreen'));
const ClassAttendanceDetailScreen = lazy(() => import('../admin/ClassAttendanceDetailScreen'));
const AdminSelectTermForReport = lazy(() => import('../admin/AdminSelectTermForReport'));
const HealthLogScreen = lazy(() => import('../admin/HealthLogScreen'));
const BusDutyRosterScreen = lazy(() => import('../admin/BusDutyRosterScreen'));
const SelectUserTypeToAddScreen = lazy(() => import('../admin/SelectUserTypeToAddScreen'));
const AddTeacherScreen = lazy(() => import('../admin/AddTeacherScreen'));
const AddParentScreen = lazy(() => import('../admin/AddParentScreen'));
const ParentListScreen = lazy(() => import('../admin/ParentListScreen'));
const ParentDetailAdminView = lazy(() => import('../admin/ParentDetailAdminView'));
const ManagePoliciesScreen = lazy(() => import('../admin/ManagePoliciesScreen'));
const ManageVolunteeringScreen = lazy(() => import('../admin/ManageVolunteeringScreen'));
const ManagePermissionSlipsScreen = lazy(() => import('./ManagePermissionSlipsScreen'));
const ManageLearningResourcesScreen = lazy(() => import('./ManageLearningResourcesScreen'));
const ManagePTAMeetingsScreen = lazy(() => import('../admin/ManagePTAMeetingsScreen'));
const SchoolOnboardingScreen = lazy(() => import('../admin/SchoolOnboardingScreen'));
const CurriculumSettingsScreen = lazy(() => import('../admin/CurriculumSettingsScreen'));
const StudentEnrollmentPage = lazy(() => import('../admin/StudentEnrollmentPage'));
const ExamCandidateRegistration = lazy(() => import('../admin/ExamCandidateRegistration'));
const UserAccountsScreen = lazy(() => import('../admin/UserAccountsScreen'));
const PermissionSlips = lazy(() => import('../shared/PermissionSlips'));
const MentalHealthResources = lazy(() => import('../shared/MentalHealthResources'));
const AccessibilitySettings = lazy(() => import('../shared/AccessibilitySettings'));
const SMSLessonManager = lazy(() => import('../admin/SMSLessonManager'));
const USSDWorkflow = lazy(() => import('../admin/USSDWorkflow'));
const RadioContentScheduler = lazy(() => import('../admin/RadioContentScheduler'));
const IVRLessonRecorder = lazy(() => import('../admin/IVRLessonRecorder'));
const ScholarshipManagement = lazy(() => import('../admin/ScholarshipManagement'));
const SponsorshipMatching = lazy(() => import('../admin/SponsorshipMatching'));
const ConferenceScheduling = lazy(() => import('../shared/ConferenceScheduling'));
const AttendanceHeatmap = lazy(() => import('../admin/AttendanceHeatmap'));
const FinanceDashboard = lazy(() => import('../admin/FinanceDashboard'));
const AcademicAnalytics = lazy(() => import('../admin/AcademicAnalytics'));
const BudgetPlanner = lazy(() => import('../admin/BudgetPlanner'));
const AuditTrailViewer = lazy(() => import('../admin/AuditTrailViewer'));
const IntegrationHub = lazy(() => import('../admin/IntegrationHub'));
const VendorManagement = lazy(() => import('../admin/VendorManagement'));
const AssetInventory = lazy(() => import('../admin/AssetInventory'));
const FacilityRegisterScreen = lazy(() => import('../admin/FacilityRegisterScreen'));
const EquipmentInventoryScreen = lazy(() => import('../admin/EquipmentInventoryScreen'));
const SafetyHealthLogs = lazy(() => import('../admin/SafetyHealthLogs'));
const ComplianceDashboard = lazy(() => import('../admin/ComplianceDashboard'));
const PrivacyDashboard = lazy(() => import('../admin/PrivacyDashboard'));
const ComplianceChecklist = lazy(() => import('../admin/ComplianceChecklist'));
const MaintenanceTickets = lazy(() => import('../admin/MaintenanceTickets'));
const MasterReportingHub = lazy(() => import('../admin/MasterReportingHub'));
const ValidationConsole = lazy(() => import('../admin/ValidationConsole'));
const PilotOnboardingPage = lazy(() => import('../admin/PilotOnboardingPage'));
const UnifiedGovernanceHub = lazy(() => import('../admin/UnifiedGovernanceHub'));
const EnhancedEnrollmentPage = lazy(() => import('../admin/EnhancedEnrollmentPage'));
const ComplianceOnboardingPage = lazy(() => import('../admin/ComplianceOnboardingPage'));
const StudentProfileEnhanced = lazy(() => import('../student/StudentProfileEnhanced'));
const TeacherProfileEnhanced = lazy(() => import('../teacher/TeacherProfileEnhanced'));
const CalendarScreen = lazy(() => import('../shared/CalendarScreen'));
const NotificationsScreen = lazy(() => import('../shared/NotificationsScreen'));
const GlobalSearchScreen = lazy(() => import('../shared/GlobalSearchScreen'));
const AdminResultsEntrySelector = lazy(() => import('../admin/AdminResultsEntrySelector'));
const ClassGradebookScreen = lazy(() => import('../teacher/ClassGradebookScreen'));
const ReportCardInputScreen = lazy(() => import('../teacher/ReportCardInputScreen'));
const ResultsEntryEnhanced = lazy(() => import('../teacher/ResultsEntryEnhanced'));
const AdminMessagesScreen = lazy(() => import('../admin/AdminMessagesScreen'));
const AdminNewChatScreen = lazy(() => import('../admin/AdminNewChatScreen'));
const ChatScreen = lazy(() => import('../shared/ChatScreen'));
const EmergencyAlert = lazy(() => import('../admin/EmergencyAlert'));
const InviteStaffScreen = lazy(() => import('../admin/InviteStaffScreen'));
const TimetableCreator = lazy(() => import('../admin/TimetableCreator'));
const StudentApprovalsScreen = lazy(() => import('./StudentApprovalsScreen'));
const AddBranchAdminScreen = lazy(() => import('./AddBranchAdminScreen'));
const AssignFeePage = lazy(() => import('../admin/AssignFeePage'));
const AdminActionsScreen = lazy(() => import('../admin/AdminActionsScreen'));
const SchoolManagementScreen = lazy(() => import('../admin/SchoolManagementScreen'));
const ClassFormScreen = lazy(() => import('../admin/ClassFormScreen'));
const RecordPaymentScreen = lazy(() => import('../admin/RecordPaymentScreen'));
const HostelManagementScreen = lazy(() => import('../admin/HostelManagementScreen'));
const TransportManagementScreen = lazy(() => import('../admin/TransportManagementScreen'));
const CustomReportBuilder = lazy(() => import('../admin/CustomReportBuilder'));
const BackupRestoreScreen = lazy(() => import('../admin/BackupRestoreScreen'));
const SessionManagementScreen = lazy(() => import('../admin/SessionManagementScreen'));
const BehaviorLogScreen = lazy(() => import('../admin/BehaviorLogScreen'));
const ConsentFormScreen = lazy(() => import('../admin/ConsentFormScreen'));
const AutoInvoiceGenerator = lazy(() => import('../admin/AutoInvoiceGenerator'));
const LateArrivalConfig = lazy(() => import('../admin/LateArrivalConfig'));
const DataExportScreen = lazy(() => import('../admin/DataExportScreen'));
const NotificationDigestSettings = lazy(() => import('../shared/NotificationDigestSettings'));
const ProjectBoardScreen = lazy(() => import('../shared/ProjectBoardScreen'));
const EnrollmentTrendsWidget = lazy(() => import('../admin/EnrollmentTrendsWidget'));
const ArrearsTracker = lazy(() => import('../admin/ArrearsTracker'));
const AwardPoints = lazy(() => import('../admin/AwardPoints'));
const ComplianceOfficerDashboard = lazy(() => import('../admin/ComplianceOfficerDashboard'));
const CounselorDashboard = lazy(() => import('../admin/CounselorDashboard'));
const CustomGamesListScreen = lazy(() => import('../admin/CustomGamesListScreen'));
const IDVerificationPanel = lazy(() => import('../admin/IDVerificationPanel'));
const LeaveApproval = lazy(() => import('../admin/LeaveApproval'));
const LeaveBalance = lazy(() => import('../admin/LeaveBalance'));
const PaymentHistory = lazy(() => import('../admin/PaymentHistory'));
const PaymentPlanModal = lazy(() => import('../admin/PaymentPlanModal'));
const PaymentRecording = lazy(() => import('../admin/PaymentRecording'));
const PayrollDashboard = lazy(() => import('../admin/PayrollDashboard'));
const PayslipGenerator = lazy(() => import('../admin/PayslipGenerator'));
const ReportCardPreview = lazy(() => import('../admin/ReportCardPreview'));
const ResourceUploadModal = lazy(() => import('../admin/ResourceUploadModal'));
const SalaryConfiguration = lazy(() => import('../admin/SalaryConfiguration'));
const SchoolInfoScreen = lazy(() => import('../admin/SchoolInfoScreen'));
const StudentApprovalScreen = lazy(() => import('../admin/StudentApprovalScreen'));
const StudentDetailReport = lazy(() => import('../admin/StudentDetailReport'));
const StudentProfileDashboard = lazy(() => import('../admin/StudentProfileDashboard'));
const SuperAdminDashboard = lazy(() => import('../admin/SuperAdminDashboard'));
const TimetableScreen = lazy(() => import('../admin/TimetableScreen'));
const UserSeeder = lazy(() => import('../admin/UserSeeder'));
const VisitorLog = lazy(() => import('../admin/VisitorLog'));

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
        return currentSchool?.id || profile?.schoolId || user?.user_metadata?.school_id || user?.app_metadata?.school_id;
    }, [currentSchool?.id, profile?.schoolId, user?.user_metadata?.school_id, user?.app_metadata?.school_id]);

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
        if ((window as any).__AUDIT_MODE__) {
            (window as any).ADMIN_NAVIGATE = navigateTo;
            (window as any).ADMIN_COMPONENTS = Object.keys(viewComponents);
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
