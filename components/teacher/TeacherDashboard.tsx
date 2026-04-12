import React, { useState, useEffect, lazy, Suspense, useRef } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import { DashboardType } from '../../types';
import { THEME_CONFIG } from '../../constants';
import { formatSchoolId } from '../../utils/idFormatter';
import PremiumLoader from '../ui/PremiumLoader';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { useAutoSync } from '../../hooks/useAutoSync';

// Lazy load only the Global Search Screen as it's an overlay
const GlobalSearchScreen = lazy(() => import('../shared/GlobalSearchScreen'));

// Import all other view components directly
import TeacherOverview from '../teacher/TeacherOverview';
import ClassDetailScreen from '../teacher/ClassDetailScreen';
import StudentProfileScreen from '../teacher/StudentProfileScreen';
import TeacherExamManagement from '../teacher/TeacherExamManagement';
import LibraryScreen from '../shared/LibraryScreen';
import PhotoGalleryScreen from '../teacher/PhotoGalleryScreen';
import AddExamScreen from '../admin/AddExamScreen';
import CreateAssignmentScreen from '../teacher/CreateAssignmentScreen';
import TeacherAssignmentsListScreen from '../teacher/TeacherAssignmentsListScreen';
import ClassAssignmentsScreen from '../teacher/ClassAssignmentsScreen';
import AssignmentSubmissionsScreen from '../teacher/AssignmentSubmissionsScreen';
import GradeSubmissionScreen from '../teacher/GradeSubmissionScreen';
import CurriculumScreen from '../shared/CurriculumScreen';
import TeacherCurriculumSelectionScreen from '../teacher/TeacherCurriculumSelectionScreen';
import GradeEntryScreen from '../teacher/GradeEntryScreen';
import TeacherMessagesScreen from '../teacher/TeacherMessagesScreen';
import TeacherCommunicationScreen from '../teacher/TeacherCommunicationScreen';
import CalendarScreen from '../shared/CalendarScreen';
import ReportCardInputScreen from '../teacher/ReportCardInputScreen';
import CollaborationForumScreen from '../teacher/CollaborationForumScreen';
import CreateForumTopicScreen from '../teacher/CreateForumTopicScreen';
import ForumTopicScreen from '../teacher/ForumTopicScreen';
import TimetableScreen from '../shared/TimetableScreen';
import ChatScreen from '../shared/ChatScreen';
import TeacherReportsScreen from '../teacher/TeacherReportsScreen';
import TeacherSettingsScreen from '../teacher/TeacherSettingsScreen';
import EditTeacherProfileScreen from '../teacher/EditTeacherProfileScreen';
import TeacherNotificationSettingsScreen from '../teacher/TeacherNotificationSettingsScreen';
import TeacherSecurityScreen from '../teacher/TeacherSecurityScreen';
import TeacherChangePasswordScreen from '../teacher/TeacherChangePasswordScreen';
import NewChatScreen from '../teacher/NewChatScreen';
import TeacherReportCardPreviewScreen from '../teacher/TeacherReportCardPreviewScreen';
import NotificationsScreen from '../shared/NotificationsScreen';
import TeacherSelectClassForAttendance from '../teacher/TeacherUnifiedAttendanceScreen';
import TeacherMarkAttendanceScreen from '../teacher/TeacherAttendanceScreen';
import TeacherSelfAttendance from '../teacher/TeacherSelfAttendance';
import LessonPlannerScreen from '../teacher/LessonPlannerScreen';
import LessonPlanDetailScreen, { AIActivitySuggester } from '../teacher/LessonPlanDetailScreen';
import DetailedLessonNoteScreen from '../teacher/DetailedLessonNoteScreen';
import SelectTermForReportScreen from '../teacher/SelectTermForReportScreen';
import ProfessionalDevelopmentScreen from '../teacher/ProfessionalDevelopmentScreen';
import AIPerformanceSummaryScreen from '../teacher/AIPerformanceSummaryScreen';
import EducationalGamesScreen from '../teacher/EducationalGamesScreen';
import LessonContentScreen from '../teacher/LessonContentScreen';
import AssignmentViewScreen from '../teacher/AssignmentViewScreen';
import AIGameCreatorScreen from '../teacher/AIGameCreatorScreen';
import GamePlayerScreen from '../shared/GamePlayerScreen';
import TeacherAppointmentsScreen from '../teacher/TeacherAppointmentsScreen';
import VirtualClassScreen from '../teacher/VirtualClassScreen';
import TeacherResourcesScreen from '../teacher/TeacherResourcesScreen';
import CBTManagementScreen from '../teacher/CBTManagementScreen';
import CBTScoresScreen from '../teacher/CBTScoresScreen';
import QuizBuilderScreen from '../teacher/QuizBuilderScreen';
import ClassGradebookScreen from '../teacher/ClassGradebookScreen';
import LessonNotesUploadScreen from '../teacher/LessonNotesUploadScreen';
import TeacherAttendanceHistoryScreen from '../teacher/TeacherAttendanceHistoryScreen';
import LeaveRequest from '../teacher/LeaveRequest';
import PayslipViewer from '../teacher/PayslipViewer';
import TeacherSalaryProfile from '../teacher/TeacherSalaryProfile';
import MyPaymentHistory from '../teacher/MyPaymentHistory';
import { QuickAttendance } from './QuickAttendance';
import { GradebookGrid } from './GradebookGrid';

// Missing Audit Components
import AttendanceTrackSelector from '../teacher/AttendanceTrackSelector';
import BadgeSystem from '../teacher/BadgeSystem';
import CertificateViewer from '../teacher/CertificateViewer';
import CourseCatalog from '../teacher/CourseCatalog';
import MentoringMatching from '../teacher/MentoringMatching';
import MyPDCourses from '../teacher/MyPDCourses';
import PDCalendar from '../teacher/PDCalendar';
import RecognitionPlatform from '../teacher/RecognitionPlatform';
import ResourceSharing from '../teacher/ResourceSharing';
import StudentCredentialsScreen from '../teacher/StudentCredentialsScreen';
import WorkloadCalculator from '../teacher/WorkloadCalculator';

// Lazy load AddStudentScreen for teachers
const AddStudentScreen = lazy(() => import('../admin/AddStudentScreen'));

const DashboardSuspenseFallback = () => (
  <PremiumLoader message="Loading teacher workspace..." />
);

interface ViewStackItem {
  view: string;
  props?: any;
  title: string;
}

interface TeacherDashboardProps {
  onLogout?: () => void;
  setIsHomePage?: (isHome: boolean) => void;
  currentUser?: any;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onLogout, setIsHomePage, currentUser }) => {
   const [viewStack, setViewStack] = useState<ViewStackItem[]>([{ view: 'overview', title: 'Teacher Dashboard', props: {} }]);
   const [activeBottomNav, setActiveBottomNav] = useState('home');
   const [version, setVersion] = useState(0);
   const [isSearchOpen, setIsSearchOpen] = useState(false);
   const [teacherId, setTeacherId] = useState<string | null>(null);
   const [currentUserId, setCurrentUserId] = useState<string | null>(null);
   const { currentSchool, currentBranchId, user } = useAuth();
   const schoolId = currentSchool?.id;
   const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const effectiveSchoolId = schoolId || user?.user_metadata?.school_id || user?.app_metadata?.school_id || (user?.email?.includes('demo') ? 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' : undefined);

  // Fetch Integer User ID for Chat
  useEffect(() => {
    const getUserData = async () => {
      try {
        const userData = await api.getMe();
        if (userData) {
          setCurrentUserId(userData.id);
        } else {
          setCurrentUserId((currentUser as any)?.id || '');
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        setCurrentUserId((currentUser as any)?.id || '');
      }
    };
    getUserData();
  }, [currentUser]);

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
      
      if (!schoolId) {
          setLoadingProfile(false);
          return;
      }
      
      const data = await api.getMyTeacherProfile();

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
    const currentView = viewStack[viewStack.length - 1];
    setIsHomePage(currentView.view === 'overview' && !isSearchOpen);
  }, [viewStack, isSearchOpen, setIsHomePage]);

  const navigateTo = (view: string, title: string, props: any = {}) => {
    React.startTransition(() => {
      if (view === 'overview') {
        setViewStack([{ view: 'overview', title: 'Teacher Dashboard', props }]);
      } else {
        setViewStack((prev) => [...prev, { view, title, props }]);
      }
    });
  };

  const handleBack = () => {
    if (viewStack.length > 1) {
      React.startTransition(() => {
        setViewStack((prev) => prev.slice(0, -1));
      });
    }
  };

  const handleBottomNavClick = (screen: string) => {
    React.startTransition(() => {
      setActiveBottomNav(screen);
      switch (screen) {
        case 'home': setViewStack([{ view: 'overview', title: 'Teacher Dashboard', props: {} }]); break;
        case 'lessonNotes': setViewStack([{ view: 'lessonNotesUpload', title: 'Lesson Notes', props: {} }]); break;
        case 'reports': setViewStack([{ view: 'reports', title: 'Student Reports', props: {} }]); break;
        case 'forum': setViewStack([{ view: 'collaborationForum', title: 'Collaboration Forum', props: {} }]); break;
        case 'messages': setViewStack([{ view: 'messages', title: 'Messages', props: {} }]); break;
        case 'settings': setViewStack([{ view: 'settings', title: 'Settings', props: {} }]); break;
        default: setViewStack([{ view: 'overview', title: 'Teacher Dashboard', props: {} }]);
      }
    });
  };

  const viewComponents: any = {
    overview: TeacherOverview,
    quickAttendance: QuickAttendance,
    bulkGradebook: GradebookGrid,
    classDetail: ClassDetailScreen,
    studentProfile: StudentProfileScreen,
    examManagement: TeacherExamManagement,
    selectClassForAttendance: TeacherSelectClassForAttendance,
    markAttendance: TeacherMarkAttendanceScreen,
    teacherSelfAttendance: TeacherSelfAttendance,
    attendanceHistory: TeacherAttendanceHistoryScreen,
    library: LibraryScreen,
    gallery: PhotoGalleryScreen,
    calendar: CalendarScreen,
    addExam: AddExamScreen,
    assignmentCreator: CreateAssignmentScreen,
    assignmentsList: TeacherAssignmentsListScreen,
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
    timetable: (props: any) => <TimetableScreen {...props} context={{ userType: 'teacher', userId: teacherId || '' }} />,
    chat: (props: any) => <ChatScreen {...props} currentUserId={currentUserId || ''} />,
    reports: TeacherReportsScreen,
    reportCardPreview: TeacherReportCardPreviewScreen,
    settings: (props: any) => <TeacherSettingsScreen {...props} dashboardProfile={teacherProfile} refreshDashboardProfile={fetchProfile} />,
    editTeacherProfile: (props: any) => <EditTeacherProfileScreen {...props} onProfileUpdate={fetchProfile} />,
    teacherNotificationSettings: (props: any) => <TeacherNotificationSettingsScreen {...props} teacherId={teacherId} />,
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
    resources: TeacherResourcesScreen,
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

    // Additional Audit Registered Views
    attendanceTrackSelector: AttendanceTrackSelector,
    badgeSystem: BadgeSystem,
    certificateViewer: CertificateViewer,
    courseCatalog: CourseCatalog,
    mentoringMatching: MentoringMatching,
    myPDCourses: MyPDCourses,
    pdCalendar: PDCalendar,
    recognitionPlatform: RecognitionPlatform,
    resourceSharing: ResourceSharing,
    studentCredentials: StudentCredentialsScreen,
    workloadCalculator: WorkloadCalculator,
  };

  const currentNavigation = viewStack[viewStack.length - 1];
  const ComponentToRender = viewComponents[currentNavigation.view as keyof typeof viewComponents];

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

  return (
    <DashboardLayout
      title={currentNavigation.title}
      onBack={viewStack.length > 1 ? handleBack : undefined}
      activeScreen={activeBottomNav}
      setActiveScreen={handleBottomNavClick}
    >
      <div key={`${viewStack.length}-${version}`} className="w-full h-full">
        {ComponentToRender ? (
          <Suspense fallback={<DashboardSuspenseFallback />}>
            <ComponentToRender {...currentNavigation.props} {...commonProps} />
          </Suspense>
        ) : (
          <div className="p-6 text-center text-gray-500">View not found: {currentNavigation.view}</div>
        )}
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
