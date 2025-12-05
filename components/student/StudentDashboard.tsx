

import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { DashboardType, Student, StudentAssignment } from '../../types';
import { THEME_CONFIG, ClockIcon, ClipboardListIcon, BellIcon, ChartBarIcon, ChevronRightIcon, SUBJECT_COLORS, BookOpenIcon, MegaphoneIcon, AttendanceSummaryIcon, CalendarIcon, ElearningIcon, StudyBuddyIcon, SparklesIcon, ReceiptIcon, AwardIcon, HelpIcon, GameControllerIcon } from '../../constants';
import Header from '../ui/Header';
import { StudentBottomNav } from '../ui/DashboardBottomNav';
import { mockStudents, mockTimetableData, mockAssignments, mockSubmissions, mockNotices, mockNotifications } from '../../data';
import ErrorBoundary from '../ui/ErrorBoundary';

// Lazy load all view components
const GlobalSearchScreen = lazy(() => import('../shared/GlobalSearchScreen'));
const StudyBuddy = lazy(() => import('../student/StudyBuddy'));
const AdventureQuestHost = lazy(() => import('../student/adventure/AdventureQuestHost'));
const ExamSchedule = lazy(() => import('../shared/ExamSchedule'));
const NoticeboardScreen = lazy(() => import('../shared/NoticeboardScreen'));
const CalendarScreen = lazy(() => import('../shared/CalendarScreen'));
const LibraryScreen = lazy(() => import('../shared/LibraryScreen'));
const CurriculumScreen = lazy(() => import('../shared/CurriculumScreen'));
const TimetableScreen = lazy(() => import('../shared/TimetableScreen'));
const AssignmentsScreen = lazy(() => import('../student/AssignmentsScreen'));
const SubjectsScreen = lazy(() => import('../student/SubjectsScreen'));
const ClassroomScreen = lazy(() => import('../student/ClassroomScreen'));
const AttendanceScreen = lazy(() => import('../student/AttendanceScreen'));
const ResultsScreen = lazy(() => import('../student/ResultsScreen'));
const StudentFinanceScreen = lazy(() => import('../student/StudentFinanceScreen'));
const AchievementsScreen = lazy(() => import('../student/AchievementsScreen'));
const StudentMessagesScreen = lazy(() => import('../student/StudentMessagesScreen'));
const StudentNewChatScreen = lazy(() => import('../student/StudentNewChatScreen'));
const StudentProfileScreen = lazy(() => import('../student/StudentProfileScreen'));
const VideoLessonScreen = lazy(() => import('../student/VideoLessonScreen'));
const AssignmentSubmissionScreen = lazy(() => import('../student/AssignmentSubmissionScreen'));
const AssignmentFeedbackScreen = lazy(() => import('../student/AssignmentFeedbackScreen'));
const AcademicReportScreen = lazy(() => import('../student/AcademicReportScreen'));
const ChatScreen = lazy(() => import('../shared/ChatScreen'));
const ExtracurricularsScreen = lazy(() => import('../student/ExtracurricularsScreen'));
const NotificationsScreen = lazy(() => import('../shared/NotificationsScreen'));
const QuizzesScreen = lazy(() => import('../student/QuizzesScreen'));
const QuizPlayerScreen = lazy(() => import('../student/QuizPlayerScreen'));
const GamesHubScreen = lazy(() => import('../student/games/GamesHubScreen'));
const MathSprintLobbyScreen = lazy(() => import('../student/games/MathSprintLobbyScreen'));
const MathSprintGameScreen = lazy(() => import('../student/games/MathSprintGameScreen'));
const MathSprintResultsScreen = lazy(() => import('../student/games/MathSprintResultsScreen'));
const GamePlayerScreen = lazy(() => import('../shared/GamePlayerScreen'));

const DashboardSuspenseFallback = () => (
    <div className="flex justify-center items-center h-full p-8">
      <div className="w-10 h-10 border-4 border-t-4 border-gray-200 border-t-orange-600 rounded-full animate-spin"></div>
    </div>
);

interface ViewStackItem {
  view: string;
  props?: any;
  title: string;
}

const loggedInStudent: Student = mockStudents.find(s => s.id === 4)!; // Fatima Bello

const TodayFocus: React.FC<{ schedule: any[], assignments: any[], theme: any }> = ({ schedule, assignments, theme }) => {
    return (
        <div className="bg-white p-4 rounded-2xl shadow-sm">
            <h3 className="font-bold text-lg text-gray-800 mb-3">Today's Focus</h3>
            <div className="space-y-3">
                {schedule.length > 0 ? (
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-500">Next Up</h4>
                        {schedule.slice(0,2).map((entry, i) => (
                             <div key={i} className="flex items-center space-x-3">
                                <div className="w-16 text-right">
                                    <p className="font-semibold text-sm text-gray-700">{entry.startTime}</p>
                                </div>
                                <div className={`w-1 h-10 rounded-full ${SUBJECT_COLORS[entry.subject]}`}></div>
                                <p className="font-semibold text-gray-800">{entry.subject}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-center text-gray-500 py-2">No more classes today!</p>
                )}

                <div className="border-t border-gray-100 my-2"></div>

                {assignments.length > 0 ? (
                     <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-500">Assignments Due Soon</h4>
                        {assignments.map(hw => (
                             <div key={hw.id} className="flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-gray-800 text-sm">{hw.title}</p>
                                    <p className="text-xs text-gray-500">{hw.subject} &bull; Due {new Date(hw.dueDate).toLocaleDateString('en-GB')}</p>
                                </div>
                                <ChevronRightIcon className="text-gray-400 h-5 w-5"/>
                            </div>
                        ))}
                    </div>
                ) : (
                     <p className="text-sm text-center text-gray-500 py-2">No assignments due soon. Great work!</p>
                )}
            </div>
        </div>
    );
};

const Overview: React.FC<{ navigateTo: (view: string, title: string, props?: any) => void }> = ({ navigateTo }) => {
    const theme = THEME_CONFIG[DashboardType.Student];
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }) as any;
    const todaySchedule = mockTimetableData
      .filter(e => e.day === today && e.className.includes(`${loggedInStudent.grade}${loggedInStudent.section}`))
      .slice(0, 3);
    
    const upcomingAssignments = useMemo(() => {
        const studentSubmissions = mockSubmissions.filter(s => s.student.id === loggedInStudent.id).map(s => s.assignmentId);
        return mockAssignments
            .filter(a => !studentSubmissions.includes(a.id) && new Date(a.dueDate) > new Date())
            .sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
            .slice(0, 2);
    }, []);

    const quickAccessItems = [
        { label: 'Subjects', icon: <BookOpenIcon />, action: () => navigateTo('subjects', 'My Subjects') },
        { label: 'Timetable', icon: <CalendarIcon />, action: () => navigateTo('timetable', 'Timetable') },
        { label: 'Results', icon: <ChartBarIcon />, action: () => navigateTo('results', 'Academic Performance', { studentId: loggedInStudent.id }) },
        { label: 'Games', icon: <GameControllerIcon />, action: () => navigateTo('gamesHub', 'Games Hub') },
    ];
    
    const aiTools = [
        { label: 'AI Study Buddy', description: 'Stuck on a problem?', color: 'from-purple-500 to-indigo-600', action: () => navigateTo('studyBuddy', 'Study Buddy') },
        { label: 'AI Adventure Quest', description: 'Turn any text into a fun quiz!', color: 'from-teal-400 to-blue-500', action: () => navigateTo('adventureQuest', 'AI Adventure Quest', {}) },
    ];

    return (
        <div className="p-4 lg:p-6 bg-gray-50 min-h-full">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main content */}
                <div className="lg:col-span-2 space-y-6">
                    <TodayFocus schedule={todaySchedule} assignments={upcomingAssignments} theme={theme} />
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2 px-1">AI Tools</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {aiTools.map(tool => (
                                <button key={tool.label} onClick={tool.action} className={`p-4 rounded-2xl shadow-lg text-white bg-gradient-to-r ${tool.color}`}>
                                    <SparklesIcon className="h-6 w-6 mb-2"/>
                                    <h4 className="font-bold text-left">{tool.label}</h4>
                                    <p className="text-xs opacity-90 text-left">{tool.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                {/* Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2 px-1">Quick Actions</h3>
                        <div className="grid grid-cols-2 gap-3 text-center">
                            {quickAccessItems.map(item => (
                                <button key={item.label} onClick={item.action} className="bg-white p-3 rounded-2xl shadow-sm flex flex-col items-center justify-center space-y-2 hover:bg-orange-100 transition-colors">
                                    <div className={theme.iconColor}>{React.cloneElement(item.icon, { className: 'h-7 w-7' })}</div>
                                    <span className={`font-semibold ${theme.textColor} text-center text-xs`}>{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface StudentDashboardProps {
    onLogout: () => void;
    setIsHomePage: (isHome: boolean) => void;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ onLogout, setIsHomePage }) => {
    const [viewStack, setViewStack] = useState<ViewStackItem[]>([{ view: 'overview', title: 'Student Dashboard' }]);
    const [activeBottomNav, setActiveBottomNav] = useState('home');
    const [version, setVersion] = useState(0);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const forceUpdate = () => setVersion(v => v + 1);
    const notificationCount = mockNotifications.filter(n => !n.isRead && n.audience.includes('student')).length;
    
    useEffect(() => {
        const currentView = viewStack[viewStack.length - 1];
        setIsHomePage(currentView.view === 'overview' && !isSearchOpen);
    }, [viewStack, isSearchOpen, setIsHomePage]);
    
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
        switch(screen) {
            case 'home':
                setViewStack([{ view: 'overview', title: 'Student Dashboard' }]);
                break;
            case 'results':
                setViewStack([{ view: 'results', title: 'Academic Performance', props: { studentId: loggedInStudent.id } }]);
                break;
            case 'games':
                setViewStack([{ view: 'gamesHub', title: 'Games Hub' }]);
                break;
            case 'messages':
                setViewStack([{ view: 'messages', title: 'Messages' }]);
                break;
            case 'profile':
                setViewStack([{ view: 'profile', title: 'My Profile', props: { student: loggedInStudent } }]);
                break;
            default:
                setViewStack([{ view: 'overview', title: 'Student Dashboard' }]);
        }
    };

    const handleNotificationClick = () => {
        navigateTo('notifications', 'Notifications', {});
    };
    
    const viewComponents = React.useMemo(() => ({
        overview: Overview,
        studyBuddy: StudyBuddy,
        adventureQuest: AdventureQuestHost,
        examSchedule: ExamSchedule,
        noticeboard: (props: any) => <NoticeboardScreen {...props} userType="student" />,
        calendar: (props: any) => <CalendarScreen {...props} birthdayHighlights={loggedInStudent.birthday ? [{ date: loggedInStudent.birthday, label: 'Your Birthday' }] : []} />,
        library: LibraryScreen,
        curriculum: CurriculumScreen,
        timetable: (props: any) => <TimetableScreen {...props} context={{ userType: 'student', userId: loggedInStudent.id }} />,
        assignments: AssignmentsScreen,
        subjects: SubjectsScreen,
        classroom: ClassroomScreen,
        attendance: AttendanceScreen,
        results: ResultsScreen,
        finances: StudentFinanceScreen,
        achievements: AchievementsScreen,
        messages: StudentMessagesScreen,
        newChat: StudentNewChatScreen,
        profile: StudentProfileScreen,
        videoLesson: VideoLessonScreen,
        assignmentSubmission: AssignmentSubmissionScreen,
        assignmentFeedback: AssignmentFeedbackScreen,
        academicReport: AcademicReportScreen,
        chat: (props: any) => <ChatScreen {...props} currentUserId={loggedInStudent.id} />,
        extracurriculars: ExtracurricularsScreen,
        notifications: (props: any) => <NotificationsScreen {...props} userType="student" navigateTo={navigateTo} />,
        quizzes: QuizzesScreen,
        quizPlayer: QuizPlayerScreen,
        gamesHub: GamesHubScreen,
        mathSprintLobby: MathSprintLobbyScreen,
        mathSprintGame: MathSprintGameScreen,
        mathSprintResults: MathSprintResultsScreen,
        gamePlayer: GamePlayerScreen,
    }), []);

    const currentNavigation = viewStack[viewStack.length - 1];
    const ComponentToRender = viewComponents[currentNavigation.view as keyof typeof viewComponents];
    const commonProps = {
        navigateTo,
        handleBack,
        forceUpdate,
    };

    return (
        <div className="flex flex-col h-full bg-gray-100 relative">
            <Header
                title={currentNavigation.title}
                avatarUrl={loggedInStudent.avatarUrl}
                bgColor={THEME_CONFIG[DashboardType.Student].mainBg}
                onLogout={onLogout}
                onBack={viewStack.length > 1 ? handleBack : undefined}
                onNotificationClick={handleNotificationClick}
                notificationCount={notificationCount}
                onSearchClick={() => setIsSearchOpen(true)}
            />
            <div className="flex-grow overflow-y-auto h-full" style={{marginTop: '-4rem'}}>
                <div className="pt-16 h-full">
                    <ErrorBoundary>
                        <div key={`${viewStack.length}-${version}`} className="animate-slide-in-up h-full">
                            {ComponentToRender ? (
                                <ComponentToRender {...currentNavigation.props} studentId={loggedInStudent.id} {...commonProps} />
                            ) : (
                                <div className="p-6">View not found: {currentNavigation.view}</div>
                            )}
                        </div>
                    </ErrorBoundary>
                </div>
            </div>
            <StudentBottomNav activeScreen={activeBottomNav} setActiveScreen={handleBottomNavClick} />
            <Suspense fallback={<DashboardSuspenseFallback />}>
                {isSearchOpen && (
                    <GlobalSearchScreen 
                        dashboardType={DashboardType.Student}
                        navigateTo={navigateTo}
                        onClose={() => setIsSearchOpen(false)}
                    />
                )}
            </Suspense>
        </div>
    );
};

export default StudentDashboard;