

import React, { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
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

// Lazy load all view components
import IncomingClassModal from './IncomingClassModal'; // Import non-lazy for speed/critical alert
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
                                <div>
                                    <p className="font-semibold text-gray-800 leading-tight">{entry.subject}</p>
                                    <p className="text-xs text-gray-500">{entry.class_name}</p>
                                </div>
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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

                const [timetableData, assignmentsData] = await Promise.all([
                    api.getTimetable(schoolId, student.grade.toString()),
                    api.getAssignments(schoolId, student.classId || student.current_class_id)
                ]);

                if (timetableData && timetableData.length > 0) {
                    // Filter for today locally if API returns all
                    setTodaySchedule(timetableData.filter((t: any) => t.day === today).slice(0, 3));
                } else {
                    setTodaySchedule([]);
                }

                if (assignmentsData && assignmentsData.length > 0) {
                    const now = new Date();
                    // Upcoming = due today or in the future
                    const upcoming = assignmentsData
                        .filter((a: any) => new Date(a.due_date) >= now)
                        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
                    setUpcomingAssignments(upcoming.slice(0, 2));
                } else {
                    setUpcomingAssignments([]);
                }

            } catch (err) {
                console.warn('Error fetching overview data via Hybrid API:', err);
                setTodaySchedule([]);
                setUpcomingAssignments([]);
            } finally {
                setLoading(false);
            }
        };

        if (student) {
            fetchData();

            // Real-time Service Integration
            if (currentUser?.id && schoolId) {
                realtimeService.initialize(currentUser.id, schoolId);

                const handleRealtimeUpdate = (event: any) => {
                    console.log('📢 StudentDashboard: Real-time update received', event);
                    fetchData();
                    forceUpdate();
                };

                window.addEventListener('realtime-update' as any, handleRealtimeUpdate);
                return () => {
                    window.removeEventListener('realtime-update' as any, handleRealtimeUpdate);
                };
            }
        }
    }, [student]);

    const quickAccessItems = [
        { label: 'Subjects', icon: <BookOpenIcon />, action: () => navigateTo('subjects', 'My Subjects') },
        { label: 'Timetable', icon: <CalendarIcon />, action: () => navigateTo('timetable', 'Timetable') },
        { label: 'Results', icon: <ChartBarIcon />, action: () => navigateTo('results', 'Academic Performance', { studentId: student.id }) },
        { label: 'CBT Exams', icon: <ClipboardListIcon />, action: () => navigateTo('cbtList', 'CBT Portal') },
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

import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';
import { useAuth } from '../../context/AuthContext';

// ... (top level)

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

    useEffect(() => {
        const fetchStudentAndNotifications = async () => {
            // Prevent infinite loop - if already fetching, skip
            if (isFetchingRef.current) {
                console.log('⏭️ Fetch already in progress, skipping...');
                return;
            }

            // Don't fetch if we don't have a user
            if (!currentUser?.id) {
                setLoadingStudent(false);
                return;
            }

            isFetchingRef.current = true; // Mark as fetching
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

                if (!currentUser.email) {
                    setLoadingStudent(false);
                    isFetchingRef.current = false;
                    return;
                }

                if (!isOnline && cachedStudent) {
                    setIsRevalidating(false);
                    return;
                }

                const isDemoEmail = currentUser.email === 'student@school.edu' ||
                    currentUser.email?.endsWith('@demo.com');

                const createDemoStudent = (): Student => ({
                    id: '00000000-0000-0000-0000-000000000001',
                    name: currentUser.user_metadata?.full_name || 'Demo Student',
                    grade: 10,
                    section: 'A',
                    avatarUrl: 'https://i.pravatar.cc/150?img=1',
                    email: currentUser.email,
                    department: 'Science',
                    attendanceStatus: 'Present',
                    user_id: currentUser.id,
                } as Student);

                // 1. Try to fetch Student Data via Hybrid API
                console.log("Fetching student profile via Hybrid API for user:", currentUser?.id);

                try {
                    const studentData = await api.getMyStudentProfile();

                    if (studentData) {
                        const mappedStudent: Student = {
                            ...studentData,
                            id: studentData.id,
                            name: studentData.name,
                            grade: studentData.grade,
                            section: studentData.section,
                            avatarUrl: studentData.avatar_url,
                            schoolId: studentData.school_generated_id,
                        } as any;

                        setStudent(mappedStudent);
                        await offlineStorage.save(cacheKey, mappedStudent);
                    } else if (isDemoEmail) {
                        // AUTO-HEALING for demo users
                        console.log("⚠️ No student profile found for demo user. Auto-healing...");
                        const DEMO_SCHOOL_ID = '00000000-0000-0000-0000-000000000000';

                        const { data: newStudent, error: createError } = await supabase
                            .from('students')
                            .upsert({
                                user_id: currentUser.id,
                                email: currentUser.email,
                                school_id: schoolId || DEMO_SCHOOL_ID,
                                name: currentUser.user_metadata?.full_name || 'Demo Student',
                                grade: 10,
                                section: 'A',
                                attendance_status: 'Present'
                            }, {
                                onConflict: 'user_id'
                            })
                            .select()
                            .single();

                        if (newStudent) {
                            const mappedNewStudent = {
                                ...newStudent,
                                id: newStudent.id,
                                name: newStudent.name,
                                grade: newStudent.grade,
                                section: newStudent.section,
                                avatarUrl: newStudent.avatar_url,
                            };
                            setStudent(mappedNewStudent as any);
                            await offlineStorage.save(cacheKey, mappedNewStudent);
                        } else {
                            setStudent(createDemoStudent());
                        }
                    }
                } catch (apiError: any) {
                    console.error("API Error fetching student profile:", apiError);
                    if (apiError.message?.includes('permission denied') || apiError.status === 403) {
                        setStudent(createDemoStudent());
                    }
                }

            } catch (e) {
                console.error('Error loading dashboard:', e);
                if (!student) setLoadingStudent(false);
            } finally {
                setLoadingStudent(false);
                setIsRevalidating(false);
                isFetchingRef.current = false;
            }
        };
        fetchStudentAndNotifications();
    }, [currentUser?.id, isOnline]); // Use currentUser?.id instead of whole object to prevent unnecessary re-fetches

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

    // Real-time Service Integration
    // Listen for Virtual Class Sessions
    const [incomingClass, setIncomingClass] = useState<any | null>(null);

    useEffect(() => {
        if (!student || !schoolId) return;

        let myClassId: string | null = null;
        let channel: any = null;

        const setupListener = async () => {
            try {
                // 1. Get Class ID scoped to School
                const { data: cls } = await supabase
                    .from('classes')
                    .select('id')
                    .eq('school_id', schoolId)
                    .eq('grade', student.grade)
                    .eq('section', student.section)
                    .limit(1)
                    .maybeSingle();

                if (cls) {
                    myClassId = cls.id;
                    console.log('📡 [Student] Listening for class sessions for:', myClassId);

                    // 2. CHECK FOR EXISTING ACTIVE SESSIONS (Important for students joining late)
                    const { data: existingActive } = await supabase
                        .from('virtual_class_sessions')
                        .select('*, teachers(name)')
                        .eq('class_id', myClassId)
                        .eq('status', 'active')
                        .limit(1)
                        .maybeSingle();

                    if (existingActive) {
                        console.log('🔔 [Student] Found already active class:', existingActive);
                        setIncomingClass({
                            ...existingActive,
                            teacherName: (existingActive as any).teachers?.name || 'Teacher'
                        });
                    }

                    // 3. Subscribe to Future Changes
                    channel = supabase
                        .channel(`student-class-${myClassId}`)
                        .on(
                            'postgres_changes',
                            {
                                event: '*',
                                schema: 'public',
                                table: 'virtual_class_sessions',
                                filter: `class_id=eq.${myClassId}`
                            },
                            async (payload: any) => {
                                console.log('🔔 [Student] Class session event:', payload.eventType, payload.new);

                                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                                    if (payload.new && payload.new.status === 'active') {
                                        // Fetch teacher name
                                        const { data: teacher } = await supabase
                                            .from('teachers')
                                            .select('name')
                                            .eq('id', payload.new.teacher_id)
                                            .limit(1)
                                            .maybeSingle();

                                        setIncomingClass({
                                            ...payload.new,
                                            teacherName: teacher?.name || 'Teacher'
                                        });

                                        // Also show a toast for immediate visibility if modal is somehow blocked
                                        toast.success(`Live Class Started: ${payload.new.subject}`, { icon: '🎥' });
                                    } else if (payload.new && payload.new.status === 'ended') {
                                        setIncomingClass(null);
                                    }
                                } else if (payload.eventType === 'DELETE') {
                                    setIncomingClass(null);
                                }
                            }
                        )
                        .subscribe();
                }
            } catch (err) {
                console.error("❌ [Student] Error setting up class listener:", err);
            }
        };

        setupListener();

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, [student, schoolId]);

    // Real-time Service Integration Removed
    /*
    useEffect(() => {
        const userId = (currentUser as any)?.id;
        if (userId) {
            // Subscribe to personal notifications
            realtimeService.subscribeToNotifications(userId, (notif) => {
                toast(notif.message || notif.content || 'New Event', {
                    icon: '🔔',
                    duration: 4000
                });
                forceUpdate();
            });

            // Subscribe to messages
            realtimeService.subscribeToMessages(userId, (msg) => {
                toast.success(`Message from ${msg.sender_name || 'Teacher'}`, {
                    icon: '💬',
                    duration: 4000
                });
                forceUpdate();
            });
        }

        return () => {
            realtimeService.unsubscribeAll();
        };
    }, [currentUser]);
    */

    const navigateTo = (view: string, title: string, props: any = {}) => {
        setViewStack(stack => [...stack, { view, props, title }]);
        // Scroll to top on navigation
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo(0, 0);
        }
    };

    const handleBack = () => {
        if (viewStack.length > 1) {
            setViewStack(stack => stack.slice(0, -1));
        } else {
            // Fallback: If we are stuck, go to overview
            setViewStack([{ view: 'overview', title: 'Student Dashboard' }]);
        }
        // Scroll to top on back navigation
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo(0, 0);
        }
    };

    const handleBottomNavClick = (screen: string) => {
        if (!student) return;
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
    };

    const handleNotificationClick = () => {
        navigateTo('notifications', 'Notifications', {});
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
        historicalHotSeat: HistoricalHotSeatGame,
        schoolUtilities: SchoolUtilitiesScreen,
        cbtList: StudentCBTListScreen,
        cbtPlayer: (props: any) => <StudentCBTPlayerScreen {...props} handleBack={handleBack} />,
    }), [student]);

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
                            className="w-full py-3 px-4 bg-white text-gray-700 border border-gray-200 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            Back to Login
                        </button>

                        <button
                            onClick={async () => {
                                try {
                                    setLoadingStudent(true);
                                    // Manually trigger the auto-creation logic by forcing a re-check with special flag or just re-running 
                                    // Actually, simpler to just insert directly here as a manual action
                                    // Match Shared Reality Demo School ID
                                    const DEMO_SCHOOL_ID = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
                                    const effectiveSchoolId = schoolId || DEMO_SCHOOL_ID;

                                    const { data: newStudent, error } = await supabase
                                        .from('students')
                                        .upsert({
                                            user_id: user?.id,
                                            email: user?.email,
                                            school_id: effectiveSchoolId,
                                            name: currentUser.user_metadata?.full_name || 'New Student',
                                                                                        grade: 10,
                                                                                        section: 'A',
                                                                                        attendance_status: 'Present'
                                                                                    }, {                                            onConflict: 'user_id'
                                        })
                                        .select()
                                        .single();

                                    if (error) {
                                        toast.error("Failed to create profile: " + error.message);
                                        console.error(error);
                                    } else {
                                        toast.success("Profile created! Reloading...");
                                        window.location.reload();
                                    }
                                } catch (e) {
                                    toast.error("An unexpected error occurred");
                                    console.error(e);
                                } finally {
                                    setLoadingStudent(false);
                                }
                            }}
                            className="w-full py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                        >
                            Create Student Profile
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
    const commonProps = {
        navigateTo,
        handleBack,
        forceUpdate,
        currentUserId: currentUser?.id,
        schoolId,
        currentBranchId
    };

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

            <IncomingClassModal
                isOpen={!!incomingClass}
                classInfo={incomingClass}
                onJoin={() => {
                    setIncomingClass(null);
                    navigateTo('liveClass', 'Live Class Session', { session: incomingClass });
                }}
                onDecline={() => setIncomingClass(null)}
            />
        </GamificationProvider>
    );
};

export default StudentDashboard;
