
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { DashboardType } from '../../types';
import { THEME_CONFIG } from '../../constants';
import { formatSchoolId } from '../../utils/idFormatter';
import Header from '../ui/Header';
import { TeacherBottomNav } from '../ui/DashboardBottomNav';
import { TeacherSidebar } from '../ui/DashboardSidebar';
import PremiumLoader from '../ui/PremiumLoader';
import { mockNotifications } from '../../data';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';
import { useAuth } from '../../context/AuthContext';
import { realtimeService } from '../../services/RealtimeService';
import { syncEngine } from '../../lib/syncEngine';

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


import { supabase } from '../../lib/supabase';

// ... (imports remain)

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onLogout, setIsHomePage, currentUser }) => {
  const [viewStack, setViewStack] = useState<ViewStackItem[]>([{ view: 'overview', title: 'Teacher Dashboard', props: {} }]);
  const [activeBottomNav, setActiveBottomNav] = useState('home');
  const [version, setVersion] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { currentSchool, currentBranchId, user } = useAuth();
  const schoolId = currentSchool?.id;

  // Fetch Integer User ID for Chat
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase.from('users').select('id').eq('email', user.email).single();
        if (userData) {
          setCurrentUserId(userData.id);
        } else {
          setCurrentUserId((currentUser as any)?.id || '');
        }
      }
    };
    getUser();
  }, [currentUser]);

  // Real-time Service Integration
  useEffect(() => {
    const userId = user?.id;
    let activeSchoolId = schoolId || user?.user_metadata?.school_id || user?.app_metadata?.school_id;

    // Fix for demo users
    const isDemo = user?.email?.includes('demo') || user?.user_metadata?.is_demo;
    if (!activeSchoolId && isDemo) {
      activeSchoolId = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
    }

    if (userId && activeSchoolId) {
      console.log(`🔌 Initializing Teacher Realtime for school: ${activeSchoolId}`);
      realtimeService.initialize(userId, activeSchoolId);

      const handleUpdate = () => {
        forceUpdate();
      };

      (syncEngine as any).on('realtime-update', handleUpdate);

      return () => {
        (syncEngine as any).off('realtime-update', handleUpdate);
        realtimeService.destroy();
      };
    }
  }, [user?.id, schoolId]);

  // Profile State
  const [teacherProfile, setTeacherProfile] = useState<{
    name: string;
    avatarUrl: string;
    schoolGeneratedId?: string;
    schoolId?: string; // Add this
  }>({
    name: 'Teacher',
    avatarUrl: ''
  });

  const fetchProfile = async (optimisticData?: { name: string; avatarUrl: string }) => {
    if (optimisticData) {
      setTeacherProfile(prev => ({ ...prev, ...optimisticData }));
      return;
    }

    try {
      if (!schoolId) return;

      let query = supabase.from('teachers')
        .select('id, name, avatar_url, email, school_generated_id, school_id') // Add school_id
        .eq('school_id', schoolId);

      let emailToQuery = user?.email || currentUser?.email;

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
        // Ultimate Fallback - No numeric ID 2
        console.warn("No auth user found");
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error('Error fetching dashboard profile:', error);

        // Handle permission denied errors (403) for demo users
        if (error.code === '42501' || error.message?.includes('permission denied')) {
          console.warn('⚠️ Permission denied - using demo teacher profile');
          setTeacherId('demo-teacher-id');
          setTeacherProfile({
            name: 'Demo Teacher',
            avatarUrl: undefined
          });
          return; // Exit early
        }

        return;
      }

      if (data) {
        setTeacherId(data.id);
        setTeacherProfile({
          name: data.name || 'Teacher',
          avatarUrl: data.avatar_url,
          schoolGeneratedId: data.school_generated_id,
          schoolId: data.school_id // Set this
        } as any);
      } else if (emailToQuery) {
        // AUTO-HEALING: If no teacher profile found, create one automatically
        // linked to the current school so they are "connected" immediately.
        console.log("⚠️ No teacher profile found. Auto-creating for School:", schoolId);

        try {
          const { data: newTeacher, error: createError } = await supabase
            .from('teachers')
            .insert({
              email: emailToQuery,
              school_id: schoolId,
              name: 'New Teacher', // Default name, can be updated later
              status: 'Active',
              user_id: currentUserId || undefined // Link to auth user if we have it
            })
            .select()
            .single();

          if (createError) {
            console.error("Failed to auto-create teacher profile:", createError);
          } else if (newTeacher) {
            console.log("✅ Auto-created teacher profile!", newTeacher);
            setTeacherId(newTeacher.id);
            setTeacherProfile({
              name: newTeacher.name,
              avatarUrl: newTeacher.avatar_url,
              schoolId: newTeacher.school_id,
              schoolGeneratedId: newTeacher.school_generated_id
            });
            // Force refresh to ensure UI updates
            forceUpdate();
          }
        } catch (healErr) {
          console.error("Auto-heal failed:", healErr);
        }
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
    }
  };

  useEffect(() => {
    fetchProfile();

    // Real-time subscription for profile updates (e.g. Admin edits)
    let profileSubscription: any = null;

    if (teacherId) {
      profileSubscription = supabase
        .channel(`public:teachers:id=eq.${teacherId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'teachers',
            filter: `id=eq.${teacherId}`
          },
          (payload) => {
            console.log('Teacher profile updated externally:', payload);
            fetchProfile(); // Refresh profile data
          }
        )
        .subscribe();
    }

    return () => {
      if (profileSubscription) supabase.removeChannel(profileSubscription);
    };
  }, [currentUser, teacherId]);

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
    timetable: (props: any) => <TimetableScreen {...props} context={{ userType: 'teacher', userId: teacherId || '' }} />,
    chat: (props: any) => <ChatScreen {...props} currentUserId={currentUserId || ''} />,
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
    appointments: (props: any) => <TeacherAppointmentsScreen {...props} teacherId={teacherId || ''} />,
    virtualClass: VirtualClassScreen,
    resources: TeacherResourcesScreen,
    cbtScores: CBTScoresScreen,
    cbtManagement: CBTManagementScreen,
    addStudent: AddStudentScreen,
    quizBuilder: (props: any) => <QuizBuilderScreen {...props} teacherId={teacherId || ''} onClose={handleBack} />,
    classGradebook: (props: any) => <ClassGradebookScreen {...props} teacherId={teacherId || ''} handleBack={handleBack} />,
    lessonNotesUpload: (props: any) => <LessonNotesUploadScreen {...props} teacherId={teacherId || ''} handleBack={handleBack} />,
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
    currentUser: user,
    currentUserId,
    schoolId,
    currentBranchId
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-100">
      {/* Desktop Sidebar - Hidden on mobile/tablet, fixed on desktop (lg+) */}
      <div className="hidden lg:flex w-64 flex-col fixed inset-y-0 left-0 z-50">
        <TeacherSidebar
          activeScreen={activeBottomNav}
          setActiveScreen={handleBottomNavClick}
          onLogout={onLogout}
          schoolName={currentSchool?.name}
          logoUrl={currentSchool?.logoUrl}
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
          customId={formatSchoolId(teacherProfile.schoolGeneratedId || user?.app_metadata?.school_generated_id || user?.user_metadata?.school_generated_id, 'Teacher')}
          userName={teacherProfile.name !== 'Teacher' ? teacherProfile.name : (user?.user_metadata?.name || 'Teacher')}
        />
        <div className="flex-1 overflow-y-auto pb-24 lg:pb-0" style={{ marginTop: '-5rem' }}>
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
