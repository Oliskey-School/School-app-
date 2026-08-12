
import React, { useState, useMemo, useEffect, useRef, lazy, Suspense, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutoSync } from '../../hooks/useAutoSync';
import { lazyWithRetry } from '../../lib/lazyRetry';
import { api } from '../../lib/api';
import { DashboardType, Student, StudentAssignment } from '../../types';
import { formatSchoolId } from '../../utils/idFormatter';
import { THEME_CONFIG, ClockIcon, ClipboardListIcon, BellIcon, ChartBarIcon, ChevronRightIcon, SUBJECT_COLORS, BookOpenIcon, MegaphoneIcon, AttendanceSummaryIcon, CalendarIcon, ElearningIcon, StudyBuddyIcon, SparklesIcon, ReceiptIcon, AwardIcon, HelpIcon, GameControllerIcon, VideoIcon, GlobeIcon } from '../../constants';
import Header from '../ui/Header';
import AIInsightsPanel from '../shared/AIInsightsPanel';
import AskAIWidget from '../shared/AskAIWidget';
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
import { useNotifications } from '../../hooks/useNotifications';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

// Lazy load all view components
const GlobalSearchScreen = lazyWithRetry(() => import('../shared/GlobalSearchScreen'));
import EmailVerificationPrompt from '../auth/EmailVerificationPrompt';
import SuspensionNoticeBanner from '../shared/SuspensionNoticeBanner';
const StudyBuddy = lazyWithRetry(() => import('../student/StudyBuddy'));
const AdventureQuestHost = lazyWithRetry(() => import('../student/adventure/AdventureQuestHost'));
const ExamSchedule = lazyWithRetry(() => import('../shared/ExamSchedule'));
const NoticeboardScreen = lazyWithRetry(() => import('../shared/NoticeboardScreen'));
const CalendarScreen = lazyWithRetry(() => import('../shared/CalendarScreen'));
const LibraryScreen = lazyWithRetry(() => import('../shared/LibraryScreen'));
const CurriculumScreen = lazyWithRetry(() => import('../shared/CurriculumScreen'));
const TimetableScreen = lazyWithRetry(() => import('../shared/TimetableScreen'));
const AssignmentsScreen = lazyWithRetry(() => import('../student/AssignmentsScreen'));
const SubjectsScreen = lazyWithRetry(() => import('../student/SubjectsScreen'));
const ClassroomScreen = lazyWithRetry(() => import('../student/ClassroomScreen'));
const VirtualClassroom = lazyWithRetry(() => import('../video/VirtualClassroom'));
const AttendanceScreen = lazyWithRetry(() => import('../student/AttendanceScreen'));
const ResultsScreen = lazyWithRetry(() => import('../student/ResultsScreen'));
const SelectReportTermScreen = lazyWithRetry(() => import('../shared/SelectReportTermScreen'));
const StudentFinanceScreen = lazyWithRetry(() => import('../student/StudentFinanceScreen'));
const AchievementsScreen = lazyWithRetry(() => import('../student/AchievementsScreen'));
const StudentMessagesScreen = lazyWithRetry(() => import('../student/StudentMessagesScreen'));
const StudentNewChatScreen = lazyWithRetry(() => import('../student/NewMessageScreen'));
const EditProfileScreen = lazyWithRetry(() => import('../shared/EditProfileScreen'));
import StudentProfileEnhanced from './StudentProfileEnhanced';
const VideoLessonScreen = lazyWithRetry(() => import('../student/VideoLessonScreen'));
const AssignmentSubmissionScreen = lazyWithRetry(() => import('../student/AssignmentSubmissionScreen'));
const AssignmentFeedbackScreen = lazyWithRetry(() => import('../student/AssignmentFeedbackScreen'));
const AcademicReportScreen = lazyWithRetry(() => import('../student/AcademicReportScreen'));
const ChatScreen = lazyWithRetry(() => import('../shared/ChatScreen'));
const ExtracurricularsScreen = lazyWithRetry(() => import('../student/ExtracurricularsScreen'));
const NotificationsScreen = lazyWithRetry(() => import('../shared/NotificationsScreen'));
const QuizzesScreen = lazyWithRetry(() => import('../student/QuizzesScreen'));
const QuizPlayerScreen = lazyWithRetry(() => import('../student/QuizPlayerScreen'));
const GamesHubScreen = lazyWithRetry(() => import('./games/GamesHubScreen'));
const ClassBattleScreen = lazyWithRetry(() => import('./games/ClassBattleScreen'));
const MathSprintLobbyScreen = lazyWithRetry(() => import('./games/MathSprintLobbyScreen'));
const MathSprintGameScreen = lazyWithRetry(() => import('./games/MathSprintGameScreen'));
const MathSprintResultsScreen = lazyWithRetry(() => import('./games/MathSprintResultsScreen'));
const GeoGuesserLobbyScreen = lazyWithRetry(() => import('./games/GeoGuesserLobbyScreen'));
const GeoGuesserGameScreen = lazyWithRetry(() => import('./games/GeoGuesserGameScreen'));
const CodeChallengeLobbyScreen = lazyWithRetry(() => import('./games/CodeChallengeLobbyScreen'));
const CodeChallengeGameScreen = lazyWithRetry(() => import('./games/CodeChallengeGameScreen'));
const PeekabooLettersGame = lazyWithRetry(() => import('./games/PeekabooLettersGame'));
const MathBattleArenaGame = lazyWithRetry(() => import('./games/MathBattleArenaGame'));
const CountingShapesTapGame = lazyWithRetry(() => import('./games/CountingShapesTapGame'));
const SimonSaysGame = lazyWithRetry(() => import('./games/SimonSaysGame'));
const AlphabetFishingGame = lazyWithRetry(() => import('./games/AlphabetFishingGame'));
const BeanBagTossGame = lazyWithRetry(() => import('./games/BeanBagTossGame'));
const RedLightGreenLightGame = lazyWithRetry(() => import('./games/RedLightGreenLightGame'));
const SpellingSparkleGame = lazyWithRetry(() => import('./games/SpellingSparkleGame'));
const VocabularyAdventureGame = lazyWithRetry(() => import('./games/VocabularyAdventureGame'));
const VirtualScienceLabGame = lazyWithRetry(() => import('./games/VirtualScienceLabGame'));
const DebateDashGame = lazyWithRetry(() => import('./games/DebateDashGame'));
const GeometryJeopardyGame = lazyWithRetry(() => import('./games/GeometryJeopardyGame'));
const SharkTankGame = lazyWithRetry(() => import('./games/SharkTankGame'));
const PhysicsLabGame = lazyWithRetry(() => import('./games/PhysicsLabGame'));
const StockMarketGame = lazyWithRetry(() => import('./games/StockMarketGame'));
const CBTExamGame = lazyWithRetry(() => import('./games/CBTExamGame'));
const VocabularyPictionaryGame = lazyWithRetry(() => import('./games/VocabularyPictionaryGame'));
const SimpleMachineScavengerHuntGame = lazyWithRetry(() => import('./games/SimpleMachineScavengerHuntGame'));
const HistoricalHotSeatGame = lazyWithRetry(() => import('./games/HistoricalHotSeatGame'));
const VocabularyNinjaGame = lazyWithRetry(() => import('./games/VocabularyNinjaGame'));
const SchoolUtilitiesScreen = lazyWithRetry(() => import('../parent/SchoolUtilitiesScreen'));
const GamePlayerScreen = lazyWithRetry(() => import('../shared/GamePlayerScreen'));
const WorksheetsEmbedScreen = lazyWithRetry(() => import('./WorksheetsEmbedScreen'));
const StudentCBTListScreen = lazyWithRetry(() => import('./cbt/StudentCBTListScreen'));
const StudentCBTPlayerScreen = lazyWithRetry(() => import('./cbt/StudentCBTPlayerScreen'));
const StudentChangePasswordScreen = lazyWithRetry(() => import('./StudentChangePasswordScreen'));
const LearningHubScreen = lazyWithRetry(() => import('./LearningHubScreen'));
const LearningHubResourceViewer = lazyWithRetry(() => import('../shared/LearningHubResourceViewer'));
const FreeLearningResourcesScreen = lazyWithRetry(() => import('./FreeLearningResourcesScreen'));

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
        // Prioritize what's due soonest
        if (assignments.length > 0) {
            const hw = assignments[0];
            const dueDate = new Date(hw.due_date);
            const diff = dueDate.getTime() - Date.now();
            const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
            
            return {
                title: hw.title,
                subject: hw.subject || 'General',
                dueDate: dueDate.toLocaleDateString(),
                timeRemaining: daysLeft > 0 ? `${daysLeft}d` : 'Today',
                daysLeft,
                type: 'assignment' as const,
                onClick: () => navigateTo('assignmentSubmission', 'Submit Assignment', { assignment: hw }),
                totalCount: assignments.length + quizzes.length
            };
        }

        if (quizzes.length > 0) {
            const quiz = quizzes[0];
            const dueDate = quiz.due_date ? new Date(quiz.due_date) : new Date();
            const diff = dueDate.getTime() - Date.now();
            const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));

            return {
                title: quiz.title,
                subject: quiz.subject_id || 'General',
                dueDate: dueDate.toLocaleDateString(),
                timeRemaining: daysLeft > 0 ? `${daysLeft}d` : 'Soon',
                daysLeft,
                type: 'quiz' as const,
                onClick: () => navigateTo('quizPlayer', quiz.title, { 
                    [quiz.is_cbt ? 'cbtExamId' : 'quizId']: quiz.id, 
                    student 
                }),
                totalCount: quizzes.length
            };
        }

        return null;
    }, [assignments, quizzes, navigateTo, student]);

    return (
        <div className="space-y-4">
            <h3 className="font-bold text-lg text-gray-800 ml-1">Your Focus</h3>
            
            {nextTask ? (
                <div className="space-y-2">
                    <NextUpTask {...nextTask} />
                    {(nextTask.totalCount > 1) ? (
                        <button
                            onClick={() => navigateTo('assignments', 'My Assignments')}
                            className="w-full text-xs text-gray-500 text-center font-medium bg-gray-100/50 py-2.5 rounded-full hover:bg-gray-200/50 transition-colors"
                        >
                            + {nextTask.totalCount - 1} more assessment{(nextTask.totalCount - 1) > 1 ? 's' : ''} waiting for you
                        </button>
                    ) : (
                        <button
                            onClick={() => navigateTo('assignments', 'My Assignments')}
                            className="w-full text-xs text-gray-400 text-center font-medium hover:text-gray-600 transition-colors"
                        >
                            View All Tasks
                        </button>
                    )}
                </div>
            ) : (
                <div className="bg-white p-6 rounded-3xl shadow-sm text-center">
                    <SparklesIcon className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                    <p className="text-gray-600 font-medium">You're all caught up!</p>
                    <p className="text-xs text-gray-400 mt-1">Enjoy your free time or explore the library.</p>
                </div>
            )}

            {/* Compact Schedule Preview */}
            {schedule.length > 0 && (
                <div className="bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-semibold text-gray-600">Today's Schedule</h4>
                        {schedule.length > 3 && (
                            <button
                                onClick={() => navigateTo('timetable', 'Timetable Dashboard')}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors px-2 py-1 -mr-2 rounded-lg"
                            >
                                See More
                            </button>
                        )}
                    </div>
                    <div className="space-y-3">
                        {schedule.slice(0, 3).map((entry, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.25, delay: i * 0.06 }}
                                className="flex items-center gap-3"
                            >
                                <span className="text-xs font-bold text-gray-500 w-12">{entry.start_time || entry.startTime}</span>
                                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${SUBJECT_COLORS[entry.subject] || 'bg-indigo-400'}`} />
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-sm font-bold text-gray-800 leading-none truncate">{entry.subject}</p>
                                    <p className="text-xs text-gray-400 mt-1 truncate">
                                        {entry.class_name} • {entry.teacher_name || 'Assigned'}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                        {schedule.length === 0 && <p className="text-xs text-gray-400 text-center italic">No classes scheduled for today.</p>}
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
    // The live class (if any) currently running for this student's branch.
    const [liveClass, setLiveClass] = useState<any | null>(null);

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

    // Keep the "Join Live Class" button in sync: check on load, and react instantly
    // when a teacher starts (show) or ends (hide) a live class.
    const fetchLiveClass = useCallback(async () => {
        try {
            const sessions = await api.getActiveVirtualClasses(currentBranchId || undefined);
            setLiveClass(Array.isArray(sessions) && sessions.length > 0 ? sessions[0] : null);
        } catch {
            /* non-fatal â€” button simply won't show */
        }
    }, [currentBranchId]);

    useEffect(() => {
        fetchLiveClass();
    }, [fetchLiveClass]);

    useEffect(() => {
        // Show the button straight from the start event and keep it shown â€” do NOT
        // re-fetch here, or a slower/empty query could wipe it after a split second.
        const onStarted = (e: any) => {
            const d = e?.detail || {};
            setLiveClass({ id: d.sessionId, subject: d.subject, topic: d.topic, title: d.title });
        };
        // Only the explicit "class ended" signal removes the button.
        const onEnded = () => setLiveClass(null);
        window.addEventListener('virtual-class:started', onStarted);
        window.addEventListener('virtual-class:ended', onEnded);
        return () => {
            window.removeEventListener('virtual-class:started', onStarted);
            window.removeEventListener('virtual-class:ended', onEnded);
        };
    }, []);

    const quickAccessItems = [
        { label: 'Subjects', icon: <BookOpenIcon />, action: () => navigateTo('subjects', 'My Subjects') },
        { label: 'Timetable', icon: <CalendarIcon />, action: () => navigateTo('timetable', 'Timetable Dashboard') },
        { label: 'Results', icon: <ChartBarIcon />, action: () => navigateTo('results', 'Academic Performance', { studentId: student.id }) },
        // "Games" removed: duplicates the Games tab already in both the
        // sidebar and the mobile bottom nav.
        { label: 'Learning Hub', icon: <ElearningIcon />, action: () => navigateTo('learningHub', 'Learning Hub') },
        { label: 'Free Resources', icon: <GlobeIcon />, action: () => navigateTo('freeLearningResources', 'Free Learning Resources') },
    ];

    const aiTools = [
        { label: 'AI Study Buddy', description: 'Stuck on a problem?', color: 'from-purple-500 to-indigo-600', action: () => navigateTo('studyBuddy', 'Study Buddy') },
        { label: 'AI Adventure Quest', description: 'Turn any text into a fun quiz!', color: 'from-teal-400 to-blue-500', action: () => navigateTo('adventureQuest', 'AI Adventure Quest', {}) },
    ];

    if (loading) return (
        <div className="p-4 lg:p-6 bg-gray-50 min-h-full animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="space-y-3">
                        <div className="h-5 bg-gray-200 rounded-lg w-28" />
                        <div className="bg-white rounded-3xl h-36" />
                        <div className="h-9 bg-gray-100 rounded-full w-full" />
                    </div>
                    <div className="space-y-3">
                        <div className="h-5 bg-gray-200 rounded-lg w-20" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-gray-200 rounded-2xl h-24" />
                            <div className="bg-gray-200 rounded-2xl h-24" />
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <div className="space-y-3">
                        <div className="h-5 bg-gray-200 rounded-lg w-32" />
                        <div className="grid grid-cols-3 gap-3">
                            {[0,1,2,3].map(i => <div key={i} className="bg-gray-200 rounded-2xl h-20" />)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-4 lg:p-6 bg-gray-50 min-h-full">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main content */}
                <div className="lg:col-span-2 space-y-6">
                    <SuspensionNoticeBanner mode="student" />
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
                    <AIInsightsPanel />
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2 px-1">AI Tools</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {aiTools.map((tool, i) => (
                                <motion.button
                                    key={tool.label}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: i * 0.06 }}
                                    whileHover={{ y: -3, boxShadow: '0 12px 24px -8px rgba(0,0,0,0.25)' }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={tool.action}
                                    className={`p-4 rounded-2xl shadow-lg text-white bg-gradient-to-r ${tool.color}`}
                                >
                                    <SparklesIcon className="h-6 w-6 mb-2" />
                                    <h4 className="font-bold text-left">{tool.label}</h4>
                                    <p className="text-xs opacity-90 text-left">{tool.description}</p>
                                </motion.button>
                            ))}
                        </div>
                    </div>
                </div>
                {/* Sidebar */}
                <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-6 lg:self-start">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2 px-1">Quick Actions</h3>
                        <AnimatePresence>
                            {liveClass && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.96, height: 0, marginBottom: 0 }}
                                    animate={{ opacity: 1, scale: 1, height: 'auto', marginBottom: 12 }}
                                    exit={{ opacity: 0, scale: 0.96, height: 0, marginBottom: 0 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => navigateTo('liveClass', 'Virtual Classroom', { userRole: 'student', userId: student.id, displayName: student.name })}
                                    style={{ animation: 'liveClassGlow 1.8s ease-in-out infinite' }}
                                    className="w-full flex items-center gap-3 p-4 rounded-2xl text-white bg-gradient-to-r from-red-500 to-rose-600 overflow-hidden"
                                >
                                    <style>{`@keyframes liveClassGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.45); } 50% { box-shadow: 0 0 18px 4px rgba(239,68,68,0.65); } }`}</style>
                                    <span className="relative flex-shrink-0">
                                        <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-30 animate-ping"></span>
                                        <span className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white/20">
                                            <VideoIcon className="w-6 h-6" />
                                        </span>
                                    </span>
                                    <span className="flex-1 text-left">
                                        <span className="flex items-center gap-2 font-bold leading-tight">
                                            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                                            Join Live Class
                                        </span>
                                        <span className="block text-xs opacity-90 truncate">
                                            {liveClass.subject || liveClass.title || 'Class is live now'}
                                        </span>
                                    </span>
                                    <ChevronRightIcon className="w-5 h-5 opacity-90" />
                                </motion.button>
                            )}
                        </AnimatePresence>
                        <div className="grid grid-cols-3 gap-3 text-center">
                            {quickAccessItems.map((item, i) => (
                                <motion.button
                                    key={item.label}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.25, delay: i * 0.05 }}
                                    whileHover={{ y: -2, backgroundColor: 'rgb(255 237 213)' }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={item.action}
                                    className="bg-white p-3 rounded-2xl shadow-sm flex flex-col items-center justify-center space-y-2"
                                >
                                    <div className={theme.iconColor}>{React.cloneElement(item.icon, { className: 'h-7 w-7' })}</div>
                                    <span className={`font-semibold ${theme.textColor} text-center text-xs`}>{item.label}</span>
                                </motion.button>
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
    const [viewStack, setViewStack] = useState<ViewStackItem[]>(() => {
        const HOME: ViewStackItem[] = [{ view: 'overview', title: 'Student Dashboard', props: {} }];
        // Restore the saved stack, but never trust an empty/corrupt value â€” an empty
        // stack leaves the dashboard with no current view and crashes on load. Always
        // fall back to the home (overview) screen so "Home" reliably returns here.
        try {
            const saved = sessionStorage.getItem('student_viewStack');
            const parsed = saved ? JSON.parse(saved) : null;
            return Array.isArray(parsed) && parsed.length > 0 && parsed.every((v: any) => v && v.view) ? parsed : HOME;
        } catch {
            return HOME;
        }
    });
    const [activeBottomNav, setActiveBottomNav] = useState(() => {
        return sessionStorage.getItem('student_activeBottomNav') || 'home';
    });
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

    // Live reminder banner: when a teacher sends a reminder (or any notification
    // targeted at this student arrives over the socket), show a short banner on the
    // dashboard for ~4 seconds so the student notices it immediately.
    const { socket } = useSocket();
    const [reminderBanner, setReminderBanner] = useState<{ title: string; message: string } | null>(null);
    useEffect(() => {
        if (!socket || !user?.id) return;
        const channel = `user:${user.id}:notification`;
        const onNotification = (n: any) => {
            if (n?.id) localStorage.setItem(`reminderShown:${n.id}`, '1');
            setReminderBanner({
                title: n?.title || 'New Reminder',
                message: n?.message || 'You have a new reminder.',
            });
        };
        socket.on(channel, onNotification);
        return () => { socket.off(channel, onNotification); };
    }, [socket, user?.id]);

    // Offline-safe: when the student comes online / opens the dashboard, surface the
    // most recent unread reminder they haven't seen yet (a reminder sent while they
    // were offline still shows). Each reminder is shown once (tracked by its id).
    // Reads from the shared notifications cache (see useNotifications) instead of
    // its own fetch — DashboardLayout's useRealtimeNotifications call already
    // populates it on mount.
    const { notifications: allNotifications } = useNotifications();
    useEffect(() => {
        if (!user?.id || allNotifications.length === 0) return;
        const mine = allNotifications
            .filter((n: any) => !n.is_read && String(n.user_id) === String(user.id))
            .sort((a: any, b: any) =>
                new Date(b.created_at || b.timestamp || 0).getTime() -
                new Date(a.created_at || a.timestamp || 0).getTime());
        const latest = mine.find((n: any) => n.id && !localStorage.getItem(`reminderShown:${n.id}`));
        if (latest) {
            localStorage.setItem(`reminderShown:${latest.id}`, '1');
            setReminderBanner({ title: latest.title || 'New Reminder', message: latest.message || '' });
        }
    }, [user?.id, allNotifications]);

    // Auto-dismiss the reminder banner after 4 seconds.
    useEffect(() => {
        if (!reminderBanner) return;
        const t = setTimeout(() => setReminderBanner(null), 4000);
        return () => clearTimeout(t);
    }, [reminderBanner]);

    // Unread message banner: shown once per browser session when student comes
    // online and has messages they missed (e.g. sent while they were offline).
    const [unreadMsgCount, setUnreadMsgCount] = useState(0);
    useEffect(() => {
        const SESSION_KEY = 'unread_msg_banner_shown';
        if (sessionStorage.getItem(SESSION_KEY)) return;
        api.getUnreadMessageCount().then(count => {
            if (count > 0) {
                setUnreadMsgCount(count);
                sessionStorage.setItem(SESSION_KEY, '1');
            }
        }).catch(() => {});
    }, []);

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
    }, [currentUser?.id, isOnline]);

    // Real-time synchronization for student profile
    useAutoSync(['students'], fetchStudentAndNotifications);

    useEffect(() => {
        fetchStudentAndNotifications();
    }, [fetchStudentAndNotifications]);

    useEffect(() => {
        const currentView = viewStack[viewStack.length - 1];
        setIsHomePage(currentView?.view === 'overview' && !isSearchOpen);
        window.__CURRENT_STUDENT_VIEW__ = currentView?.view;

        // Persist view stack and active nav
        sessionStorage.setItem('student_viewStack', JSON.stringify(viewStack));
        sessionStorage.setItem('student_activeBottomNav', activeBottomNav);

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
            learningHub: 'home',
            learningHubResource: 'home',
            mathSprintLobby: 'games',
            mathSprintGame: 'games',
            mathSprintResults: 'games',
            gamePlayer: 'games',
            messages: 'messages',
            newChat: 'messages',
            chat: 'messages',
            profile: 'profile',
        };

        // Guard: an empty view stack (e.g. right after a reset/Home navigation) leaves
        // currentView undefined â€” reading `.view` here used to crash the whole dashboard.
        const targetNav = currentView ? viewToNavMap[currentView.view] : undefined;
        if (targetNav) {
            setActiveBottomNav(targetNav);
        }
    }, [viewStack, isSearchOpen, setIsHomePage, activeBottomNav]);

    const scrollContainerRef = React.useRef<HTMLDivElement>(null);

    const navigateTo = useCallback((view: string, title: string, props: any = {}) => {
        React.startTransition(() => {
            setViewStack(stack => [...stack, { view, props, title }]);
        });
        // Scroll to top on navigation
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo(0, 0);
        }
    }, []);

    const handleBack = useCallback(() => {
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
    }, [viewStack.length]);

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
        currentBranchId,
        context: {
            userId: currentUser?.id,
            userType: 'student' as const
        }
    };

    const viewComponents: Record<string, any> = useMemo(() => ({
        overview: Overview,
        studyBuddy: StudyBuddy,
        adventureQuest: AdventureQuestHost,
        examSchedule: ExamSchedule,
        noticeboard: NoticeboardScreen,
        calendar: CalendarScreen,
        library: LibraryScreen,
        curriculum: CurriculumScreen,
        timetable: TimetableScreen,
        assignments: AssignmentsScreen,
        subjects: SubjectsScreen,
        classroom: ClassroomScreen,
        liveClass: VirtualClassroom,
        attendance: AttendanceScreen,
        results: ResultsScreen,
        selectReportTerm: (props: any) => <SelectReportTermScreen {...props} targetView="results" />,
        finances: StudentFinanceScreen,
        achievements: AchievementsScreen,
        messages: StudentMessagesScreen,
        newChat: StudentNewChatScreen,
        profile: StudentProfileEnhanced,
        editProfile: EditProfileScreen,
        videoLesson: VideoLessonScreen,
        assignmentSubmission: AssignmentSubmissionScreen,
        assignmentFeedback: AssignmentFeedbackScreen,
        academicReport: AcademicReportScreen,
        chat: ChatScreen,
        extracurriculars: ExtracurricularsScreen,
        notifications: NotificationsScreen,
        quizzes: QuizzesScreen,
        quizPlayer: QuizPlayerScreen,
        gamesHub: GamesHubScreen,
        learningHub: LearningHubScreen,
        learningHubResource: LearningHubResourceViewer,
        freeLearningResources: FreeLearningResourcesScreen,
        worksheets: WorksheetsEmbedScreen,
        classBattle: ClassBattleScreen,
        mathSprintLobby: MathSprintLobbyScreen,
        mathSprintGame: MathSprintGameScreen,
        mathSprintResults: MathSprintResultsScreen,
        gamePlayer: GamePlayerScreen,
        geoGuesserLobby: GeoGuesserLobbyScreen,
        geoGuesserGame: GeoGuesserGameScreen,
        codeChallengeLobby: CodeChallengeLobbyScreen,
        codeChallengeGame: CodeChallengeGameScreen,
        peekabooLetters: PeekabooLettersGame,
        mathBattleArena: MathBattleArenaGame,
        countingShapesTap: CountingShapesTapGame,
        simonSays: SimonSaysGame,
        alphabetFishing: AlphabetFishingGame,
        beanBagToss: BeanBagTossGame,
        redLightGreenLight: RedLightGreenLightGame,
        spellingSparkle: SpellingSparkleGame,
        vocabularyAdventure: VocabularyAdventureGame,
        virtualScienceLab: VirtualScienceLabGame,
        debateDash: DebateDashGame,
        geometryJeopardy: GeometryJeopardyGame,
        sharkTank: SharkTankGame,
        physicsLab: PhysicsLabGame,
        stockMarket: StockMarketGame,
        cbtExamGame: CBTExamGame,
        vocabularyPictionary: VocabularyPictionaryGame,
        simpleMachineHunt: SimpleMachineScavengerHuntGame,
        historicalHotSeat: HistoricalHotSeatGame,
        vocabularyNinja: VocabularyNinjaGame,
        schoolUtilities: (props: any) => <SchoolUtilitiesScreen {...props} role="student" />,
        cbtList: StudentCBTListScreen,
        cbtPlayer: StudentCBTPlayerScreen,
        changePassword: StudentChangePasswordScreen,
    }), []);

    // --- AUDIT SYSTEM EXPOSURE ---
    useEffect(() => {
        window.STUDENT_NAVIGATE = navigateTo;
        window.STUDENT_COMPONENTS = Object.keys(viewComponents);
    console.log('🛡️ [StudentDashboard] Audit triggers exposed to window.');
        return () => {
            // @ts-ignore - for cleanup
            delete window.STUDENT_NAVIGATE;
            // @ts-ignore - for cleanup
            delete window.STUDENT_COMPONENTS;
        };
    }, [navigateTo, viewComponents]);
    // -----------------------------

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
                        <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Secure Session Active</p>
                    </div>
                </div>
            </div>
        );
    }

    const currentNavigation = viewStack[viewStack.length - 1] || { view: 'overview', title: 'Student Dashboard' };
    const ComponentToRender = viewComponents[currentNavigation.view as keyof typeof viewComponents];

    const isFullScreen = ['messages', 'newChat', 'chat', 'classBattle', 'mathSprintGame', 'geoGuesserGame', 'codeChallengeGame', 'gamePlayer', 'peekabooLetters', 'mathBattleArena', 'cbtExamGame', 'cbtPlayer', 'countingShapesTap', 'simonSays', 'alphabetFishing', 'beanBagToss', 'redLightGreenLight', 'spellingSparkle', 'vocabularyAdventure', 'virtualScienceLab', 'debateDash', 'geometryJeopardy', 'sharkTank', 'physicsLab', 'stockMarket', 'cbtExamGame', 'vocabularyPictionary', 'simpleMachineHunt', 'historicalHotSeat', 'worksheets', 'learningHubResource'].includes(currentNavigation.view);
    // messages/newChat keep the nav so users can switch tabs; chat and games go fully immersive
    const hideBottomNav = isFullScreen && currentNavigation.view !== 'messages' && currentNavigation.view !== 'newChat';

    return (
        <GamificationProvider studentId={student?.id}>
            <AnimatePresence>
                {reminderBanner && (
                    <motion.div
                        initial={{ opacity: 0, y: -16, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -12, scale: 0.97, transition: { duration: 0.2 } }}
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                        className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[92%] max-w-md"
                    >
                        <div className="flex items-start gap-3 rounded-2xl bg-white shadow-2xl ring-1 ring-orange-200 px-4 py-3">
                            <div className="mt-0.5 flex-shrink-0 w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center">
                                <BellIcon className="w-5 h-5 text-orange-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900 text-sm truncate">{reminderBanner.title}</p>
                                <p className="text-gray-600 text-sm">{reminderBanner.message}</p>
                            </div>
                            <button onClick={() => setReminderBanner(null)} className="flex-shrink-0 w-8 h-8 -mr-1 -mt-1 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-lg leading-none" aria-label="Dismiss">×</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {unreadMsgCount > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -16, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -12, scale: 0.97, transition: { duration: 0.2 } }}
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                        className="fixed top-4 left-1/2 -translate-x-1/2 z-[99] w-[92%] max-w-md"
                        style={{ top: reminderBanner ? '5rem' : '1rem' }}
                    >
                        <div className="flex items-center gap-3 rounded-2xl bg-white shadow-2xl ring-1 ring-blue-200 px-4 py-3">
                            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                                <MegaphoneIcon className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900 text-sm">
                                    {unreadMsgCount === 1 ? '1 unread message' : `${unreadMsgCount} unread messages`}
                                </p>
                                <p className="text-gray-500 text-xs">You received messages while you were away</p>
                            </div>
                            <button
                                onClick={() => { setUnreadMsgCount(0); navigateTo('messages', 'Messages'); }}
                                className="flex-shrink-0 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-colors"
                            >
                                View
                            </button>
                            <button onClick={() => setUnreadMsgCount(0)} className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-lg leading-none" aria-label="Dismiss">×</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <DashboardLayout
                title={currentNavigation.title}
                onBack={viewStack.length > 1 ? handleBack : undefined}
                activeScreen={activeBottomNav}
                setActiveScreen={handleBottomNavClick}
                hideHeader={hideBottomNav || currentNavigation.view === 'profile'}
                hidePadding={isFullScreen}
                hideBottomNav={hideBottomNav}
            >
                <div key={`${viewStack.length}-${currentNavigation.view}`} className="h-full w-full">
                    <ErrorBoundary>
                        <Suspense fallback={<DashboardSuspenseFallback />}>
                            {ComponentToRender ? (() => {
                                // Prepare props for specific components
                                const componentProps = { ...currentNavigation.props, ...commonProps, student, studentId: student?.id, onBack: handleBack, handleBack };
                                
                                // Additional prop injection
                                if (currentNavigation.view === 'curriculum') {
                                    componentProps.level = student?.level;
                                    componentProps.department = student?.department;
                                }
                                if (currentNavigation.view === 'chat') {
                                    componentProps.currentUserId = student?.id;
                                    componentProps.forceChatPanel = !!(currentNavigation.props?.targetUserId || currentNavigation.props?.conversationId);
                                }

                                return <ComponentToRender {...componentProps} />;
                            })() : (
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
                <AskAIWidget />
            </DashboardLayout>

        </GamificationProvider>
    );
};

export default StudentDashboard;
