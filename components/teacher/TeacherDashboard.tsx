import React, { useState, useEffect, useCallback, lazy, Suspense, useRef } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import { DashboardType } from '../../types';
import { THEME_CONFIG } from '../../constants';
import { formatSchoolId } from '../../utils/idFormatter';
import PremiumLoader from '../ui/PremiumLoader';
import ErrorBoundary from '../ui/ErrorBoundary';
import { useAuth } from '../../context/AuthContext';
import { getMyTeacherProfileCached } from '../../lib/queryClient';
import { useAutoSync } from '../../hooks/useAutoSync';
import { lazyWithRetry } from '../../lib/lazyRetry';
import { useDashboardRouting } from '../../hooks/useDashboardRouting';

// Lazy load only the Global Search Screen as it's an overlay
const GlobalSearchScreen = lazyWithRetry(() => import('../shared/GlobalSearchScreen'));

// Keep the overview in the initial teacher chunk for immediate first paint.
// Other screens are fetched when opened, preserving the existing view registry.
import TeacherOverview from './TeacherOverview';
const AppearancePanel = lazyWithRetry(() => import('../shared/AppearancePanel'));
const ClassDetailScreen = lazyWithRetry(() => import('./ClassDetailScreen'));
const StudentProfileScreen = lazyWithRetry(() => import('./StudentProfileScreen'));
const TeacherExamManagement = lazyWithRetry(() => import('./TeacherExamManagement'));
const LibraryScreen = lazyWithRetry(() => import('../shared/LibraryScreen'));
const PhotoGalleryScreen = lazyWithRetry(() => import('./PhotoGalleryScreen'));
const AddExamScreen = lazyWithRetry(() => import('../admin/AddExamScreen'));
const CreateAssignmentScreen = lazyWithRetry(() => import('./CreateAssignmentScreen'));
const TeacherAssignmentsListScreen = lazyWithRetry(() => import('./TeacherAssignmentsListScreen'));
const ClassAssignmentsScreen = lazyWithRetry(() => import('./ClassAssignmentsScreen'));
const AssignmentSubmissionsScreen = lazyWithRetry(() => import('./AssignmentSubmissionsScreen'));
const GradeSubmissionScreen = lazyWithRetry(() => import('./GradeSubmissionScreen'));
const CurriculumScreen = lazyWithRetry(() => import('../shared/CurriculumScreen'));
const TeacherCurriculumSelectionScreen = lazyWithRetry(() => import('./TeacherCurriculumSelectionScreen'));
import GradeEntryScreen from './GradeEntryScreen';
import TeacherMessagesScreen from './TeacherMessagesScreen';
import TeacherCommunicationScreen from './TeacherCommunicationScreen';
import CalendarScreen from '../shared/CalendarScreen';
import ReportCardInputScreen from './ReportCardInputScreen';
import CollaborationForumScreen from './CollaborationForumScreen';
import CreateForumTopicScreen from './CreateForumTopicScreen';
import ForumTopicScreen from './ForumTopicScreen';
import GlobalTeacherCommunityScreen from './GlobalTeacherCommunityScreen';
import GlobalForumTopicScreen from './GlobalForumTopicScreen';
import TimetableScreen from '../shared/TimetableScreen';
import ChatScreen from '../shared/ChatScreen';
import TeacherReportsScreen from './TeacherReportsScreen';
import TeacherSettingsScreen from './TeacherSettingsScreen';
import HelpSupportScreen from './HelpSupportScreen';
import EditTeacherProfileScreen from './EditTeacherProfileScreen';
import TeacherNotificationSettingsScreen from './TeacherNotificationSettingsScreen';
import TeacherSecurityScreen from './TeacherSecurityScreen';
import TeacherChangePasswordScreen from './TeacherChangePasswordScreen';
import NewChatScreen from './NewChatScreen';
import TeacherReportCardPreviewScreen from './TeacherReportCardPreviewScreen';
import NotificationsScreen from '../shared/NotificationsScreen';
import TeacherSelectClassForAttendance from './TeacherUnifiedAttendanceScreen';
import TeacherMarkAttendanceScreen from './TeacherAttendanceScreen';
import TeacherSelfAttendance from './TeacherSelfAttendance';
import ScanClassroomScreen from './ScanClassroomScreen';
import MyPersonnelFileScreen from './MyPersonnelFileScreen';
import MyClassHubScreen from './MyClassHubScreen';
import MySOPCasesScreen from './MySOPCasesScreen';
import SubstituteAssignment from './SubstituteAssignment';
import MyAtRiskStudents from './MyAtRiskStudents';
import MyObservations from './MyObservations';
import ReportMaintenanceIssue from './ReportMaintenanceIssue';
import StudentGateScreen from '../shared/StudentGateScreen';
import SOPCaseDetailScreen from './SOPCaseDetailScreen';
import ReportIncidentScreen from '../shared/ReportIncidentScreen';
import LessonPlannerScreen from './LessonPlannerScreen';
import LessonPlanDetailScreen, { AIActivitySuggester } from './LessonPlanDetailScreen';
import DetailedLessonNoteScreen from './DetailedLessonNoteScreen';
import SelectTermForReportScreen from './SelectTermForReportScreen';
import ProfessionalDevelopmentScreen from './ProfessionalDevelopmentScreen';
import AIPerformanceSummaryScreen from './AIPerformanceSummaryScreen';
import EducationalGamesScreen from './EducationalGamesScreen';
import LessonContentScreen from './LessonContentScreen';
import AssignmentViewScreen from './AssignmentViewScreen';
import AIGameCreatorScreen from './AIGameCreatorScreen';
import GamePlayerScreen from '../shared/GamePlayerScreen';
import TeacherAppointmentsScreen from './TeacherAppointmentsScreen';
import VirtualClassScreen from './VirtualClassScreen';
import TeacherLearningHubScreen from './LearningHubScreen';
const LearningHubResourceViewer = lazyWithRetry(() => import('../shared/LearningHubResourceViewer'));
import CBTManagementScreen from './CBTManagementScreen';
import CBTScoresScreen from './CBTScoresScreen';
import QuizBuilderScreen from './QuizBuilderScreen';
import ClassGradebookScreen from './ClassGradebookScreen';
import LessonNotesUploadScreen from './LessonNotesUploadScreen';
import TeacherAttendanceHistoryScreen from './TeacherAttendanceHistoryScreen';
import LeaveRequest from './LeaveRequest';
import PayslipViewer from './PayslipViewer';
import TeacherSalaryProfile from './TeacherSalaryProfile';
import MyPaymentHistory from './MyPaymentHistory';
import { QuickAttendance } from './QuickAttendance';
import AssessmentsHub from './AssessmentsHub';

// Missing Audit Components
import BadgeSystem from './BadgeSystem';
import CertificateViewer from './CertificateViewer';
import CourseCatalog from './CourseCatalog';
import MentoringMatching from './MentoringMatching';
import MyPDCourses from './MyPDCourses';
import PDCalendar from './PDCalendar';
import RecognitionPlatform from './RecognitionPlatform';
import ResourceSharing from './ResourceSharing';
import StudentCredentialsScreen from './StudentCredentialsScreen';
import WorkloadCalculator from './WorkloadCalculator';

// Lazy load AddStudentScreen for teachers
const AddStudentScreen = lazyWithRetry(() => import('../admin/AddStudentScreen'));

const DashboardSuspenseFallback = () => (
  <PremiumLoader message="Loading teacher workspace..." />
);

interface TeacherDashboardProps {
  onLogout?: () => void;
  setIsHomePage?: (isHome: boolean) => void;
  currentUser?: any;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onLogout, setIsHomePage, currentUser }) => {
   const {
     view, title, props: routeProps,
     navigateTo: pushView, replaceView, handleBack, canGoBack,
   } = useDashboardRouting('overview', 'Teacher Dashboard');
   // navigateTo('overview', ...) used to reset the stack to a single root
   // rather than push (see the original navigateTo below) — every other
   // view pushed normally. Preserved as the one place this dashboard's
   // navigateTo differs from the hook's default (always-push) behavior.
   // Memoized: an unstable reference here made the audit-exposure effect
   // below (whose deps include navigateTo) re-run on every single render
   // instead of only when the underlying navigation functions change.
   const navigateTo = useCallback((nextView: string, nextTitle: string, nextProps: any = {}) => {
     if (nextView === 'overview') replaceView('overview', 'Teacher Dashboard', nextProps);
     else pushView(nextView, nextTitle, nextProps);
   }, [replaceView, pushView]);
   const [activeBottomNav, setActiveBottomNav] = useState('home');
   const [version, setVersion] = useState(0);
   const [isSearchOpen, setIsSearchOpen] = useState(false);
   const [teacherId, setTeacherId] = useState<string | null>(null);
   const [currentUserId, setCurrentUserId] = useState<string | null>(null);
   const { currentSchool, currentBranchId, user } = useAuth();
   const schoolId = currentSchool?.id;
   const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const effectiveSchoolId = schoolId || user?.user_metadata?.school_id || user?.app_metadata?.school_id || (user?.email?.includes('demo') ? 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' : undefined);

  // The auth context already has the current user. Reusing its ID avoids a
  // duplicate /auth/me request on every teacher dashboard mount.
  useEffect(() => {
    setCurrentUserId(user?.id || (currentUser as any)?.id || '');
  }, [user?.id, currentUser]);

  // Profile State

  const [teacherProfile, setTeacherProfile] = useState<{
    name: string;
    avatarUrl: string;
    schoolGeneratedId?: string;
    schoolId?: string;
    subject?: string;
    notification_preferences?: any;
  }>({
    name: 'Teacher',
    avatarUrl: '',
    subject: ''
  });

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState(false);

  const fetchProfile = async (optimisticData?: { name: string; avatarUrl: string }) => {
    if (optimisticData) {
      setTeacherProfile(prev => ({ ...prev, ...optimisticData }));
      return;
    }

    try {
      setLoadingProfile(true);
      setProfileError(false);
      
      if (!effectiveSchoolId) {
          setLoadingProfile(false);
          return;
      }
      
      const data = await getMyTeacherProfileCached();

      if (data) {
        setTeacherId(data.id);
        setTeacherProfile({
          name: data.full_name || data.name || 'Teacher',
          avatarUrl: data.avatar_url || data.avatarUrl || '',
          schoolGeneratedId: data.school_generated_id || data.schoolGeneratedId,
          schoolId: data.school_id || data.schoolId,
          subject: data.subject || '',
          notification_preferences: data.notification_preferences
        } as any);
      } else {
        console.warn("No teacher profile found via API.");
        setProfileError(true);
      }
    } catch (err: any) {
      console.error("Profile Fetch Error:", err.message);
      setProfileError(true);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [currentUser]);

   // Reduce auto-sync frequency for teacher profile updates
   useAutoSync(['teachers'], () => {
     // Debounce profile refresh to prevent excessive re-renders
     if (syncTimeoutRef.current) {
       clearTimeout(syncTimeoutRef.current);
     }
     
     syncTimeoutRef.current = setTimeout(() => {
       // Refresh profile if any teacher record changes (simple strategy for me/profile)
       fetchProfile();
       syncTimeoutRef.current = null;
     }, 2000); // 2 second debounce
   });

  const forceUpdate = () => setVersion(v => v + 1);

  useEffect(() => {
    setIsHomePage(view === 'overview' && !isSearchOpen);
  }, [view, isSearchOpen, setIsHomePage]);

  const handleBottomNavClick = (screen: string) => {
    setActiveBottomNav(screen);
    switch (screen) {
      case 'home': replaceView('overview', 'Teacher Dashboard'); break;
      case 'timetable': replaceView('timetable', 'Timetable Dashboard'); break;
      case 'lessonNotes': replaceView('lessonNotesUpload', 'Lesson Notes'); break;
      case 'reports': replaceView('reports', 'Student Reports'); break;
      case 'forum': replaceView('collaborationForum', 'Collaboration Forum'); break;
      case 'messages': replaceView('messages', 'Messages'); break;
      case 'settings': replaceView('settings', 'Settings'); break;
      default: replaceView('overview', 'Teacher Dashboard');
    }
  };

  const viewComponents: any = {
    overview: TeacherOverview,
    quickAttendance: QuickAttendance,
    classDetail: ClassDetailScreen,
    studentProfile: StudentProfileScreen,
    examManagement: (props: any) => <TeacherExamManagement {...props} schoolId={props.schoolId || effectiveSchoolId} teacherId={props.teacherId ?? teacherId} branchId={props.branchId ?? currentBranchId} />,
    selectClassForAttendance: TeacherSelectClassForAttendance,
    markAttendance: TeacherMarkAttendanceScreen,
    teacherSelfAttendance: TeacherSelfAttendance,
    scanClassroom: ScanClassroomScreen,
    myPersonnelFile: MyPersonnelFileScreen,
    myClassHub: MyClassHubScreen,
    mySopCases: MySOPCasesScreen,
    substituteAssignments: SubstituteAssignment,
    myAtRiskStudents: MyAtRiskStudents,
    myObservations: MyObservations,
    reportMaintenanceIssue: ReportMaintenanceIssue,
    studentGate: StudentGateScreen,
    sopCaseDetail: SOPCaseDetailScreen,
    reportIncident: ReportIncidentScreen,
    attendanceHistory: TeacherAttendanceHistoryScreen,
    library: LibraryScreen,
    gallery: PhotoGalleryScreen,
    calendar: CalendarScreen,
    addExam: AddExamScreen,
    assignmentCreator: CreateAssignmentScreen,
    // Always carries the teacher's id: the Overview opened this screen with no
    // props, so it sat on "Loading assignments…" for ever.
    assignmentsList: (props: any) => <TeacherAssignmentsListScreen {...props} teacherId={props.teacherId || teacherId} branchId={props.branchId || currentBranchId} />,
    classAssignments: ClassAssignmentsScreen,
    assignmentSubmissions: AssignmentSubmissionsScreen,
    gradeSubmission: GradeSubmissionScreen,
    curriculumSelection: TeacherCurriculumSelectionScreen,
    curriculum: CurriculumScreen,
    gradeEntry: GradeEntryScreen,
    messages: TeacherMessagesScreen,
    newChat: NewChatScreen,
    communication: TeacherCommunicationScreen,
    reportCardInput: ReportCardInputScreen,
    collaborationForum: CollaborationForumScreen,
    createForumTopic: (props: any) => <CreateForumTopicScreen {...props} currentUser={props.currentUser} onTopicCreated={props.onTopicCreated} />,
    forumTopic: (props: any) => <ForumTopicScreen {...props} currentUserId={currentUserId || ''} teacherProfile={teacherProfile} />,
    globalForum: GlobalTeacherCommunityScreen,
    globalForumTopic: GlobalForumTopicScreen,
    timetable: (props: any) => <TimetableScreen {...props} context={{ userType: 'teacher', userId: teacherId || '' }} />,
    chat: (props: any) => <ChatScreen {...props} currentUserId={currentUserId || ''} themeColor="purple" onBack={handleBack} forceChatPanel={!!(props?.targetUserId || props?.conversationId)} />,
    reports: TeacherReportsScreen,
    reportCardPreview: TeacherReportCardPreviewScreen,
    settings: (props: any) => <TeacherSettingsScreen {...props} dashboardProfile={teacherProfile} refreshDashboardProfile={fetchProfile} />,
    // Settings links here via navigateTo('helpSupport', …), but the key was never
    // registered, so the screen rendered the literal "View not found: helpSupport".
    helpSupport: HelpSupportScreen,
    editTeacherProfile: (props: any) => <EditTeacherProfileScreen {...props} onProfileUpdate={fetchProfile} />,
    teacherNotificationSettings: (props: any) => <TeacherNotificationSettingsScreen {...props} teacherId={teacherId} />,
    appearanceSettings: () => <AppearancePanel />,
    teacherSecurity: (props: any) => <TeacherSecurityScreen {...props} teacherId={teacherId} userId={currentUserId} />,
    teacherChangePassword: TeacherChangePasswordScreen,
    lessonPlanner: LessonPlannerScreen,
    lessonPlanDetail: LessonPlanDetailScreen,
    suggestActivity: (props: any) => <AIActivitySuggester {...props} subject={props.subject || teacherProfile.subject || ''} handleBack={handleBack} />,
    lessonContent: LessonContentScreen,
    assignmentView: AssignmentViewScreen,
    detailedLessonNote: DetailedLessonNoteScreen,
    notifications: (props: any) => <NotificationsScreen {...props} userType="teacher" />,
    selectTermForReport: SelectTermForReportScreen,
    professionalDevelopment: ProfessionalDevelopmentScreen,
    aiPerformanceSummary: AIPerformanceSummaryScreen,
    educationalGames: EducationalGamesScreen,
    aiGameCreator: AIGameCreatorScreen,
    gamePlayer: GamePlayerScreen,
    appointments: (props: any) => <TeacherAppointmentsScreen {...props} teacherId={teacherId || ''} />,
    virtualClass: VirtualClassScreen,
    learningHub: (props: any) => <TeacherLearningHubScreen {...props} teacherId={teacherId || ''} />,
    learningHubResource: LearningHubResourceViewer,
    cbtScores: CBTScoresScreen,
    cbtManagement: (props: any) => <CBTManagementScreen {...props} schoolId={effectiveSchoolId} />,
    addStudent: AddStudentScreen,
    quizBuilder: (props: any) => <QuizBuilderScreen {...props} teacherId={teacherId || ''} onClose={handleBack} />,
    classGradebook: (props: any) => <ClassGradebookScreen {...props} teacherId={teacherId || ''} handleBack={handleBack} />,
    lessonNotesUpload: (props: any) => <LessonNotesUploadScreen {...props} teacherId={teacherId || ''} handleBack={handleBack} />,
    leaveRequest: (props: any) => <LeaveRequest {...props} teacherId={teacherId || ''} />,
    payslips: (props: any) => <PayslipViewer {...props} teacherId={teacherId || ''} />,
    salaryProfile: (props: any) => <TeacherSalaryProfile {...props} teacherId={teacherId || ''} />,
    paymentHistory: (props: any) => <MyPaymentHistory {...props} teacherId={teacherId || ''} />,
    assessmentsHub: (props: any) => <AssessmentsHub {...props} teacherId={teacherId || ''} />,

    // Additional Audit Registered Views
    badgeSystem: BadgeSystem,
    certificateViewer: CertificateViewer,
    courseCatalog: CourseCatalog,
    mentoringMatching: MentoringMatching,
    myPDCourses: MyPDCourses,
    pdCalendar: PDCalendar,
    recognitionPlatform: RecognitionPlatform,
    resourceSharing: (props: any) => <ResourceSharing {...props} teacherId={teacherId || ''} />,
    studentCredentials: StudentCredentialsScreen,
    workloadCalculator: WorkloadCalculator,
  };

  const ComponentToRender = viewComponents[view as keyof typeof viewComponents];
  // Identifies THIS exact screen (view + its data) so scroll position can be
  // remembered per screen and restored on return, while a screen never visited
  // this session still opens at the top. Computed unconditionally (before any
  // early return below) to keep hook order stable across renders.
  const scrollKey = React.useMemo(() => {
    try { return `${view}::${JSON.stringify(routeProps)}`; }
    catch { return view; }
  }, [view, routeProps]);

  // --- AUDIT SYSTEM EXPOSURE ---
  useEffect(() => {
    // Expose registry early, even if profile is loading
    (window as any).TEACHER_NAVIGATE = navigateTo;
    (window as any).TEACHER_COMPONENTS = Object.keys(viewComponents);
    console.log('🛡️ [TeacherDashboard] Audit triggers exposed to window.');
    
    return () => {
      delete (window as any).TEACHER_NAVIGATE;
      delete (window as any).TEACHER_COMPONENTS;
    };
  }, [navigateTo]);
  // -----------------------------


  const commonProps = {
    navigateTo,
    handleBack,
    onLogout,
    forceUpdate,
    teacherProfile, // Make profile available to all screens
    refreshProfile: fetchProfile, // Allow any screen to trigger refresh
    teacherId, // Pass the dynamic teacher ID
    currentUser: user,
    currentUserId,
    schoolId: effectiveSchoolId,
    currentBranchId
  };

  if (loadingProfile && !teacherId) {
    return <PremiumLoader message="Fetching teacher profile..." />;
  }

  if (profileError && !teacherId) {
    return (
        <div className="flex flex-col items-center justify-center h-screen p-6 text-center bg-gray-50">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">👨‍🏫</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Teacher Profile Not Found</h2>
                <p className="text-gray-600 mb-6">
                    We couldn't find a teacher record linked to your account.
                    Please contact the school administrator to set up your profile.
                </p>
                <button
                    onClick={() => onLogout?.()}
                    className="w-full py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                >
                    Back to Login
                </button>
            </div>
        </div>
    );
  }

  const isFullScreen = ['messages', 'newChat', 'chat', 'learningHubResource'].includes(view);
  const hideBottomNav = view === 'chat';

  return (
    <DashboardLayout
      title={title}
      onBack={canGoBack ? handleBack : undefined}
      scrollKey={scrollKey}
      activeScreen={activeBottomNav}
      setActiveScreen={handleBottomNavClick}
      onProfileClick={() => navigateTo('editTeacherProfile', 'My Profile')}
      hideHeader={hideBottomNav}
      hidePadding={isFullScreen}
      hideBottomNav={hideBottomNav}
    >
      <div key={`${view}-${version}`} className="w-full h-full">
        <ErrorBoundary
          key={view}
          title={`${title} Error`}
          message="We encountered an issue while rendering this screen. This could be due to a data mismatch or a temporary connection issue."
          onReset={forceUpdate}
        >
          {ComponentToRender ? (
            <Suspense fallback={<DashboardSuspenseFallback />}>
              <ComponentToRender {...routeProps} {...commonProps} />
            </Suspense>
          ) : (
            <div className="p-6 text-center text-gray-500">View not found: {view}</div>
          )}
        </ErrorBoundary>
      </div>
      <Suspense fallback={<DashboardSuspenseFallback />}>
        {isSearchOpen && (
          <GlobalSearchScreen dashboardType={DashboardType.Teacher} navigateTo={navigateTo} onClose={() => setIsSearchOpen(false)} />
        )}
      </Suspense>
    </DashboardLayout>
  );
};

export default TeacherDashboard;
