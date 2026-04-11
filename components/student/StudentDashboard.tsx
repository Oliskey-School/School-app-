
import React, { useState, useMemo, useEffect, useRef, lazy, Suspense, useCallback } from 'react';
import { useAutoSync } from '../../hooks/useAutoSync';
import { api } from '../../lib/api';
import { DashboardType, Student, StudentAssignment } from '../../types';
import { formatSchoolId } from '../../utils/idFormatter';
import { THEME_CONFIG, ClockIcon, ClipboardListIcon, BellIcon, ChartBarIcon, ChevronRightIcon, SUBJECT_COLORS, BookOpenIcon, MegaphoneIcon, AttendanceSummaryIcon, CalendarIcon, ElearningIcon, StudyBuddyIcon, SparklesIcon, ReceiptIcon, AwardIcon, HelpIcon, GameControllerIcon } from '../../constants';
import Header from '../ui/Header';
import { StudentBottomNav } from '../ui/DashboardBottomNav';
// import { mockNotifications } from '../../data'; // REMOVED
import { } from '../../data'; // Ensure no mocks imported
import ErrorBoundary from '../ui/ErrorBoundary';
import { StudentSidebar } from '../ui/DashboardSidebar';
import DashboardLayout from '../layout/DashboardLayout';
import PremiumLoader from '../ui/PremiumLoader';
import { GamificationProvider } from '../../context/GamificationContext';
import { realtimeService } from '../../services/RealtimeService';
import { syncEngine } from '../../lib/syncEngine';
import { toast } from 'react-hot-toast';
import { offlineStorage } from '../../lib/offlineStorage';
import { useOnlineStatus, OfflineIndicator } from '../shared/OfflineIndicator';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';
import { useAuth } from '../../context/AuthContext';

// Lazy load all view components
import IncomingClassModal from './IncomingClassModal'; // Import non-lazy for speed/critical alert
const GlobalSearchScreen = lazy(() => import('../shared/GlobalSearchScreen'));
import EmailVerificationPrompt from '../auth/EmailVerificationPrompt';
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
const VirtualClassroom = lazy(() => import('../video/VirtualClassroom'));
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
const GamesHubScreen = lazy(() => import('./games/GamesHubScreen'));
const MathSprintLobbyScreen = lazy(() => import('./games/MathSprintLobbyScreen'));
const MathSprintGameScreen = lazy(() => import('./games/MathSprintGameScreen'));
const MathSprintResultsScreen = lazy(() => import('./games/MathSprintResultsScreen'));
const GeoGuesserLobbyScreen = lazy(() => import('./games/GeoGuesserLobbyScreen'));
const GeoGuesserGameScreen = lazy(() => import('./games/GeoGuesserGameScreen'));
const CodeChallengeLobbyScreen = lazy(() => import('./games/CodeChallengeLobbyScreen'));
const CodeChallengeGameScreen = lazy(() => import('./games/CodeChallengeGameScreen'));
const PeekabooLettersGame = lazy(() => import('./games/PeekabooLettersGame'));
const MathBattleArenaGame = lazy(() => import('./games/MathBattleArenaGame'));
const CountingShapesTapGame = lazy(() => import('./games/CountingShapesTapGame'));
const SimonSaysGame = lazy(() => import('./games/SimonSaysGame'));
const AlphabetFishingGame = lazy(() => import('./games/AlphabetFishingGame'));
const BeanBagTossGame = lazy(() => import('./games/BeanBagTossGame'));
const RedLightGreenLightGame = lazy(() => import('./games/RedLightGreenLightGame'));
const SpellingSparkleGame = lazy(() => import('./games/SpellingSparkleGame'));
const VocabularyAdventureGame = lazy(() => import('./games/VocabularyAdventureGame'));
const VirtualScienceLabGame = lazy(() => import('./games/VirtualScienceLabGame'));
const DebateDashGame = lazy(() => import('./games/DebateDashGame'));
const GeometryJeopardyGame = lazy(() => import('./games/GeometryJeopardyGame'));
const SharkTankGame = lazy(() => import('./games/SharkTankGame'));
const PhysicsLabGame = lazy(() => import('./games/PhysicsLabGame'));
const StockMarketGame = lazy(() => import('./games/StockMarketGame'));
const CBTExamGame = lazy(() => import('./games/CBTExamGame'));
const VocabularyPictionaryGame = lazy(() => import('./games/VocabularyPictionaryGame'));
const SimpleMachineScavengerHuntGame = lazy(() => import('./games/SimpleMachineScavengerHuntGame'));
const HistoricalHotSeatGame = lazy(() => import('./games/HistoricalHotSeatGame'));
const VocabularyNinjaGame = lazy(() => import('./games/VocabularyNinjaGame'));
const SchoolUtilitiesScreen = lazy(() => import('../parent/SchoolUtilitiesScreen'));
const GamePlayerScreen = lazy(() => import('../shared/GamePlayerScreen'));
const StudentCBTListScreen = lazy(() => import('./cbt/StudentCBTListScreen'));
const StudentCBTPlayerScreen = lazy(() => import('./cbt/StudentCBTPlayerScreen'));

const DashboardSuspenseFallback = () => (
    <PremiumLoader message="Loading dashboard module..." />
);

interface ViewStackItem {
    view: string;
    props?: any;
    title: string;
}

import { NextUpTask } from './NextUpTask';

const TodayFocus: React.FC<{
    schedule: any[],
    assignments: any[],
    quizzes: any[],
    theme: any,
    navigateTo: (view: string, title: string, props?: any) => void,
    student: Student
}> = ({ schedule, assignments, quizzes, theme, navigateTo, student }) => {
    
    // Determine the highest priority task
    const nextTask = useMemo(() => {
        if (assignments.length > 0) {
            const hw = assignments[0];
            return {
                title: hw.title,
                subject: hw.subject || 'General',
                dueDate: new Date(hw.due_date || hw.dueDate).toLocaleDateString('en-GB'),
                timeRemaining: '2 days', // In a real app, calculate this
                type: 'assignment' as const,
                onClick: () => navigateTo('assignmentSubmission', 'Submit Assignment', { assignment: hw })
            };
        }
        if (quizzes.length > 0) {
            const quiz = quizzes[0];
            return {
                title: quiz.title,
                subject: quiz.subject || quiz.subjects?.name || 'General',
                dueDate: quiz.start_time ? new Date(quiz.start_time).toLocaleDateString('en-GB') : 'Now',
                timeRemaining: 'Today',
                type: 'quiz' as const,
                onClick: () => navigateTo('quizPlayer', quiz.title, { quizId: quiz.id, student })
            };
        }
        return null;
    }, [assignments, quizzes, navigateTo, student]);

    return (
        <div className="space-y-4">
            <h3 className="font-bold text-lg text-gray-800 ml-1">Your Focus</h3>
            
            {nextTask ? (
                <NextUpTask {...nextTask} />
            ) : (
                <div className="bg-white p-6 rounded-3xl shadow-sm text-center">
                    <SparklesIcon className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                    <p className="text-gray-600 font-medium">You're all caught up!</p>
                    <p className="text-xs text-gray-400 mt-1">Enjoy your free time or explore the library.</p>
                </div>
            )}

            {/* Compact Schedule Preview */}
            {schedule.length > 0 && (
                <div className="bg-white p-4 rounded-2xl shadow-sm">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Today's Schedule</h4>
                    <div className="space-y-3">
                        {schedule.slice(0, 3).map((entry, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className="text-xs font-bold text-gray-500 w-12">{entry.start_time || entry.startTime}</span>
                                <div className={`w-1 h-8 rounded-full ${SUBJECT_COLORS[entry.subject] || 'bg-indigo-400'}`} />
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-gray-800 leading-none">{entry.subject}</p>
                                    <p className="text-[10px] text-gray-400 mt-1">{entry.class_name}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const Overview: React.FC<{
    navigateTo: (view: string, title: string, props?: any) => void;
    student: Student;
    schoolId: string;
    currentBranchId: string | null;
    currentUser: any;
    forceUpdate: () => void;
}> = ({ navigateTo, student, schoolId, currentBranchId, currentUser, forceUpdate }) => {
    const theme = THEME_CONFIG[DashboardType.Student];
    const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
    const [upcomingAssignments, setUpcomingAssignments] = useState<any[]>([]);
    const [upcomingQuizzes, setUpcomingQuizzes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await api.getMyDashboardOverview();

            if (data) {
                setTodaySchedule(data.timetable || []);
                setUpcomingAssignments(data.assignments || []);
                setUpcomingQuizzes(data.quizzes || []);
            }
        } catch (err) {
            console.error('Error fetching dashboard overview:', err);
            setTodaySchedule([]);
            setUpcomingAssignments([]);
            setUpcomingQuizzes([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Real-time synchronization
    useAutoSync(['assignments', 'quizzes', 'timetable'], fetchData);

    useEffect(() => {
        if (student) {
            fetchData();
        }
    }, [student, fetchData]);

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
                    {!currentUser?.user_metadata?.email_verified && (
                        <EmailVerificationPrompt />
                    )}


                    <TodayFocus
                        schedule={todaySchedule}
                        assignments={upcomingAssignments}
                        quizzes={upcomingQuizzes}
                        theme={theme}
                        navigateTo={navigateTo}
                        student={student}
                    />
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2 px-1">AI Tools</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {aiTools.map(tool => (
                                <button key={tool.label} onClick={tool.action} className={`p-4 rounded-2xl shadow-lg text-white bg-gradient-to-r ${tool.color} transition-transform active:scale-[0.98]`}>
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
                        <div className="grid grid-cols-3 gap-3 text-center">
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
    onLogout?: () => void;
    setIsHomePage?: (isHome: boolean) => void;
    currentUser?: any;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ onLogout, setIsHomePage, currentUser }) => {
    const [scrolled, setScrolled] = useState(false);
    const [viewStack, setViewStack] = useState<ViewStackItem[]>([{ view: 'overview', title: 'Student Dashboard', props: {} }]);
    const [activeBottomNav, setActiveBottomNav] = useState('home');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const { currentSchool, currentBranchId, user } = useAuth();
    const schoolId = currentSchool?.id;


    // State for student data
    const [student, setStudent] = useState<Student | null>(null);
    const [loadingStudent, setLoadingStudent] = useState(true);
    const [isRevalidating, setIsRevalidating] = useState(false);
    const isOnline = useOnlineStatus();
    const [version, setVersion] = useState(0);
    const isFetchingRef = useRef(false); // Guard against infinite loops

    // Real-time notifications
    const notificationCount = useRealtimeNotifications('student');

    const forceUpdate = () => setVersion(v => v + 1);

    const fetchStudentAndNotifications = useCallback(async () => {
        if (isFetchingRef.current) return;
        if (!currentUser?.id) {
            setLoadingStudent(false);
            return;
        }

        isFetchingRef.current = true;
        const cacheKey = `student_profile_${currentUser.id}`;

        try {
            const cachedStudent = await offlineStorage.load<Student>(cacheKey);

            if (cachedStudent) {
                setStudent(cachedStudent);
                setLoadingStudent(false);
                if (isOnline) setIsRevalidating(true);
            } else {
                setLoadingStudent(true);
            }

            if (!isOnline && cachedStudent) {
                setIsRevalidating(false);
                return;
            }

            // Strictly use Hybrid API
            console.log("Fetching student profile via Hybrid API for user:", currentUser?.id);
            const studentData = await api.getMyStudentProfile();

            if (studentData) {
                const mappedStudent: Student = {
                    ...studentData,
                    id: studentData.id,
                    name: studentData.name || studentData.full_name || '',
                    grade: studentData.grade,
                    section: studentData.section,
                    avatarUrl: studentData.avatar_url || studentData.avatarUrl,
                    school_generated_id: studentData.school_generated_id,
                    schoolGeneratedId: studentData.school_generated_id,
                    schoolId: studentData.school_id || studentData.schoolId,
                } as any;

                setStudent(mappedStudent);
                await offlineStorage.save(cacheKey, mappedStudent);
            } else {
                console.warn("No student profile found for this user.");
                setStudent(null);
            }

        } catch (e) {
            console.error('Error loading dashboard profile:', e);
            if (!student) setStudent(null);
        } finally {
            setLoadingStudent(false);
            setIsRevalidating(false);
            isFetchingRef.current = false;
        }
    }, [currentUser?.id, isOnline, student]);

    // Real-time synchronization for student profile
    useAutoSync(['students'], fetchStudentAndNotifications);

    useEffect(() => {
        fetchStudentAndNotifications();
    }, [fetchStudentAndNotifications]);

    useEffect(() => {
        const currentView = viewStack[viewStack.length - 1];
        setIsHomePage(currentView?.view === 'overview' && !isSearchOpen);

        // Sync bottom nav state
        const viewToNavMap: Record<string, string> = {
            overview: 'home',
            subjects: 'home',
            timetable: 'home',
            results: 'results',
            quizzes: 'quizzes',
            quizPlayer: 'quizzes',
            cbtList: 'quizzes',
            cbtPlayer: 'quizzes',
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

    const scrollContainerRef = React.useRef<HTMLDivElement>(null);

    const navigateTo = (view: string, title: string, props: any = {}) => {
        React.startTransition(() => {
            setViewStack(stack => [...stack, { view, props, title }]);
        });
        // Scroll to top on navigation
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo(0, 0);
        }
    };

    const handleBack = () => {
        React.startTransition(() => {
            if (viewStack.length > 1) {
                setViewStack(stack => stack.slice(0, -1));
            } else {
                // Fallback: If we are stuck, go to overview
                setViewStack([{ view: 'overview', title: 'Student Dashboard' }]);
            }
        });
        // Scroll to top on back navigation
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo(0, 0);
        }
    };

    const handleBottomNavClick = (screen: string) => {
        if (!student) return;
        
        React.startTransition(() => {
            setActiveBottomNav(screen);

            // Reset scroll when switching tabs via bottom nav
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTo(0, 0);
            }

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
        });
    };

    const handleNotificationClick = () => {
        navigateTo('notifications', 'Notifications', {});
    };

    const commonProps = {
        navigateTo,
        handleBack,
        forceUpdate,
        currentUserId: currentUser?.id,
        schoolId,
        currentBranchId
    };

    const viewComponents = React.useMemo(() => ({
        overview: (props: any) => <Overview {...props} schoolId={schoolId || ''} currentBranchId={currentBranchId} currentUser={currentUser} forceUpdate={forceUpdate} />,
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
        liveClass: (props: any) => <VirtualClassroom {...props} userRole="student" userId={student?.id} />,
        attendance: AttendanceScreen,
        results: ResultsScreen,
        finances: StudentFinanceScreen,
        achievements: AchievementsScreen,
        messages: (props: any) => {
            const { navigateTo } = props;
            return (
                <StudentMessagesScreen
                    {...props}
                    onSelectChat={(conversation: any) => navigateTo('chat', conversation.participant?.name || 'Chat', { conversation })}
                    onNewChat={() => navigateTo('newChat', 'New Chat')}
                />
            );
        },
        newChat: StudentNewChatScreen,
        profile: (props: any) => <StudentProfileEnhanced
            {...props}
            studentId={student?.id}
            student={student} // Will be passed by commonProps but explicit here is fine
            onLogout={onLogout}
            {...commonProps}
        />,
        editProfile: (props: any) => <EditProfileScreen
            user={student ? {
                ...student,
                code: student.schoolGeneratedId || student.schoolId
            } : undefined}
            {...props}
            onBack={handleBack}
            onProfileUpdate={(updatedData) => {
                if (student) {
                    const newStudent = { ...student, name: updatedData.name, avatarUrl: updatedData.avatarUrl };
                    setStudent(newStudent);
                    // Update cache for persistence
                    offlineStorage.save(`student_dashboard_${currentUser?.id}`, newStudent);
                }
            }}
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
        geoGuesserLobby: GeoGuesserLobbyScreen,
        geoGuesserGame: GeoGuesserGameScreen,
        codeChallengeLobby: CodeChallengeLobbyScreen,
        codeChallengeGame: CodeChallengeGameScreen,
        peekabooLetters: (props: any) => <PeekabooLettersGame onBack={handleBack} />,
        mathBattleArena: (props: any) => <MathBattleArenaGame onBack={handleBack} />,
        countingShapesTap: (props: any) => <CountingShapesTapGame onBack={handleBack} />,
        simonSays: (props: any) => <SimonSaysGame onBack={handleBack} />,
        alphabetFishing: (props: any) => <AlphabetFishingGame onBack={handleBack} />,
        beanBagToss: (props: any) => <BeanBagTossGame onBack={handleBack} />,
        redLightGreenLight: (props: any) => <RedLightGreenLightGame onBack={handleBack} />,
        spellingSparkle: (props: any) => <SpellingSparkleGame onBack={handleBack} />,
        vocabularyAdventure: (props: any) => <VocabularyAdventureGame onBack={handleBack} />,
        virtualScienceLab: (props: any) => <VirtualScienceLabGame onBack={handleBack} />,
        debateDash: (props: any) => <DebateDashGame onBack={handleBack} />,
        geometryJeopardy: (props: any) => <GeometryJeopardyGame onBack={handleBack} />,
        sharkTank: (props: any) => <SharkTankGame onBack={handleBack} />,
        physicsLab: (props: any) => <PhysicsLabGame onBack={handleBack} />,
        stockMarket: (props: any) => <StockMarketGame onBack={handleBack} />,
        cbtExamGame: (props: any) => <CBTExamGame onBack={handleBack} />,
        vocabularyPictionary: (props: any) => <VocabularyPictionaryGame onBack={handleBack} />,
        simpleMachineHunt: (props: any) => <SimpleMachineScavengerHuntGame onBack={handleBack} />,
        historicalHotSeat: (props: any) => <HistoricalHotSeatGame onBack={handleBack} />,
        vocabularyNinja: (props: any) => <VocabularyNinjaGame onBack={handleBack} />,
        schoolUtilities: SchoolUtilitiesScreen,
        cbtList: StudentCBTListScreen,
        cbtPlayer: (props: any) => <StudentCBTPlayerScreen {...props} handleBack={handleBack} />,
    }), [student, currentUser, schoolId, currentBranchId, forceUpdate, onLogout, handleBack, commonProps]);

    // Optimistic UI: Only show full loading spinner if we are loading AND have no student data
    if (loadingStudent && !student) {
        return <PremiumLoader message="Preparing your school experience..." />;
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
                            onClick={() => onLogout?.()}
                            className="w-full py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                        >
                            Back to Login
                        </button>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Secure Session Active</p>
                    </div>
                </div>
            </div>
        );
    }

    const currentNavigation = viewStack[viewStack.length - 1] || { view: 'home', title: 'Home' };
    const ComponentToRender = viewComponents[currentNavigation.view as keyof typeof viewComponents];

    const isFullScreen = ['chat', 'mathSprintGame', 'geoGuesserGame', 'codeChallengeGame', 'gamePlayer', 'peekabooLetters', 'mathBattleArena', 'cbtExamGame', 'cbtPlayer', 'countingShapesTap', 'simonSays', 'alphabetFishing', 'beanBagToss', 'redLightGreenLight', 'spellingSparkle', 'vocabularyAdventure', 'virtualScienceLab', 'debateDash', 'geometryJeopardy', 'sharkTank', 'physicsLab', 'stockMarket', 'cbtExamGame', 'vocabularyPictionary', 'simpleMachineHunt', 'historicalHotSeat'].includes(currentNavigation.view);

    return (
        <GamificationProvider studentId={student?.id}>
            <DashboardLayout
                title={currentNavigation.title}
                onBack={viewStack.length > 1 ? handleBack : undefined}
                activeScreen={activeBottomNav}
                setActiveScreen={handleBottomNavClick}
                hideHeader={isFullScreen || currentNavigation.view === 'profile'}
                hidePadding={isFullScreen}
            >
                <div key={`${viewStack.length}-${currentNavigation.view}`} className="h-full w-full">
                    <ErrorBoundary>
                        <Suspense fallback={<DashboardSuspenseFallback />}>
                            {ComponentToRender ? (
                                <ComponentToRender {...currentNavigation.props} studentId={student.id} student={student} {...commonProps} />
                            ) : (
                                <div className="p-6 text-center text-gray-500">View not found: {currentNavigation.view}</div>
                            )}
                        </Suspense>
                    </ErrorBoundary>
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
            </DashboardLayout>

        </GamificationProvider>
    );
};

export default StudentDashboard;
