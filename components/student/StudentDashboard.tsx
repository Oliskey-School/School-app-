

import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { DashboardType, Student, StudentAssignment } from '../../types';
import { THEME_CONFIG, ClockIcon, ClipboardListIcon, BellIcon, ChartBarIcon, ChevronRightIcon, SUBJECT_COLORS, BookOpenIcon, MegaphoneIcon, AttendanceSummaryIcon, CalendarIcon, ElearningIcon, StudyBuddyIcon, SparklesIcon, ReceiptIcon, AwardIcon, HelpIcon, GameControllerIcon } from '../../constants';
import Header from '../ui/Header';
import { StudentBottomNav } from '../ui/DashboardBottomNav';
// import { mockNotifications } from '../../data'; // REMOVED
import { } from '../../data'; // Ensure no mocks imported
import ErrorBoundary from '../ui/ErrorBoundary';
import { StudentSidebar } from '../ui/DashboardSidebar';

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
const StudentNewChatScreen = lazy(() => import('../student/NewMessageScreen'));
const EditProfileScreen = lazy(() => import('../shared/EditProfileScreen'));
import StudentProfileEnhanced from './StudentProfileEnhanced';
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

import { supabase } from '../../lib/supabase';

// ... (other imports remain)

// Remove global loggedInStudent

const TodayFocus: React.FC<{ schedule: any[], assignments: any[], theme: any, navigateTo: (view: string, title: string, props?: any) => void }> = ({ schedule, assignments, theme, navigateTo }) => {
    const formatTime = (timeStr: string) => {
        if (!timeStr) return '';
        // If it's full date string or just time
        return timeStr.includes('T') ? new Date(timeStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : timeStr.substring(0, 5);
    };

    return (
        <div className="bg-white p-4 rounded-2xl shadow-sm">
            <h3 className="font-bold text-lg text-gray-800 mb-3">Today's Focus</h3>
            <div className="space-y-3">
                {schedule.length > 0 ? (
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-500">Next Up</h4>
                        {schedule.slice(0, 2).map((entry, i) => (
                            <div key={i} className="flex items-center space-x-3">
                                <div className="w-16 text-right">
                                    <p className="font-semibold text-sm text-gray-700">{entry.start_time || entry.startTime}</p>
                                </div>
                                <div className={`w-1 h-10 rounded-full ${SUBJECT_COLORS[entry.subject] || 'bg-gray-400'}`}></div>
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
                            <button
                                key={hw.id}
                                onClick={() => navigateTo('assignmentSubmission', 'Submit Assignment', { assignment: hw })}
                                className="w-full flex justify-between items-center p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                            >
                                <div>
                                    <p className="font-bold text-gray-800 text-sm">{hw.title}</p>
                                    <p className="text-xs text-gray-500">{hw.subject} &bull; Due {new Date(hw.due_date || hw.dueDate).toLocaleDateString('en-GB')}</p>
                                </div>
                                <ChevronRightIcon className="text-gray-400 h-5 w-5" />
                            </button>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-center text-gray-500 py-2">No assignments due soon. Great work!</p>
                )}
            </div>
        </div>
    );
};

const Overview: React.FC<{ navigateTo: (view: string, title: string, props?: any) => void; student: Student }> = ({ navigateTo, student }) => {
    const theme = THEME_CONFIG[DashboardType.Student];
    const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
    const [upcomingAssignments, setUpcomingAssignments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

                const timetablePromise = supabase
                    .from('timetable')
                    .select('*')
                    .eq('day', today)
                    .ilike('class_name', `%${student.grade}%`)
                    .order('start_time', { ascending: true })
                    .limit(3);

                const assignmentsPromise = supabase
                    .from('assignments')
                    .select('*')
                    .gt('due_date', new Date().toISOString())
                    .order('due_date', { ascending: true })
                    .limit(2);

                const [timetableResult, assignmentsResult] = await Promise.all([timetablePromise, assignmentsPromise]);

                if (timetableResult.data) setTodaySchedule(timetableResult.data);
                if (assignmentsResult.data) setUpcomingAssignments(assignmentsResult.data);

            } catch (err) {
                console.error('Error fetching overview data:', err);
            } finally {
                setLoading(false);
            }
        };

        if (student) fetchData();
    }, [student]);

    const quickAccessItems = [
        { label: 'Subjects', icon: <BookOpenIcon />, action: () => navigateTo('subjects', 'My Subjects') },
        { label: 'Timetable', icon: <CalendarIcon />, action: () => navigateTo('timetable', 'Timetable') },
        { label: 'Results', icon: <ChartBarIcon />, action: () => navigateTo('results', 'Academic Performance', { studentId: student.id }) },
        { label: 'Games', icon: <GameControllerIcon />, action: () => navigateTo('gamesHub', 'Games Hub') },
    ];

    const aiTools = [
        { label: 'AI Study Buddy', description: 'Stuck on a problem?', color: 'from-purple-500 to-indigo-600', action: () => navigateTo('studyBuddy', 'Study Buddy') },
        { label: 'AI Adventure Quest', description: 'Turn any text into a fun quiz!', color: 'from-teal-400 to-blue-500', action: () => navigateTo('adventureQuest', 'AI Adventure Quest', {}) },
    ];

    if (loading) return <div className="p-8 text-center text-gray-500">Loading overview...</div>;

    return (
        <div className="p-4 lg:p-6 bg-gray-50 min-h-full">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main content */}
                <div className="lg:col-span-2 space-y-6">
                    <TodayFocus schedule={todaySchedule} assignments={upcomingAssignments} theme={theme} navigateTo={navigateTo} />
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2 px-1">AI Tools</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {aiTools.map(tool => (
                                <button key={tool.label} onClick={tool.action} className={`p-4 rounded-2xl shadow-lg text-white bg-gradient-to-r ${tool.color}`}>
                                    <SparklesIcon className="h-6 w-6 mb-2" />
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
    currentUser: any;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ onLogout, setIsHomePage, currentUser }) => {
    const [viewStack, setViewStack] = useState<ViewStackItem[]>([{ view: 'overview', title: 'Student Dashboard' }]);
    const [activeBottomNav, setActiveBottomNav] = useState('home');
    const [version, setVersion] = useState(0);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // State for student data
    const [student, setStudent] = useState<Student | null>(null);
    const [loadingStudent, setLoadingStudent] = useState(true);
    const [notificationCount, setNotificationCount] = useState(0);

    const forceUpdate = () => setVersion(v => v + 1);

    useEffect(() => {
        const fetchStudentAndNotifications = async () => {
            try {
                if (!currentUser?.email) {
                    setLoadingStudent(false);
                    return;
                }

                // Check if this looks like a demo/quick login email
                const isDemoEmail = currentUser.email?.endsWith('@school.com') ||
                    currentUser.email?.includes('student') ||
                    currentUser.email?.includes('demo');

                // Helper to create demo student fallback
                const createDemoStudent = (): Student => ({
                    id: 1,
                    name: currentUser.user_metadata?.full_name || 'Demo Student',
                    grade: 10,
                    section: 'A',
                    avatarUrl: 'https://i.pravatar.cc/150?img=1',
                    email: currentUser.email,
                    department: 'Science',
                    attendanceStatus: 'Present',
                } as Student);

                // 1. Try to fetch Student Data by user_id
                let studentData = null;
                try {
                    const { data: students, error: studentsError } = await supabase
                        .from('students')
                        .select('*')
                        .eq('user_id', currentUser.id)
                        .maybeSingle();

                    studentData = students;

                    // Fallback lookup by email if user_id didn't work
                    if (!studentData && currentUser.email) {
                        const { data: byEmail } = await supabase
                            .from('students')
                            .select('*')
                            .eq('email', currentUser.email)
                            .maybeSingle();
                        if (byEmail) studentData = byEmail;
                    }
                } catch (dbError) {
                    console.warn('Database query failed:', dbError);
                }

                if (studentData) {
                    const mappedStudent: Student = {
                        ...studentData,
                        id: studentData.id,
                        name: studentData.name,
                        grade: studentData.grade,
                        section: studentData.section,
                        avatarUrl: studentData.avatar_url,
                    } as any;

                    // Update state immediately when student is found
                    setStudent(mappedStudent);

                    // 2. Fetch Notifications in parallel
                    try {
                        const { count, error: notifError } = await supabase
                            .from('notifications')
                            .select('*', { count: 'exact', head: true })
                            .eq('user_id', currentUser.id)
                            .eq('is_read', false);

                        if (!notifError) {
                            setNotificationCount(count || 0);
                        }
                    } catch (notifError) {
                        console.warn('Could not fetch notifications:', notifError);
                    }
                } else if (isDemoEmail) {
                    // Use demo student fallback for quick logins
                    console.log('Using demo student fallback for:', currentUser.email);
                    setStudent(createDemoStudent());
                } else {
                    console.warn('No linked student profile found.');
                }

            } catch (e) {
                console.error('Error loading dashboard:', e);
                // Final fallback for demo emails even on error
                const isDemoEmail = currentUser?.email?.endsWith('@school.com') ||
                    currentUser?.email?.includes('student') ||
                    currentUser?.email?.includes('demo');
                if (isDemoEmail) {
                    console.log('Error occurred, using demo student fallback');
                    setStudent({
                        id: 1,
                        name: 'Demo Student',
                        grade: 10,
                        section: 'A',
                        avatarUrl: 'https://i.pravatar.cc/150?img=1',
                        email: currentUser?.email || '',
                        department: 'Science',
                        attendanceStatus: 'Present',
                    } as Student);
                }
            } finally {
                setLoadingStudent(false);
            }
        };
        fetchStudentAndNotifications();
    }, [currentUser]);

    useEffect(() => {
        const currentView = viewStack[viewStack.length - 1];
        setIsHomePage(currentView.view === 'overview' && !isSearchOpen);

        // Sync bottom nav state
        const viewToNavMap: Record<string, string> = {
            overview: 'home',
            subjects: 'home',
            timetable: 'home',
            results: 'results',
            quizzes: 'quizzes',
            quizPlayer: 'quizzes',
            gamesHub: 'games',
            mathSprintLobby: 'games',
            mathSprintGame: 'games',
            mathSprintResults: 'games',
            gamePlayer: 'games',
            messages: 'messages',
            newChat: 'messages',
            chat: 'messages',
            profile: 'profile',
        };

        const targetNav = viewToNavMap[currentView.view];
        if (targetNav) {
            setActiveBottomNav(targetNav);
        }
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
        if (!student) return;
        setActiveBottomNav(screen);
        switch (screen) {
            case 'home':
                setViewStack([{ view: 'overview', title: 'Student Dashboard' }]);
                break;
            case 'quizzes':
                setViewStack([{ view: 'quizzes', title: 'Assessments & Quizzes' }]);
                break;
            case 'results':
                setViewStack([{ view: 'results', title: 'Academic Performance', props: { studentId: student.id } }]);
                break;
            case 'games':
                setViewStack([{ view: 'gamesHub', title: 'Games Hub' }]);
                break;
            case 'messages':
                setViewStack([{ view: 'messages', title: 'Messages' }]);
                break;
            case 'profile':
                setViewStack([{ view: 'profile', title: 'My Profile', props: {} }]);
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
        calendar: (props: any) => <CalendarScreen {...props} birthdayHighlights={student?.birthday ? [{ date: student.birthday, label: 'Your Birthday' }] : []} />,
        library: LibraryScreen,
        curriculum: CurriculumScreen,
        timetable: (props: any) => <TimetableScreen {...props} context={{ userType: 'student', userId: student?.id }} />,
        assignments: AssignmentsScreen,
        subjects: SubjectsScreen,
        classroom: ClassroomScreen,
        attendance: AttendanceScreen,
        results: ResultsScreen,
        finances: StudentFinanceScreen,
        achievements: AchievementsScreen,
        messages: StudentMessagesScreen,
        newChat: StudentNewChatScreen,
        profile: (props: any) => <StudentProfileEnhanced
            {...props}
            studentId={student?.id}
            student={student} // Will be passed by commonProps but explicit here is fine
            onLogout={onLogout}
            {...commonProps}
        />,
        videoLesson: VideoLessonScreen,
        assignmentSubmission: AssignmentSubmissionScreen,
        assignmentFeedback: AssignmentFeedbackScreen,
        academicReport: AcademicReportScreen,
        chat: (props: any) => <ChatScreen {...props} currentUserId={student?.id} />,
        extracurriculars: ExtracurricularsScreen,
        notifications: (props: any) => <NotificationsScreen {...props} userType="student" navigateTo={navigateTo} />,
        quizzes: QuizzesScreen,
        quizPlayer: QuizPlayerScreen,
        gamesHub: GamesHubScreen,
        mathSprintLobby: MathSprintLobbyScreen,
        mathSprintGame: MathSprintGameScreen,
        mathSprintResults: MathSprintResultsScreen,
        gamePlayer: GamePlayerScreen,
    }), [student]);

    // Optimistic UI: Only show full loading spinner if we are loading AND have no student data
    if (loadingStudent && !student) {
        return <div className="flex h-screen w-full items-center justify-center bg-gray-50">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-500 font-semibold">Loading your dashboard...</p>
            </div>
        </div>;
    }

    if (!student) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-gray-50">
                <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">🎓</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Student Profile Not Found</h2>
                    <p className="text-gray-600 mb-6">
                        We couldn't find a student record linked to your account.
                        Please contact the school administrator to set up your student profile.
                    </p>
                    <div className="flex flex-col gap-3 w-full">
                        <button
                            onClick={onLogout}
                            className="w-full py-3 px-4 bg-white text-gray-700 border border-gray-200 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            Back to Login
                        </button>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-400">User ID: {currentUser?.id || 'N/A'}</p>
                    </div>
                </div>
            </div>
        );
    }

    const currentNavigation = viewStack[viewStack.length - 1];
    const ComponentToRender = viewComponents[currentNavigation.view as keyof typeof viewComponents];
    const commonProps = {
        navigateTo,
        handleBack,
        forceUpdate,
    };


    return (
        <div className="flex h-screen w-full overflow-hidden bg-gray-50">
            {/* Desktop Sidebar - Hidden on mobile, fixed on desktop */}
            <div className="hidden md:flex w-64 flex-col fixed inset-y-0 left-0 z-50">
                <StudentSidebar
                    activeScreen={activeBottomNav} // Using existing state for active screen
                    setActiveScreen={handleBottomNavClick} // Reuse existing handler
                    onLogout={onLogout}
                />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen w-full md:ml-64 overflow-hidden">
                <Header
                    title={currentNavigation.title}
                    avatarUrl={student.avatarUrl}
                    bgColor={THEME_CONFIG[DashboardType.Student].mainBg}
                    onLogout={onLogout}
                    onBack={viewStack.length > 1 ? handleBack : undefined}
                    onNotificationClick={handleNotificationClick}
                    notificationCount={notificationCount}
                    onSearchClick={() => setIsSearchOpen(true)}
                />

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto" style={{ marginTop: '-4rem' }}>
                    <div className="pt-16 min-h-full pb-20 md:pb-6">
                        {/* pb-20 only on mobile to clear bottom nav, md:pb-6 for desktop spacing */}
                        <ErrorBoundary>
                            <div key={`${viewStack.length}-${version}`} className="animate-slide-in-up">
                                <Suspense fallback={<DashboardSuspenseFallback />}>
                                    {ComponentToRender ? (
                                        <ComponentToRender {...currentNavigation.props} studentId={student.id} student={student} {...commonProps} />
                                    ) : (
                                        <div className="p-6">View not found: {currentNavigation.view}</div>
                                    )}
                                </Suspense>
                            </div>
                        </ErrorBoundary>
                    </div>
                </div>

                {/* Mobile Bottom Nav - Hidden on desktop */}
                <div className="md:hidden">
                    <StudentBottomNav activeScreen={activeBottomNav} setActiveScreen={handleBottomNavClick} />
                </div>

                {/* Search Overlay */}
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
        </div>
    );

};

export default StudentDashboard;