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
import { lazyWithRetry } from '../../lib/lazyRetry';

// Lazy load all admin screens
const DashboardOverview = lazyWithRetry(() => import('./DashboardOverview'));
const AnalyticsScreen = lazyWithRetry(() => import('./AnalyticsScreen'));
const AnalyticsAdminTools = lazyWithRetry(() => import('./AnalyticsAdminTools'));
const ReportsScreen = lazyWithRetry(() => import('./ReportsScreen'));
const ClassListScreen = lazyWithRetry(() => import('./ClassListScreen'));
const StudentListScreen = lazyWithRetry(() => import('./StudentListScreen'));
const AddStudentScreen = lazyWithRetry(() => import('./AddStudentScreen'));
const TeacherListScreen = lazyWithRetry(() => import('./TeacherListScreen'));
const TeacherPerformanceScreen = lazyWithRetry(() => import('./TeacherPerformanceScreen'));
const TimetableGeneratorScreen = lazyWithRetry(() => import('./TimetableGeneratorScreen'));
const TimetableCreationPage = lazyWithRetry(() => import('./TimetableCreationPage'));
const TimetableEditor = lazyWithRetry(() => import('./TimetableEditor'));
const TeacherAttendanceScreen = lazyWithRetry(() => import('./TeacherAttendanceScreen'));
const TeacherAttendanceApproval = lazyWithRetry(() => import('./TeacherAttendanceApproval'));
const FeeManagement = lazyWithRetry(() => import('./FeeManagement'));
const FeeDetailsScreen = lazyWithRetry(() => import('./FeeDetailsScreen'));
const ExamManagement = lazyWithRetry(() => import('./ExamManagement'));
const AddExamScreen = lazyWithRetry(() => import('./AddExamScreen'));
const ReportCardPublishing = lazyWithRetry(() => import('./ReportCardPublishing'));
const UserRolesScreen = lazyWithRetry(() => import('./UserRolesScreen'));
const AuditLogScreen = lazyWithRetry(() => import('./AuditLogScreen'));
const ProfileSettings = lazyWithRetry(() => import('./ProfileSettings'));
const CommunicationHub = lazyWithRetry(() => import('./CommunicationHub'));
const StudentProfileAdminView = lazyWithRetry(() => import('./StudentProfileDashboard'));
const IDCardManagement = lazyWithRetry(() => import('./IDCardManagement'));
const EditProfileScreen = lazyWithRetry(() => import('./EditProfileScreen'));
const NotificationsSettingsScreen = lazyWithRetry(() => import('./NotificationsSettingsScreen'));
const SecuritySettingsScreen = lazyWithRetry(() => import('./SecuritySettingsScreen'));
const ChangePasswordScreen = lazyWithRetry(() => import('./ChangePasswordScreen'));
const OnlineStoreScreen = lazyWithRetry(() => import('./OnlineStoreScreen'));
const AdminSelectClassForReport = lazyWithRetry(() => import('./AdminSelectClassForReport'));
const AdminStudentListForReport = lazyWithRetry(() => import('./AdminStudentListForReport'));
const AdminStudentReportCardScreen = lazyWithRetry(() => import('./AdminStudentReportCardScreen'));
const SystemSettingsScreen = lazyWithRetry(() => import('./SystemSettingsScreen'));
const AcademicSettingsScreen = lazyWithRetry(() => import('./AcademicSettingsScreen'));
const FinancialSettingsScreen = lazyWithRetry(() => import('./FinancialSettingsScreen'));
const CommunicationSettingsScreen = lazyWithRetry(() => import('./CommunicationSettingsScreen'));
const BrandingSettingsScreen = lazyWithRetry(() => import('./BrandingSettingsScreen'));
const PersonalSecuritySettingsScreen = lazyWithRetry(() => import('./PersonalSecuritySettingsScreen'));
const TeacherDetailAdminView = lazyWithRetry(() => import('./TeacherDetailAdminView'));
const TeacherAttendanceDetail = lazyWithRetry(() => import('./TeacherAttendanceDetail'));
const AttendanceOverviewScreen = lazyWithRetry(() => import('./AttendanceOverviewScreen'));
const ClassAttendanceDetailScreen = lazyWithRetry(() => import('./ClassAttendanceDetailScreen'));
const AdminSelectTermForReport = lazyWithRetry(() => import('./AdminSelectTermForReport'));
const HealthLogScreen = lazyWithRetry(() => import('./HealthLogScreen'));
const BusDutyRosterScreen = lazyWithRetry(() => import('./BusDutyRosterScreen'));
const SelectUserTypeToAddScreen = lazyWithRetry(() => import('./SelectUserTypeToAddScreen'));
const AddTeacherScreen = lazyWithRetry(() => import('./AddTeacherScreen'));
const AddParentScreen = lazyWithRetry(() => import('./AddParentScreen'));
const ParentListScreen = lazyWithRetry(() => import('./ParentListScreen'));
const ParentDetailAdminView = lazyWithRetry(() => import('./ParentDetailAdminView'));
const ManagePoliciesScreen = lazyWithRetry(() => import('./ManagePoliciesScreen'));
const ManageVolunteeringScreen = lazyWithRetry(() => import('./ManageVolunteeringScreen'));
const ManagePermissionSlipsScreen = lazyWithRetry(() => import('./ManagePermissionSlipsScreen'));
const ManageLearningResourcesScreen = lazyWithRetry(() => import('./ManageLearningResourcesScreen'));
const ManagePTAMeetingsScreen = lazyWithRetry(() => import('./ManagePTAMeetingsScreen'));
const SchoolOnboardingScreen = lazyWithRetry(() => import('./SchoolOnboardingScreen'));
const CurriculumSettingsScreen = lazyWithRetry(() => import('./CurriculumSettingsScreen'));
const StudentEnrollmentPage = lazyWithRetry(() => import('./StudentEnrollmentPage'));
const ExamCandidateRegistration = lazyWithRetry(() => import('./ExamCandidateRegistration'));
const UserAccountsScreen = lazyWithRetry(() => import('./UserAccountsScreen'));
const PermissionSlips = lazyWithRetry(() => import('../shared/PermissionSlips'));
const MentalHealthResources = lazyWithRetry(() => import('../shared/MentalHealthResources'));
const AccessibilitySettings = lazyWithRetry(() => import('../shared/AccessibilitySettings'));
const SMSLessonManager = lazyWithRetry(() => import('./SMSLessonManager'));
const USSDWorkflow = lazyWithRetry(() => import('./USSDWorkflow'));
const RadioContentScheduler = lazyWithRetry(() => import('./RadioContentScheduler'));
const IVRLessonRecorder = lazyWithRetry(() => import('./IVRLessonRecorder'));
const ScholarshipManagement = lazyWithRetry(() => import('./ScholarshipManagement'));
const SponsorshipMatching = lazyWithRetry(() => import('./SponsorshipMatching'));
const ConferenceScheduling = lazyWithRetry(() => import('../shared/ConferenceScheduling'));
const AttendanceHeatmap = lazyWithRetry(() => import('./AttendanceHeatmap'));
const FinanceDashboard = lazyWithRetry(() => import('./FinanceDashboard'));
const AcademicAnalytics = lazyWithRetry(() => import('./AcademicAnalytics'));
const BudgetPlanner = lazyWithRetry(() => import('./BudgetPlanner'));
const AuditTrailViewer = lazyWithRetry(() => import('./AuditTrailViewer'));
const IntegrationHub = lazyWithRetry(() => import('./IntegrationHub'));
const VendorManagement = lazyWithRetry(() => import('./VendorManagement'));
const AssetInventory = lazyWithRetry(() => import('./AssetInventory'));
const FacilityRegisterScreen = lazyWithRetry(() => import('./FacilityRegisterScreen'));
const EquipmentInventoryScreen = lazyWithRetry(() => import('./EquipmentInventoryScreen'));
const SafetyHealthLogs = lazyWithRetry(() => import('./SafetyHealthLogs'));
const ComplianceDashboard = lazyWithRetry(() => import('./ComplianceDashboard'));
const PrivacyDashboard = lazyWithRetry(() => import('./PrivacyDashboard'));
const ComplianceChecklist = lazyWithRetry(() => import('./ComplianceChecklist'));
const MaintenanceTickets = lazyWithRetry(() => import('./MaintenanceTickets'));
const MasterReportingHub = lazyWithRetry(() => import('./MasterReportingHub'));
const ValidationConsole = lazyWithRetry(() => import('./ValidationConsole'));
const PilotOnboardingPage = lazyWithRetry(() => import('./PilotOnboardingPage'));
const UnifiedGovernanceHub = lazyWithRetry(() => import('./UnifiedGovernanceHub'));
const EnhancedEnrollmentPage = lazyWithRetry(() => import('./EnhancedEnrollmentPage'));
const ComplianceOnboardingPage = lazyWithRetry(() => import('./ComplianceOnboardingPage'));
const StudentProfileEnhanced = lazyWithRetry(() => import('../student/StudentProfileEnhanced'));
const TeacherProfileEnhanced = lazyWithRetry(() => import('../teacher/TeacherProfileEnhanced'));
const CalendarScreen = lazyWithRetry(() => import('../shared/CalendarScreen'));
const NotificationsScreen = lazyWithRetry(() => import('../shared/NotificationsScreen'));
const GlobalSearchScreen = lazyWithRetry(() => import('../shared/GlobalSearchScreen'));
const AdminResultsEntrySelector = lazyWithRetry(() => import('./AdminResultsEntrySelector'));
const ClassGradebookScreen = lazyWithRetry(() => import('../teacher/ClassGradebookScreen'));
const ReportCardInputScreen = lazyWithRetry(() => import('../teacher/ReportCardInputScreen'));
const ResultsEntryEnhanced = lazyWithRetry(() => import('../teacher/ResultsEntryEnhanced'));
const AdminMessagesScreen = lazyWithRetry(() => import('./AdminMessagesScreen'));
const AdminNewChatScreen = lazyWithRetry(() => import('./AdminNewChatScreen'));
const ChatScreen = lazyWithRetry(() => import('../shared/ChatScreen'));
const EmergencyAlert = lazyWithRetry(() => import('./EmergencyAlert'));
const InviteStaffScreen = lazyWithRetry(() => import('./InviteStaffScreen'));
const TimetableCreator = lazyWithRetry(() => import('./TimetableCreator'));
const StudentApprovalsScreen = lazyWithRetry(() => import('./StudentApprovalsScreen'));
const AddBranchAdminScreen = lazyWithRetry(() => import('./AddBranchAdminScreen'));
const AssignFeePage = lazyWithRetry(() => import('./AssignFeePage'));
const AdminActionsScreen = lazyWithRetry(() => import('./AdminActionsScreen'));
const SchoolManagementScreen = lazyWithRetry(() => import('./SchoolManagementScreen'));
const ClassFormScreen = lazyWithRetry(() => import('./ClassFormScreen'));
const RecordPaymentScreen = lazyWithRetry(() => import('./RecordPaymentScreen'));
const HostelManagementScreen = lazyWithRetry(() => import('./HostelManagementScreen'));
const TransportManagementScreen = lazyWithRetry(() => import('./TransportManagementScreen'));
const CustomReportBuilder = lazyWithRetry(() => import('./CustomReportBuilder'));
const BackupRestoreScreen = lazyWithRetry(() => import('./BackupRestoreScreen'));
const SessionManagementScreen = lazyWithRetry(() => import('./SessionManagementScreen'));
const BehaviorLogScreen = lazyWithRetry(() => import('./BehaviorLogScreen'));
const ConsentFormScreen = lazyWithRetry(() => import('./ConsentFormScreen'));
const AutoInvoiceGenerator = lazyWithRetry(() => import('./AutoInvoiceGenerator'));
const LateArrivalConfig = lazyWithRetry(() => import('./LateArrivalConfig'));
const DataExportScreen = lazyWithRetry(() => import('./DataExportScreen'));
const NotificationDigestSettings = lazyWithRetry(() => import('../shared/NotificationDigestSettings'));
const ProjectBoardScreen = lazyWithRetry(() => import('../shared/ProjectBoardScreen'));
const EnrollmentTrendsWidget = lazyWithRetry(() => import('./EnrollmentTrendsWidget'));
const ArrearsTracker = lazyWithRetry(() => import('./ArrearsTracker'));
const AwardPoints = lazyWithRetry(() => import('./AwardPoints'));
const ComplianceOfficerDashboard = lazyWithRetry(() => import('./ComplianceOfficerDashboard'));
const CounselorDashboard = lazyWithRetry(() => import('./CounselorDashboard'));
const CustomGamesListScreen = lazyWithRetry(() => import('./CustomGamesListScreen'));
const IDVerificationPanel = lazyWithRetry(() => import('./IDVerificationPanel'));
const LeaveApproval = lazyWithRetry(() => import('./LeaveApproval'));
const LeaveBalance = lazyWithRetry(() => import('./LeaveBalance'));
const PaymentHistory = lazyWithRetry(() => import('./PaymentHistory'));
const PaymentPlanModal = lazyWithRetry(() => import('./PaymentPlanModal'));
const PaymentRecording = lazyWithRetry(() => import('./PaymentRecording'));
const PayrollDashboard = lazyWithRetry(() => import('./PayrollDashboard'));
const PayslipGenerator = lazyWithRetry(() => import('./PayslipGenerator'));
const ReportCardPreview = lazyWithRetry(() => import('./ReportCardPreview'));
const ResourceUploadModal = lazyWithRetry(() => import('./ResourceUploadModal'));
const SalaryConfiguration = lazyWithRetry(() => import('./SalaryConfiguration'));
const SchoolInfoScreen = lazyWithRetry(() => import('./SchoolInfoScreen'));
const StudentApprovalScreen = lazyWithRetry(() => import('./StudentApprovalScreen'));
const StudentDetailReport = lazyWithRetry(() => import('./StudentDetailReport'));
const StudentProfileDashboard = lazyWithRetry(() => import('./StudentProfileDashboard'));
const SuperAdminDashboard = lazyWithRetry(() => import('./SuperAdminDashboard'));
const TimetableScreen = lazyWithRetry(() => import('./TimetableScreen'));
const UserSeeder = lazyWithRetry(() => import('./UserSeeder'));
const VisitorLog = lazyWithRetry(() => import('./VisitorLog'));
const VersionSettings = lazyWithRetry(() => import('./VersionSettings'));

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
    const [activeBottomNav, setActiveBottomNav] = useState(() => {
        return sessionStorage.getItem('admin_activeBottomNav') || 'home';
    });
    const [viewStack, setViewStack] = useState<ViewStackItem[]>(() => {
        const saved = sessionStorage.getItem('admin_viewStack');
        return saved ? JSON.parse(saved) : [{ view: 'overview', props: {}, title: 'Admin Dashboard' }];
    });
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
        // Persist view stack and active nav
        sessionStorage.setItem('admin_viewStack', JSON.stringify(viewStack));
        sessionStorage.setItem('admin_activeBottomNav', activeBottomNav);
    }, [viewStack, isSearchOpen, setIsHomePage, activeBottomNav]);

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
        versionSettings: VersionSettings,
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
