
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { DashboardType } from '../../types';
import { THEME_CONFIG } from '../../constants';
import Header from '../ui/Header';
import { TeacherBottomNav } from '../ui/DashboardBottomNav';
import { TeacherSidebar } from '../ui/DashboardSidebar';
import PremiumLoader from '../ui/PremiumLoader';
import { mockNotifications } from '../../data';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';

// Lazy load only the Global Search Screen as it's an overlay
const GlobalSearchScreen = lazy(() => import('../shared/GlobalSearchScreen'));

// Import all other view components directly to fix rendering issues
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
import LessonPlanDetailScreen from '../teacher/LessonPlanDetailScreen';
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


const DashboardSuspenseFallback = () => (
  <PremiumLoader message="Loading teacher workspace..." />
);

interface ViewStackItem {
  view: string;
  props?: any;
  title: string;
}

interface TeacherDashboardProps {
  onLogout: () => void;
  setIsHomePage: (isHome: boolean) => void;
  currentUser?: any;
}


import { supabase } from '../../lib/supabase';

// ... (imports remain)

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onLogout, setIsHomePage, currentUser }) => {
  const [viewStack, setViewStack] = useState<ViewStackItem[]>([{ view: 'overview', title: 'Teacher Dashboard', props: {} }]);
  const [activeBottomNav, setActiveBottomNav] = useState('home');
  const [version, setVersion] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // Fetch Integer User ID for Chat
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase.from('users').select('id').eq('email', user.email).single();
        if (userData) {
          setCurrentUserId(userData.id);
        } else {
          setCurrentUserId((currentUser as any)?.id ? parseInt((currentUser as any).id) : 0);
        }
      }
    };
    getUser();
  }, [currentUser]);

  // Profile State
  const [teacherProfile, setTeacherProfile] = useState({
    name: 'Teacher',
    avatarUrl: ''
  });

  const fetchProfile = async (optimisticData?: { name: string; avatarUrl: string }) => {
    if (optimisticData) {
      setTeacherProfile(optimisticData);
      return;
    }

    try {
      let query = supabase.from('teachers').select('id, name, avatar_url, email');

      let emailToQuery = currentUser?.email;

      if (!emailToQuery) {
        // Fallback: Check active session if prop is missing
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          emailToQuery = user.email;
        }
      }

      if (emailToQuery) {
        query = query.eq('email', emailToQuery);
      } else {
        // Ultimate Fallback (Demo Only) - Only if really no auth
        console.warn("No auth user found, falling back to Demo Teacher (ID 2)");
        query = query.eq('id', 2);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error('Error fetching dashboard profile:', error);
        return;
      }

      if (data) {
        setTeacherId(data.id);
        setTeacherProfile({
          name: data.name || 'Teacher',
          avatarUrl: data.avatar_url
        });
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [currentUser]);

  const forceUpdate = () => setVersion(v => v + 1);

  useEffect(() => {
    const currentView = viewStack[viewStack.length - 1];
    setIsHomePage(currentView.view === 'overview' && !isSearchOpen);
  }, [viewStack, isSearchOpen, setIsHomePage]);

  // Real-time notifications
  const notificationCount = useRealtimeNotifications('teacher');

  const navigateTo = (view: string, title: string, props: any = {}) => {
    if (view === 'overview') {
      setViewStack([{ view: 'overview', title: 'Teacher Dashboard', props }]);
    } else {
      setViewStack((prev) => [...prev, { view, title, props }]);
    }
  };

  const handleBack = () => {
    if (viewStack.length > 1) {
      setViewStack((prev) => prev.slice(0, -1));
    }
  };

  const handleBottomNavClick = (screen: string) => {
    setActiveBottomNav(screen);
    let props = {};
    switch (screen) {
      case 'home':
        setViewStack([{ view: 'overview', title: 'Teacher Dashboard', props }]);
        break;
      case 'lessonNotes':
        setViewStack([{ view: 'lessonNotesUpload', title: 'Lesson Notes', props: {} }]);
        break;
      case 'reports':
        setViewStack([{ view: 'reports', title: 'Student Reports', props }]);
        break;
      case 'forum':
        setViewStack([{ view: 'collaborationForum', title: 'Collaboration Forum', props: {} }]);
        break;
      case 'messages':
        setViewStack([{ view: 'messages', title: 'Messages', props: {} }]);
        break;
      case 'settings':
        setViewStack([{ view: 'settings', props, title: 'Settings' }]);
        break;
      default:
        setViewStack([{ view: 'overview', title: 'Teacher Dashboard', props }]);
    }
  };

  const handleNotificationClick = () => {
    navigateTo('notifications', 'Notifications', {});
  };

  // Removed useMemo to ensure fresh props (especially teacherProfile) are always passed down
  const viewComponents = {
    overview: TeacherOverview,
    classDetail: ClassDetailScreen,
    studentProfile: StudentProfileScreen,
    examManagement: TeacherExamManagement,
    selectClassForAttendance: TeacherSelectClassForAttendance,
    markAttendance: TeacherMarkAttendanceScreen,
    teacherSelfAttendance: TeacherSelfAttendance,
    library: LibraryScreen,
    gallery: PhotoGalleryScreen,
    calendar: CalendarScreen,
    addExam: AddExamScreen,
    createAssignment: CreateAssignmentScreen,
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
    forumTopic: ForumTopicScreen,
    timetable: (props: any) => <TimetableScreen {...props} context={{ userType: 'teacher', userId: teacherId ?? 2 }} />,
    chat: (props: any) => <ChatScreen {...props} currentUserId={currentUserId ?? 0} />,
    reports: TeacherReportsScreen,
    reportCardPreview: TeacherReportCardPreviewScreen,
    settings: (props: any) => <TeacherSettingsScreen {...props} dashboardProfile={teacherProfile} refreshDashboardProfile={fetchProfile} />,
    editTeacherProfile: (props: any) => <EditTeacherProfileScreen {...props} onProfileUpdate={fetchProfile} />,
    teacherNotificationSettings: TeacherNotificationSettingsScreen,
    teacherSecurity: TeacherSecurityScreen,
    teacherChangePassword: TeacherChangePasswordScreen,
    lessonPlanner: LessonPlannerScreen,
    lessonPlanDetail: LessonPlanDetailScreen,
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
    appointments: (props: any) => <TeacherAppointmentsScreen {...props} teacherId={teacherId ?? 2} />,
    virtualClass: VirtualClassScreen,
    resources: TeacherResourcesScreen,
    cbtScores: CBTScoresScreen,
    cbtManagement: CBTManagementScreen,
    quizBuilder: (props: any) => <QuizBuilderScreen {...props} teacherId={teacherId ?? 2} onClose={handleBack} />,
    classGradebook: (props: any) => <ClassGradebookScreen {...props} teacherId={teacherId ?? 2} handleBack={handleBack} />,
    lessonNotesUpload: (props: any) => <LessonNotesUploadScreen {...props} teacherId={teacherId ?? 2} handleBack={handleBack} />,
  };

  const currentNavigation = viewStack[viewStack.length - 1];
  const ComponentToRender = viewComponents[currentNavigation.view as keyof typeof viewComponents];

  // Pass teacherId to children via props or context. Usually props here.
  // We need to inject teacherId into all components that need it.

  const commonProps = {
    navigateTo,
    handleBack,
    onLogout,
    forceUpdate,
    teacherProfile, // Make profile available to all screens
    refreshProfile: fetchProfile, // Allow any screen to trigger refresh
    teacherId, // Pass the dynamic teacher ID
    currentUser,
    currentUserId,
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-100">
      {/* Desktop Sidebar - Hidden on mobile/tablet, fixed on desktop (lg+) */}
      <div className="hidden lg:flex w-64 flex-col fixed inset-y-0 left-0 z-50">
        <TeacherSidebar
          activeScreen={activeBottomNav}
          setActiveScreen={handleBottomNavClick}
          onLogout={onLogout}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen w-full lg:ml-64 overflow-hidden min-w-0">
        <Header
          title={currentNavigation.title}
          avatarUrl={teacherProfile.avatarUrl}
          bgColor={THEME_CONFIG[DashboardType.Teacher].mainBg}
          onLogout={onLogout}
          onBack={viewStack.length > 1 ? handleBack : undefined}
          onNotificationClick={handleNotificationClick}
          notificationCount={notificationCount}
          onSearchClick={() => setIsSearchOpen(true)}
        />
        <div className="flex-1 overflow-y-auto pb-56 lg:pb-0" style={{ marginTop: '-5rem' }}>
          <main className="min-h-full pt-20">
            <div key={`${viewStack.length}-${version}`} className="animate-slide-in-up">
              {ComponentToRender ? (
                <ComponentToRender {...currentNavigation.props} {...commonProps} />
              ) : (
                <div className="p-6">View not found: {currentNavigation.view}</div>
              )}
            </div>
          </main>
        </div>
        {/* Mobile/Tablet Bottom Nav - Hidden on desktop (lg+) */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
          <TeacherBottomNav activeScreen={activeBottomNav} setActiveScreen={handleBottomNavClick} />
        </div>
        <Suspense fallback={<DashboardSuspenseFallback />}>
          {isSearchOpen && (
            <GlobalSearchScreen
              dashboardType={DashboardType.Teacher}
              navigateTo={navigateTo}
              onClose={() => setIsSearchOpen(false)}
            />
          )}
        </Suspense>
      </div>
    </div >
  );
};

export default TeacherDashboard;
