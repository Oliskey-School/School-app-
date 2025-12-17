
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { DashboardType } from '../../types';
import { THEME_CONFIG } from '../../constants';
import Header from '../ui/Header';
import { TeacherBottomNav } from '../ui/DashboardBottomNav';
import { mockNotifications } from '../../data';

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


const DashboardSuspenseFallback = () => (
  <div className="flex justify-center items-center h-full p-8 pt-20">
    <div className="w-10 h-10 border-4 border-t-4 border-gray-200 border-t-purple-600 rounded-full animate-spin"></div>
  </div>
);

interface ViewStackItem {
  view: string;
  props?: any;
  title: string;
}

interface TeacherDashboardProps {
  onLogout: () => void;
  setIsHomePage: (isHome: boolean) => void;
}

const LOGGED_IN_TEACHER_ID = 2;

import { supabase } from '../../lib/supabase';

// ... (imports remain)

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onLogout, setIsHomePage }) => {
  const [viewStack, setViewStack] = useState<ViewStackItem[]>([{ view: 'overview', title: 'Teacher Dashboard', props: {} }]);
  const [activeBottomNav, setActiveBottomNav] = useState('home');
  const [version, setVersion] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Profile State
  const [teacherProfile, setTeacherProfile] = useState({
    name: 'Teacher',
    avatarUrl: 'https://i.pravatar.cc/150?u=teacher'
  });

  const fetchProfile = async (optimisticData?: { name: string; avatarUrl: string }) => {
    if (optimisticData) {
      setTeacherProfile(optimisticData);
      // Trust the optimistic update and updated DB from the child component.
      // Skip fetching to avoid race conditions with potential stale reads.
      return;
    }

    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('name, avatar_url')
        .eq('id', LOGGED_IN_TEACHER_ID)
        .single();
      // ... (rest of fetch logic)

      if (error) {
        console.error('Error fetching dashboard profile:', error);
        return;
      }

      if (data) {
        setTeacherProfile({
          name: data.name || 'Teacher',
          avatarUrl: data.avatar_url || 'https://i.pravatar.cc/150?u=teacher'
        });
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const forceUpdate = () => setVersion(v => v + 1);

  useEffect(() => {
    const currentView = viewStack[viewStack.length - 1];
    setIsHomePage(currentView.view === 'overview' && !isSearchOpen);
  }, [viewStack, isSearchOpen, setIsHomePage]);

  const notificationCount = mockNotifications.filter(n => !n.isRead && n.audience.includes('teacher')).length;

  const navigateTo = (view: string, title: string, props: any = {}) => {
    setViewStack(stack => [...stack, { view, props, title }]);
  };

  const handleBack = () => {
    if (viewStack.length > 1) {
      setViewStack(stack => stack.slice(0, -1));
    }
  };

  const handleBottomNavClick = (screen: string) => {
    setActiveBottomNav(screen);
    let props = {};
    switch (screen) {
      case 'home':
        setViewStack([{ view: 'overview', title: 'Teacher Dashboard', props }]);
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
    timetable: (props: any) => <TimetableScreen {...props} context={{ userType: 'teacher', userId: LOGGED_IN_TEACHER_ID }} />,
    chat: (props: any) => <ChatScreen {...props} currentUserId={LOGGED_IN_TEACHER_ID} />,
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
    appointments: TeacherAppointmentsScreen,
    virtualClass: VirtualClassScreen,
    resources: TeacherResourcesScreen,
    cbtScores: CBTScoresScreen,
    cbtManagement: CBTManagementScreen,
  };

  const currentNavigation = viewStack[viewStack.length - 1];
  const ComponentToRender = viewComponents[currentNavigation.view as keyof typeof viewComponents];

  const commonProps = {
    navigateTo,
    handleBack,
    onLogout,
    forceUpdate,
    teacherProfile, // Make profile available to all screens
    refreshProfile: fetchProfile // Allow any screen to trigger refresh
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 relative">
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
      <div className="flex-grow overflow-y-auto" style={{ marginTop: '-5rem' }}>
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
      <TeacherBottomNav activeScreen={activeBottomNav} setActiveScreen={handleBottomNavClick} />
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
  );
};

export default TeacherDashboard;
