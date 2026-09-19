import React, { useState, useEffect, lazy, Suspense, useRef } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import ErrorBoundary from '../ui/ErrorBoundary';
import { MainAdminOnly } from '../shared/MainAdminOnly';
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
import DashboardSkeletonLoader from '../ui/DashboardSkeletonLoader';
import { lazyWithRetry } from '../../lib/lazyRetry';
import { useDashboardRouting } from '../../hooks/useDashboardRouting';

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
const TimetableDeskBuilder = lazyWithRetry(() => import('./TimetableDeskBuilder'));
const TimetableEditor = lazyWithRetry(() => import('./TimetableEditor'));
const TeacherAttendanceScreen = lazyWithRetry(() => import('./TeacherAttendanceScreen'));
const ClassroomManagementScreen = lazyWithRetry(() => import('./ClassroomManagementScreen'));
const TeacherPersonnelFileScreen = lazyWithRetry(() => import('./TeacherPersonnelFileScreen'));
const SOPSettingsScreen = lazyWithRetry(() => import('./SOPSettingsScreen'));
const SOPCaseManagementScreen = lazyWithRetry(() => import('./SOPCaseManagementScreen'));
const SOPCaseDetailScreen = lazyWithRetry(() => import('./SOPCaseDetailScreen'));
const ReportIncidentScreen = lazyWithRetry(() => import('../shared/ReportIncidentScreen'));
const SubstituteCoverageScreen = lazyWithRetry(() => import('./SubstituteCoverageScreen'));
const AtRiskStudentsScreen = lazyWithRetry(() => import('./AtRiskStudentsScreen'));
const ClassroomObservationScreen = lazyWithRetry(() => import('./ClassroomObservationScreen'));
const TeacherAssignmentsScreen = lazyWithRetry(() => import('./TeacherAssignmentsScreen'));
const SuspendStudentScreen = lazyWithRetry(() => import('./SuspendStudentScreen'));
const MarkStudentExitScreen = lazyWithRetry(() => import('./MarkStudentExitScreen'));
const PastStudentsScreen = lazyWithRetry(() => import('./PastStudentsScreen'));
const AlumniHistoryScreen = lazyWithRetry(() => import('./AlumniHistoryScreen'));
const ClassVerificationScreen = lazyWithRetry(() => import('./ClassVerificationScreen'));
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
const StudentIDCardDashboard = lazyWithRetry(() => import('./StudentIDCardDashboard'));
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
const LearningHubManagementScreen = lazyWithRetry(() => import('./LearningHubManagementScreen'));
const LearningHubResourceViewer = lazyWithRetry(() => import('../shared/LearningHubResourceViewer'));
const BranchAcademicsScreen = lazyWithRetry(() => import('./BranchAcademicsScreen'));
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
const AdminLessonNotesScreen = lazyWithRetry(() => import('./AdminLessonNotesScreen'));
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
const BranchTransferScreen = lazyWithRetry(() => import('./BranchTransferScreen'));
const UserAccountsScreen = lazyWithRetry(() => import('./UserAccountsScreen'));
const PermissionSlips = lazyWithRetry(() => import('../shared/PermissionSlips'));
const MentalHealthResources = lazyWithRetry(() => import('../shared/MentalHealthResources'));
const AccessibilitySettings = lazyWithRetry(() => import('../shared/AccessibilitySettings'));
const AppearancePanel = lazyWithRetry(() => import('../shared/AppearancePanel'));
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
const AssetDetailScreen = lazyWithRetry(() => import('./AssetDetailScreen'));
const ScanAssetScreen = lazyWithRetry(() => import('./ScanAssetScreen'));
const StudentGateScreen = lazyWithRetry(() => import('../shared/StudentGateScreen'));
const GatePassApprovals = lazyWithRetry(() => import('./GatePassApprovals'));
const DepartmentManagementScreen = lazyWithRetry(() => import('./DepartmentManagementScreen'));
const ClubManagementScreen = lazyWithRetry(() => import('./ClubManagementScreen'));
const DigitalTwinScreen = lazyWithRetry(() => import('./DigitalTwinScreen'));
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
const ParentChatAccessScreen = lazyWithRetry(() => import('./ParentChatAccessScreen'));
const ChatScreen = lazyWithRetry(() => import('../shared/ChatScreen'));
const EmergencyAlert = lazyWithRetry(() => import('./EmergencyAlert'));
const InviteStaffScreen = lazyWithRetry(() => import('./InviteStaffScreen'));
const TimetableCreator = lazyWithRetry(() => import('./TimetableCreator'));
const StudentApprovalsScreen = lazyWithRetry(() => import('./StudentApprovalsScreen'));
const AddBranchAdminScreen = lazyWithRetry(() => import('./AddBranchAdminScreen'));
const AssignFeePage = lazyWithRetry(() => import('./AssignFeePage'));
const AdminActionsScreen = lazyWithRetry(() => import('./AdminActionsScreen'));
const SchoolManagementScreen = lazyWithRetry(() => import('./SchoolManagementScreen'));
const CurriculumManagementScreen = lazyWithRetry(() => import('./CurriculumManagementScreen'));
const ClassFormScreen = lazyWithRetry(() => import('./ClassFormScreen'));
const RecordPaymentScreen = lazyWithRetry(() => import('./RecordPaymentScreen'));
const HostelManagementScreen = lazyWithRetry(() => import('./HostelManagementScreen'));
const TransportManagementScreen = lazyWithRetry(() => import('./TransportManagementScreen'));
const CustomReportBuilder = lazyWithRetry(() => import('./CustomReportBuilder'));
const BackupRestoreScreen = lazyWithRetry(() => import('./BackupRestoreScreen'));
const SessionManagementScreen = lazyWithRetry(() => import('./SessionManagementScreen'));
const SessionPromotionScreen = lazyWithRetry(() => import('./SessionPromotionScreen'));
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
const SubscriptionPage = lazyWithRetry(() => import('../subscription/SubscriptionPage'));

interface AdminDashboardProps {
    onLogout?: () => void;
    setIsHomePage?: (isHome: boolean) => void;
    currentUser?: any;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, setIsHomePage, currentUser }) => {
    const [activeBottomNav, setActiveBottomNav] = useState(() => {
        return sessionStorage.getItem('admin_activeBottomNav') || 'home';
    });
    const { view, title, props: routeProps, navigateTo, replaceView, handleBack, canGoBack } =
        useDashboardRouting('overview', 'Admin Dashboard');
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
        setIsHomePage(!canGoBack && !isSearchOpen);
        // The URL itself is now the persisted state (a refresh keeps the
        // browser on the same /view already, no sessionStorage needed for
        // that) — only the bottom-nav highlight still needs it, since it's
        // cosmetic UI state with no URL representation of its own.
        sessionStorage.setItem('admin_activeBottomNav', activeBottomNav);
    }, [canGoBack, isSearchOpen, setIsHomePage, activeBottomNav]);

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
        timetableBuilder: TimetableDeskBuilder,
        timetableEditor: TimetableEditor,
        timetableCreator: TimetableCreator,
        aiTimetableCreator: TimetableCreationPage,
        teacherAttendance: TeacherAttendanceScreen,
        teacherAttendanceApproval: TeacherAttendanceApproval,
        classroomManagement: ClassroomManagementScreen,
        classVerification: ClassVerificationScreen,
        teacherPersonnelFile: TeacherPersonnelFileScreen,
        sopSettings: SOPSettingsScreen,
        sopCaseManagement: SOPCaseManagementScreen,
        sopCaseDetail: SOPCaseDetailScreen,
        reportIncident: ReportIncidentScreen,
        substituteCoverage: SubstituteCoverageScreen,
        atRiskStudents: AtRiskStudentsScreen,
        classroomObservation: ClassroomObservationScreen,
        teacherAssignments: TeacherAssignmentsScreen,
        suspendStudent: SuspendStudentScreen,
        markStudentExit: MarkStudentExitScreen,
        pastStudents: PastStudentsScreen,
        alumniHistory: AlumniHistoryScreen,
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
        appearanceSettings: AppearancePanel,
        academicSettings: AcademicSettingsScreen,
        learningHubManagement: LearningHubManagementScreen,
        learningHubResource: LearningHubResourceViewer,
        branchAcademics: BranchAcademicsScreen,
        termsAndGrading: BranchAcademicsScreen,
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
        lessonNotes: AdminLessonNotesScreen,
        enrollmentPage: StudentEnrollmentPage,
        exams: ExamCandidateRegistration,
        branchTransfer: BranchTransferScreen,
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
        assetDetail: AssetDetailScreen,
        scanAsset: ScanAssetScreen,
        studentGate: StudentGateScreen,
        gatePassApprovals: GatePassApprovals,
        departmentManagement: DepartmentManagementScreen,
        clubManagement: ClubManagementScreen,
        digitalTwin: DigitalTwinScreen,
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
        parentChatAccess: ParentChatAccessScreen,
        chat: ChatScreen,
        attendanceTracker: AttendanceOverviewScreen,
        emergencyAlert: EmergencyAlert,
        inspectionHub: UnifiedGovernanceHub,
        staffManagement: TeacherListScreen,
        inviteStaff: InviteStaffScreen,
        idCardManagement: StudentIDCardDashboard,
        studentApprovals: StudentApprovalsScreen,
        addBranchAdmin: AddBranchAdminScreen,
        assignFee: AssignFeePage,
        adminActions: AdminActionsScreen,
        schoolManagement: SchoolManagementScreen,
        curriculumManagement: CurriculumManagementScreen,
        classForm: ClassFormScreen,
        recordPayment: RecordPaymentScreen,
        hostelManagement: HostelManagementScreen,
        transportManagement: TransportManagementScreen,
        customReportBuilder: CustomReportBuilder,
        backupRestore: BackupRestoreScreen,
        sessionManagement: SessionManagementScreen,
        sessionPromotion: SessionPromotionScreen,
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
        subscription: SubscriptionPage,
        upgrade: SubscriptionPage,
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
        window.ADMIN_NAVIGATE = navigateTo;
        window.ADMIN_COMPONENTS = Object.keys(viewComponents);
        window.ADMIN_AUDIT_ENABLED = true;
        
        const auditModeEnabled = window.__AUDIT_MODE__ || window.localStorage.getItem('audit_mode') === 'true';
        if (auditModeEnabled) {
            window.__AUDIT_MODE__ = true;
        }
    }, [user]);

    const handleBottomNavClick = (screen: string) => {
        setActiveBottomNav(screen);
        switch (screen) {
            case 'actions': replaceView('adminActions', 'Quick Actions'); break;
            case 'home': replaceView('overview', 'Admin Dashboard'); break;
            case 'branches': replaceView('schoolManagement', 'Manage Branches'); break;
            case 'studentList': replaceView('studentList', 'Students'); break;
            case 'teacherList': replaceView('teacherList', 'Teachers'); break;
            case 'parentList': replaceView('parentList', 'Parents'); break;
            case 'studentApprovals': replaceView('studentApprovals', 'Student Approvals'); break;
            case 'classList': replaceView('classList', 'Classes'); break;
            case 'timetable': replaceView('timetable', 'Timetable'); break;
            case 'examManagement': replaceView('examManagement', 'Exams'); break;
            case 'results': replaceView('resultsEntry', 'Results'); break;
            case 'compliance': replaceView('complianceDashboard', 'Compliance'); break;
            case 'messages': replaceView('adminMessages', 'Messages'); break;
            case 'parentChatAccess': replaceView('parentChatAccess', 'Parent Chat Access'); break;
            case 'communication': replaceView('communicationHub', 'Communication Hub'); break;
            case 'analytics': replaceView('analytics', 'School Analytics'); break;
            case 'settings': replaceView('profileSettings', 'Profile Settings'); break;
            case 'feeManagement': replaceView('feeManagement', 'Fee Management'); break;
            case 'staffManagement': replaceView('teacherList', 'Manage Teachers'); break;
            default: replaceView('overview', 'Admin Dashboard');
        }
    };

    const ComponentToRender = viewComponents[view];

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
        if (!ComponentToRender) return <div className="p-8 text-center">View Not Found: {view}</div>;

        if (view === 'notifications') return (
            <Suspense fallback={<DashboardSkeletonLoader type="list" />}>
                <NotificationsScreen {...routeProps} {...commonProps} userType="admin" />
            </Suspense>
        );

        if (view === 'adminMessages') return (
            <Suspense fallback={<DashboardSkeletonLoader type="list" />}>
                <AdminMessagesScreen
                    {...routeProps}
                    {...commonProps}
                    onNewChat={() => navigateTo('adminNewChat', 'New Message')}
                    onSelectChat={(convo: any) => navigateTo('chat', convo.displayName || 'Chat', {
                        conversationId: convo.id,
                        roomDetails: convo
                    })}
                />
            </Suspense>
        );

        if (view === 'adminNewChat') return (
            <Suspense fallback={<DashboardSkeletonLoader type="overview" />}>
                <AdminNewChatScreen
                    {...routeProps}
                    {...commonProps}
                />
            </Suspense>
        );

        if (view === 'parentChatAccess') return (
            <Suspense fallback={<DashboardSkeletonLoader type="list" />}>
                <ParentChatAccessScreen />
            </Suspense>
        );

        if (view === 'chat') return (
            <Suspense fallback={<DashboardSkeletonLoader type="overview" />}>
                <ChatScreen
                    conversationId={routeProps?.conversationId}
                    roomDetails={routeProps?.roomDetails}
                    targetUserId={routeProps?.targetUserId}
                    targetUserName={routeProps?.targetUserName}
                    targetUserAvatar={routeProps?.targetUserAvatar}
                    schoolId={routeProps?.schoolId || schoolId}
                    isGroup={routeProps?.isGroup}
                    themeColor="indigo"
                    forceChatPanel
                    onBack={handleBack}
                    navigateTo={navigateTo}
                    currentUserId={currentUserId || undefined}
                />
            </Suspense>
        );

        if (view === 'onboardingPage') return (
            <Suspense fallback={<DashboardSkeletonLoader type="overview" />}>
                <PilotOnboardingPage {...routeProps} {...commonProps} onComplete={handleBack} />
            </Suspense>
        );

        // schoolInfo excluded: branch admins need calendar access within it.
        // Backend still rejects school-wide field writes from non-main admins.
        const MAIN_ADMIN_ONLY_VIEWS = ['schoolManagement', 'curriculumManagement', 'brandingSettings', 'manageSchoolInfo', 'subscription', 'upgrade'];
        // Named renderedView, not `view` — a local `const view` here previously
        // shadowed the screen-name variable for the rest of this function, so
        // the MAIN_ADMIN_ONLY_VIEWS check below was comparing the array against
        // a React element instead of the view name and could never match,
        // silently disabling the main-admin-only gate for every one of these
        // screens. Not something this routing change set out to fix, but it
        // was directly exposed by needing to rename the outer variable to `view`.
        const renderedView = <ComponentToRender {...routeProps} {...commonProps} />;
        return (
            <Suspense fallback={<DashboardSkeletonLoader type="overview" />}>
                {MAIN_ADMIN_ONLY_VIEWS.includes(view)
                    ? <MainAdminOnly title="This screen" onBack={handleBack}>{renderedView}</MainAdminOnly>
                    : renderedView}
            </Suspense>
        );
    };

    // Hide header and sidebar for upgrade/subscription views
    const hideLayoutNav = view === 'upgrade' || view === 'subscription';
    // The timetable grids want the full width (no side padding / max-width), but keep
    // the header + sidebar.
    const fullWidthViews = ['timetableEditor', 'timetableBuilder', 'chat', 'adminNewChat', 'adminMessages', 'learningHubResource'];
    // upgrade/subscription have their own internal layout and need overflow-y-auto to scroll,
    // so they must NOT be included in hidePadding (which triggers overflow-hidden in DashboardLayout).
    const hidePadding = fullWidthViews.includes(view);
    // Views with their own docked/sticky bottom action bar manage their own internal
    // scroll + bottom spacing, so the layout's blanket pb-24/lg:pb-12 stacks on top of
    // their bar and leaves a dead gap beneath it. Unlike fullWidthViews, this keeps the
    // normal centered/padded content width — only the vertical scroll+padding mechanics change.
    const stickyFooterViews = ['studentProfileAdminView', 'studentProfileDashboard'];
    const stickyFooterLayout = stickyFooterViews.includes(view);
    const hideBottomNav = hideLayoutNav || view === 'chat';
    // Identifies THIS exact screen (view + its data, e.g. which student) so scroll
    // position can be remembered per screen and restored on return, while a screen
    // never visited this session still opens at the top.
    const scrollKey = React.useMemo(() => {
        try { return `${view}::${JSON.stringify(routeProps)}`; }
        catch { return view; }
    }, [view, routeProps]);

    return (
        <DashboardLayout
            title={title}
            onBack={canGoBack ? handleBack : undefined}
            scrollKey={scrollKey}
            activeScreen={activeBottomNav}
            setActiveScreen={handleBottomNavClick}
            hideHeader={hideLayoutNav}
            hideSidebar={hideLayoutNav}
            hidePadding={hidePadding}
            stickyFooterLayout={stickyFooterLayout}
            hideBottomNav={hideBottomNav}
        >
            {/* Database Connection Error */}
            {dbStatus === 'error' && <div className="bg-red-600 text-white text-xs py-1 px-4 mb-4 rounded-lg text-center font-medium">Database Connection Error</div>}

            {/* Plan / Trial Banner */}

            <div key={`${view}-${version}`} className="w-full h-full">
                <ErrorBoundary
                    key={view}
                    title={`${title} Error`}
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
