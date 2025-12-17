import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { DashboardType, Student, BehaviorNote, StudentAttendance, AttendanceStatus, StudentAssignment, ProgressReport } from '../../types';
import {
    THEME_CONFIG,
    ChevronRightIcon,
    BusVehicleIcon,
    ReceiptIcon,
    ReportIcon,
    PhoneIcon,
    ChartBarIcon,
    ClipboardListIcon,
    MegaphoneIcon,
    AttendanceSummaryIcon,
    ClockIcon,
    BookOpenIcon,
    SUBJECT_COLORS,
    ChevronLeftIcon,
    XCircleIcon,
    TrendingUpIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    StarIcon,
    CalendarIcon,
    CalendarPlusIcon,
    SparklesIcon,
    getFormattedClassName
} from '../../constants';
import Header from '../ui/Header';
import { ParentBottomNav } from '../ui/DashboardBottomNav';
import {
    mockStudentFees,
    mockStudents,
    mockAssignments,
    mockSubmissions,
    mockNotices,
    mockStudentAttendance,
    mockTimetableData,
    mockNotifications,
    mockProgressReports,
} from '../../data';
import DonutChart from '../ui/DonutChart';
import GlobalSearchScreen from '../shared/GlobalSearchScreen';


// Import all view components
import ExamSchedule from '../shared/ExamSchedule';
import NoticeboardScreen from '../shared/NoticeboardScreen';
import NotificationsScreen from '../shared/NotificationsScreen';
import CalendarScreen from '../shared/CalendarScreen';
import LibraryScreen from '../shared/LibraryScreen';
import BusRouteScreen from '../shared/BusRouteScreen';
import FeeStatusScreen from '../parent/FeeStatusScreen';
import ReportCardScreen from '../parent/ReportCardScreen';
import SelectChildForReportScreen from '../parent/SelectChildForReportScreen';
import TimetableScreen from '../shared/TimetableScreen';
import ParentProfileScreen from '../parent/ParentProfileScreen';
import EditParentProfileScreen from '../parent/EditParentProfileScreen';
import FeedbackScreen from '../parent/FeedbackScreen';
import ParentNotificationSettingsScreen from '../parent/ParentNotificationSettingsScreen';
import ParentSecurityScreen from '../parent/ParentSecurityScreen';
import LearningResourcesScreen from '../parent/LearningResourcesScreen';
import SchoolPoliciesScreen from '../parent/SchoolPoliciesScreen';
import PTAMeetingScreen from '../parent/PTAMeetingScreen';
import ParentPhotoGalleryScreen from '../parent/ParentPhotoGalleryScreen';
import VolunteeringScreen from '../parent/VolunteeringScreen';
import PermissionSlipScreen from '../parent/PermissionSlipScreen';
import AppointmentScreen from '../parent/AppointmentScreen';
import AIParentingTipsScreen from '../parent/AIParentingTips';
import ParentMessagesScreen from '../parent/ParentMessagesScreen';
import ParentNewChatScreen from '../parent/ParentNewChatScreen';
import ChatScreen from '../shared/ChatScreen';
import SchoolUtilitiesScreen from '../parent/SchoolUtilitiesScreen';


const DashboardSuspenseFallback = () => (
    <div className="flex justify-center items-center h-full p-8">
        <div className="w-10 h-10 border-4 border-t-4 border-gray-200 border-t-green-600 rounded-full animate-spin"></div>
    </div>
);

interface ViewStackItem {
    view: string;
    props?: any;
    title: string;
}

const StatItem = ({ icon, label, value, colorClass }: { icon: React.ReactNode, label: string, value: string | React.ReactNode, colorClass: string }) => (
    <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg ${colorClass}`}>
            {icon}
        </div>
        <div>
            <p className="text-xs text-gray-700">{label}</p>
            <p className="font-bold text-sm text-gray-800">{value}</p>
        </div>
    </div>
);

const ChildStatCard: React.FC<{ data: any, navigateTo: (view: string, title: string, props?: any) => void, colorTheme: { bg: string, text: string } }> = ({ data, navigateTo, colorTheme }) => {
    const { student, feeInfo, nextHomework, attendancePercentage } = data;
    const formattedClassName = getFormattedClassName(student.grade, student.section);

    const feeStatus = feeInfo ? (
        <span className={feeInfo.status === 'Overdue' ? 'text-red-600' : ''}>
            {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(feeInfo.totalFee - feeInfo.paidAmount)} due
        </span>
    ) : "All Paid";

    return (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="p-4" style={{ backgroundColor: `${colorTheme.bg}1A` }}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <img src={student.avatarUrl} alt={student.name} className="w-14 h-14 rounded-full object-cover border-2" style={{ borderColor: colorTheme.bg }} />
                        <div>
                            <h3 className="font-bold text-lg text-gray-800">{student.name}</h3>
                            <p className="text-sm font-semibold" style={{ color: colorTheme.text }}>{formattedClassName}</p>
                        </div>
                    </div>
                    <button onClick={() => navigateTo('childDetail', student.name, { student: student })} className="bg-white p-2 rounded-full shadow-sm hover:bg-gray-100">
                        <ChevronRightIcon className="text-gray-600" />
                    </button>
                </div>
            </div>

            <div className="px-4 py-3 grid grid-cols-2 gap-4 border-t border-gray-100">
                <StatItem icon={<AttendanceSummaryIcon className="h-5 w-5 text-green-600" />} label="Attendance" value={`${attendancePercentage}%`} colorClass="bg-green-100" />
                <StatItem icon={<ReceiptIcon className="h-5 w-5 text-red-600" />} label="Fees Due" value={feeStatus} colorClass="bg-red-100" />
                {nextHomework && <StatItem icon={<ClipboardListIcon className="h-5 w-5 text-purple-600" />} label="Homework" value={`${nextHomework.subject}`} colorClass="bg-purple-100" />}
                <StatItem icon={<ReportIcon className="h-5 w-5 text-sky-600" />} label="Report Card" value="View" colorClass="bg-sky-100" />
            </div>
        </div>
    );
};


const getHomeworkStatus = (assignment: StudentAssignment) => {
    const dueDate = new Date(assignment.dueDate);
    const now = new Date();

    if (assignment.submission) {
        if (assignment.submission.status === 'Graded') {
            return { text: `Graded: ${assignment.submission.grade}/100`, icon: <CheckCircleIcon />, color: 'text-green-600', bg: 'bg-green-50', isComplete: true };
        }
        return { text: 'Submitted', icon: <CheckCircleIcon />, color: 'text-sky-600', bg: 'bg-sky-50', isComplete: true };
    }

    if (dueDate < now) {
        return { text: 'Overdue', icon: <ExclamationCircleIcon />, color: 'text-red-600', bg: 'bg-red-50', isComplete: false };
    }
    return { text: 'Pending', icon: <ClockIcon />, color: 'text-amber-600', bg: 'bg-amber-50', isComplete: false };
};

const AcademicsTab = ({ student, navigateTo }: { student: Student; navigateTo: (view: string, title: string, props?: any) => void }) => {
    const theme = THEME_CONFIG[DashboardType.Parent];

    // Memoized data processing
    const { latestTerm, latestGrades, averageScore, studentHomework, progressReport } = useMemo(() => {
        const publishedReport = student.reportCards?.find(rc => rc.status === 'Published');

        let term = 'N/A';
        let grades: { subject: string; score: number; teacherRemark?: string; }[] = [];
        let avg = 0;

        if (publishedReport) {
            term = `${publishedReport.term} (${publishedReport.session})`;
            grades = publishedReport.academicRecords.map(r => ({ subject: r.subject, score: r.total, teacherRemark: r.remark }));
            avg = grades.length > 0 ? Math.round(grades.reduce((acc, curr) => acc + curr.score, 0) / grades.length) : 0;
        } else {
            // Fallback to academicPerformance if no published report card
            const term2Grades = student.academicPerformance?.filter(p => p.term === 'Term 2');
            if (term2Grades && term2Grades.length > 0) {
                term = 'Term 2';
                grades = term2Grades;
                avg = Math.round(grades.reduce((acc, curr) => acc + curr.score, 0) / grades.length);
            }
        }

        const homework = mockAssignments
            .map(a => ({
                ...a,
                submission: mockSubmissions.find(s => s.assignmentId === a.id && s.student.id === student.id)
            }))
            .filter(a => new Date(a.dueDate) > new Date())
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

        // Use mockProgressReports explicitly typed
        const progress = mockProgressReports.find((p: ProgressReport) => p.studentId === student.id);

        return { latestTerm: term, latestGrades: grades, averageScore: avg, studentHomework: homework, progressReport: progress };
    }, [student]);

    return (
        <div className="p-4 space-y-4">
            {/* NEW AI Parenting Tips Button */}
            <div className="bg-gradient-to-r from-green-500 to-teal-500 p-4 rounded-2xl shadow-lg flex items-center justify-between text-white">
                <div>
                    <h3 className="font-bold text-lg">Personalized Advice</h3>
                    <p className="text-sm opacity-90">Get AI-powered tips for your child.</p>
                </div>
                <button
                    onClick={() => navigateTo('aiParentingTips', 'AI Parenting Tips', { student })}
                    className="bg-white/20 px-4 py-2 rounded-lg font-semibold hover:bg-white/30 transition-colors flex items-center space-x-2"
                >
                    <SparklesIcon className="h-5 w-5" />
                    <span>Get Tips</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Term Performance */}
                <div className="bg-white p-4 rounded-xl shadow-sm">
                    <div className="flex justify-between items-center">
                        <div>
                            <h4 className="font-bold text-gray-800">Term Performance</h4>
                            <p className="text-sm text-gray-700">{latestTerm}</p>
                        </div>
                        {averageScore > 0 && (
                            <div className="text-right">
                                <p className="font-bold text-2xl text-green-600">{averageScore}%</p>
                                <p className="text-xs text-gray-700">Overall Average</p>
                            </div>
                        )}
                    </div>
                    {latestGrades.length > 0 && (
                        <div className="mt-3 space-y-2">
                            {latestGrades.map((grade, i) => (
                                <div key={i} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                                    <span className="font-semibold text-sm text-gray-700">{grade.subject}</span>
                                    <span className="font-bold text-sm text-gray-800">{grade.score}%</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Homework */}
                <div className="bg-white p-4 rounded-xl shadow-sm">
                    <h4 className="font-bold text-gray-800 mb-3">Upcoming Homework</h4>
                    <div className="space-y-3">
                        {studentHomework.length > 0 ? studentHomework.map(hw => {
                            const status = getHomeworkStatus(hw);
                            return (
                                <div key={hw.id} className="flex justify-between items-center border-b pb-2 last:border-b-0">
                                    <div>
                                        <p className="font-bold text-gray-800">{hw.title}</p>
                                        <p className="text-sm text-gray-700">{hw.subject} &bull; Due {new Date(hw.dueDate).toLocaleDateString('en-GB')}</p>
                                    </div>
                                    <div className={`flex items-center space-x-2 text-xs font-semibold px-2 py-1 rounded-full ${status.bg} ${status.color}`}>
                                        {React.cloneElement(status.icon, { className: `h-4 w-4 ${status.isComplete ? 'animate-checkmark-pop' : ''}`.trim() })}
                                        <span>{status.text}</span>
                                    </div>
                                </div>
                            );
                        }) : <p className="text-sm text-gray-700 text-center">No upcoming homework.</p>}
                    </div>
                </div>
            </div>

            {/* AI Generated Progress Report */}
            {progressReport && (
                <div className="bg-white p-4 rounded-xl shadow-sm">
                    <div className="flex items-center space-x-2 mb-3">
                        <SparklesIcon className="text-green-500" />
                        <h4 className="font-bold text-gray-800">AI Progress Insights</h4>
                    </div>
                    <div className="space-y-3 text-sm">
                        <div>
                            <h5 className="font-semibold text-green-700 mb-1">Strengths</h5>
                            <ul className="list-disc list-inside text-gray-600 space-y-1">
                                {progressReport.strengths.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h5 className="font-semibold text-amber-700 mb-1">Areas for Improvement</h5>
                            <ul className="list-disc list-inside text-gray-600 space-y-1">
                                {progressReport.areasForImprovement.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const BehaviorTab = ({ student }: { student: Student }) => {
    return (
        <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {student.behaviorNotes && student.behaviorNotes.length > 0 ? [...student.behaviorNotes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(note => {
                    const isPositive = note.type === 'Positive';
                    return (
                        <div key={note.id} className={`p-4 rounded-xl border-l-4 ${isPositive ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'}`}>
                            <div className="flex justify-between items-start">
                                <h5 className={`font-bold ${isPositive ? 'text-green-800' : 'text-red-800'}`}>{note.title}</h5>
                                <p className="text-xs text-gray-700 font-medium flex-shrink-0 ml-2">{new Date(note.date.replace(/-/g, '/')).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                            </div>
                            <p className="text-sm text-gray-700 mt-1">{note.note}</p>
                            {note.suggestions && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <h6 className="font-semibold text-xs text-gray-600">Suggestions for Home:</h6>
                                    <ul className="list-disc list-inside text-sm text-gray-700 mt-1 space-y-1">
                                        {note.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                                    </ul>
                                </div>
                            )}
                            <p className="text-xs text-gray-600 text-right mt-2 italic">- {note.by}</p>
                        </div>
                    );
                }) : <p className="md:col-span-2 text-sm text-gray-700 text-center py-8">No behavioral notes recorded.</p>}
            </div>
        </div>
    );
};

const AttendanceTab = ({ student }: { student: Student }) => {
    const studentAttendance = useMemo(() =>
        mockStudentAttendance.filter(att => att.studentId === student.id)
        , [student.id]);

    const [currentDate, setCurrentDate] = useState(new Date());

    const attendanceMap = useMemo(() => {
        const map = new Map<string, AttendanceStatus>();
        studentAttendance.forEach(att => map.set(att.date, att.status));
        return map;
    }, [studentAttendance]);

    const firstDayOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), [currentDate]);
    const daysInMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate(), [currentDate]);
    const startingDayIndex = firstDayOfMonth.getDay();

    const goToPreviousMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const goToNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const attendanceColors: { [key in AttendanceStatus]: string } = {
        Present: 'bg-green-400 text-white',
        Absent: 'bg-red-400 text-white',
        Late: 'bg-blue-400 text-white',
        Leave: 'bg-gray-200 text-gray-500',
    };

    return (
        <div className="p-4 bg-white rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <button onClick={goToPreviousMonth} className="p-2 rounded-full hover:bg-gray-100"><ChevronLeftIcon className="h-5 w-5 text-gray-600" /></button>
                <h3 className="font-bold text-lg text-gray-800">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                <button onClick={goToNextMonth} className="p-2 rounded-full hover:bg-gray-100"><ChevronRightIcon /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-700 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => <div key={day}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: startingDayIndex }).map((_, index) => <div key={`empty-${index}`} />)}
                {Array.from({ length: daysInMonth }).map((_, index) => {
                    const day = index + 1;
                    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                    const dateString = date.toISOString().split('T')[0];
                    const status = attendanceMap.get(dateString);
                    return (
                        <div key={day} className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-semibold ${status ? attendanceColors[status] : 'bg-gray-100 text-gray-400'}`}>
                            {day}
                        </div>
                    )
                })}
            </div>
            <div className="flex justify-center space-x-3 mt-4 text-xs">
                <span className="flex items-center"><div className="w-3 h-3 rounded-full bg-green-400 mr-1.5"></div>Present</span>
                <span className="flex items-center"><div className="w-3 h-3 rounded-full bg-red-400 mr-1.5"></div>Absent</span>
                <span className="flex items-center"><div className="w-3 h-3 rounded-full bg-blue-400 mr-1.5"></div>Late</span>
            </div>
        </div>
    );
};

type ChildDetailTab = 'academics' | 'behavior' | 'attendance';

const ChildDetailScreen = ({ student, initialTab, navigateTo }: { student: Student, initialTab?: ChildDetailTab, navigateTo: (view: string, title: string, props?: any) => void }) => {
    const [activeTab, setActiveTab] = useState<ChildDetailTab>(initialTab || 'academics');

    const TabButton = ({ id, label }: { id: ChildDetailTab, label: string }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === id ? 'bg-green-500 text-white shadow' : 'text-gray-800'
                }`}
        >
            {label}
        </button>
    );

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Child Header */}
            <div className="p-4 bg-white flex items-center space-x-4">
                <img src={student.avatarUrl} alt={student.name} className="w-16 h-16 rounded-full object-cover border-4 border-green-100" />
                <div>
                    <h3 className="text-xl font-bold text-gray-800">{student.name}</h3>
                    <p className="text-gray-700 font-medium">{getFormattedClassName(student.grade, student.section)}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="px-4 py-2 bg-white">
                <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg">
                    <TabButton id="academics" label="Academics" />
                    <TabButton id="behavior" label="Behavior" />
                    <TabButton id="attendance" label="Attendance" />
                </div>
            </div>

            <div className="flex-grow overflow-y-auto">
                {activeTab === 'academics' && <AcademicsTab student={student} navigateTo={navigateTo} />}
                {activeTab === 'behavior' && <BehaviorTab student={student} />}
                {activeTab === 'attendance' && <div className="p-4"><AttendanceTab student={student} /></div>}
            </div>
        </div>
    );
};

import { supabase } from '../../lib/supabase';

const Dashboard = ({ navigateTo }: { navigateTo: (view: string, title: string, props?: any) => void }) => {
    const theme = THEME_CONFIG[DashboardType.Parent];
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchChildren = async () => {
            try {
                // 1. Get Parent ID from User ID (LOGGED_IN_PARENT_ID)
                // Assuming LOGGED_IN_PARENT_ID is a user_id. 
                // If the user table says role is parent, there should be a parent record.
                // For demo purposes, we'll try to find a parent with this user_id.

                const { data: parentData, error: parentError } = await supabase
                    .from('parents')
                    .select('id')
                    .eq('user_id', LOGGED_IN_PARENT_ID)
                    .single();

                if (parentError || !parentData) {
                    // Fallback or handle error. If no parent record found, maybe LOGGED_IN_PARENT_ID is the 'parent' table id?
                    // Let's assume for this specific flow/mock setup we might need to be flexible.
                    // But cleanly:
                    console.error("Error fetching parent profile:", parentError);
                    // If failing, let's just try to fetch students directly if we want to simulate or use fallback
                    setStudents(mockStudents.filter(s => [3, 4].includes(s.id))); // Fallback to mocks
                    setLoading(false);
                    return;
                }

                // 2. Get Children IDs
                const { data: relations, error: relationError } = await supabase
                    .from('parent_children')
                    .select('student_id')
                    .eq('parent_id', parentData.id);

                if (relationError) throw relationError;

                const studentIds = relations.map(r => r.student_id);

                if (studentIds.length === 0) {
                    setStudents([]);
                } else {
                    // 3. Fetch Students Details
                    const { data: studentsData, error: studentsError } = await supabase
                        .from('students')
                        .select('*')
                        .in('id', studentIds);

                    if (studentsError) throw studentsError;

                    // Map DB students to frontend Student type
                    const mappedStudents: Student[] = studentsData.map((s: any) => ({
                        id: s.id,
                        name: s.name,
                        avatarUrl: s.avatar_url || 'https://via.placeholder.com/150',
                        grade: s.grade,
                        section: s.section,
                        department: s.department,
                        attendanceStatus: s.attendance_status || 'Present',
                        birthday: s.birthday,
                        // Attach generic mocks for arrays not yet in DB or fetch them later
                        academicPerformance: [], // Could fetch
                        behaviorNotes: [], // Could fetch
                        reportCards: []
                    }));
                    setStudents(mappedStudents);
                }

            } catch (err) {
                console.error("Error fetching children:", err);
                setStudents(mockStudents.filter(s => [3, 4].includes(s.id))); // Fallback
            } finally {
                setLoading(false);
            }
        };

        fetchChildren();
    }, []);

    const childrenData = useMemo(() => students
        .map(student => {
            // We can still try to mix in mock data for the stats if we want the UI to look populated
            // using the student ID if it matches mocks, or just generic randoms/zeros.
            // For this specific 'fix', let's prioritize showing the REAL students.

            // Try to find matching mock fee info or default
            const feeInfo = mockStudentFees.find(f => f.id === student.id) || {
                id: student.id,
                name: student.name,
                avatarUrl: student.avatarUrl,
                grade: student.grade,
                section: student.section,
                totalFee: 50000,
                paidAmount: 50000,
                dueDate: '2023-12-01',
                status: 'Paid'
            } as any;

            const nextHomework = mockAssignments[0]; // Just picking one for display if real ones aren't linked yet

            // Basic Attendance Calc (mock logic on real student)
            const attendancePercentage = 95; // Default for now

            return { student, feeInfo, nextHomework, recentGrades: [], attendancePercentage };
        }), [students]);

    const quickAccessItems = [
        { label: 'Bus Route', icon: <BusVehicleIcon className="h-7 w-7" />, action: () => navigateTo('busRoute', 'Bus Route') },
        { label: 'Calendar', icon: <CalendarIcon className="h-7 w-7" />, action: () => navigateTo('calendar', 'School Calendar') },
        { label: 'Noticeboard', icon: <MegaphoneIcon className="h-7 w-7" />, action: () => navigateTo('noticeboard', 'Noticeboard') },
        { label: 'Appointments', icon: <CalendarPlusIcon className="h-7 w-7" />, action: () => navigateTo('appointments', 'Book Appointment') },
    ];

    const childColorThemes = [{ bg: '#3b82f6', text: '#1e40af' }, { bg: '#ec4899', text: '#831843' }];

    return (
        <div className="p-4 lg:p-6 bg-gray-50">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main content */}
                <div className="lg:col-span-2 space-y-6">
                    {childrenData.map((data, index) => (
                        <ChildStatCard key={data.student.id} data={data} navigateTo={navigateTo} colorTheme={childColorThemes[index % childColorThemes.length]} />
                    ))}
                </div>
                {/* Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    <div>
                        <div className="flex justify-between items-center mb-2 px-1">
                            <h3 className="text-lg font-bold text-gray-800">School Utilities</h3>
                            <button onClick={() => navigateTo('schoolUtilities', 'School Utilities')} className="text-sm text-blue-600 hover:text-blue-800 font-medium">View All</button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {quickAccessItems.map((item) => (
                                <button key={item.label} onClick={item.action} className="bg-white p-3 rounded-2xl shadow-sm flex flex-col items-center justify-center space-y-2 hover:bg-gray-100 transition-colors">
                                    <div className="text-gray-600">{item.icon}</div>
                                    <span className="font-semibold text-gray-700 text-center text-xs">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface ParentDashboardProps {
    onLogout: () => void;
    setIsHomePage: (isHome: boolean) => void;
}

const LOGGED_IN_PARENT_ID = 1002; // Mrs. Bello

const ParentDashboard: React.FC<ParentDashboardProps> = ({ onLogout, setIsHomePage }) => {
    const [viewStack, setViewStack] = useState<ViewStackItem[]>([{ view: 'dashboard', title: 'Parent Dashboard' }]);
    const [activeBottomNav, setActiveBottomNav] = useState('home');
    const [version, setVersion] = useState(0);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const forceUpdate = () => setVersion(v => v + 1);

    useEffect(() => {
        const currentView = viewStack[viewStack.length - 1];
        setIsHomePage(currentView.view === 'dashboard' && !isSearchOpen);
    }, [viewStack, isSearchOpen, setIsHomePage]);

    const notificationCount = mockNotifications.filter(n => !n.isRead && n.audience.includes('parent')).length;

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
        switch (screen) {
            case 'home':
                setViewStack([{ view: 'dashboard', title: 'Parent Dashboard' }]);
                break;
            case 'reports':
                setViewStack([{ view: 'selectReport', title: 'Select Report Card' }]);
                break;
            case 'messages':
                setViewStack([{ view: 'messages', title: 'Messages' }]);
                break;
            case 'more':
                setViewStack([{ view: 'more', title: 'More Options' }]);
                break;
            default:
                setViewStack([{ view: 'dashboard', title: 'Parent Dashboard' }]);
        }
    };

    const handleNotificationClick = () => {
        navigateTo('notifications', 'Notifications', {});
    };

    const viewComponents: { [key: string]: React.ComponentType<any> } = {
        dashboard: Dashboard,
        childDetail: ChildDetailScreen,
        examSchedule: ExamSchedule,
        noticeboard: (props: any) => <NoticeboardScreen {...props} userType="parent" />,
        notifications: (props: any) => <NotificationsScreen {...props} userType="parent" navigateTo={navigateTo} />,
        calendar: CalendarScreen,
        library: LibraryScreen,
        busRoute: BusRouteScreen,
        feeStatus: (props: any) => <FeeStatusScreen {...props} childrenIds={[3, 4]} />,
        selectReport: SelectChildForReportScreen,
        reportCard: ReportCardScreen,
        timetable: TimetableScreen,
        more: ParentProfileScreen,
        editParentProfile: EditParentProfileScreen,
        feedback: FeedbackScreen,
        notificationSettings: ParentNotificationSettingsScreen,
        securitySettings: ParentSecurityScreen,
        learningResources: LearningResourcesScreen,
        schoolPolicies: SchoolPoliciesScreen,
        ptaMeetings: PTAMeetingScreen,
        photoGallery: ParentPhotoGalleryScreen,
        volunteering: VolunteeringScreen,
        permissionSlips: PermissionSlipScreen,
        appointments: AppointmentScreen,
        aiParentingTips: AIParentingTipsScreen,
        messages: ParentMessagesScreen,
        newChat: ParentNewChatScreen,
        chat: (props: any) => <ChatScreen {...props} currentUserId={LOGGED_IN_PARENT_ID} />,
        schoolUtilities: SchoolUtilitiesScreen,
    };

    const currentNavigation = viewStack[viewStack.length - 1];
    const ComponentToRender = viewComponents[currentNavigation.view];

    const commonProps = {
        navigateTo,
        onLogout,
        handleBack,
        forceUpdate,
    };

    return (
        <div className="flex flex-col h-full bg-gray-100 relative">
            <Header
                title={currentNavigation.title}
                avatarUrl="https://i.pravatar.cc/150?u=parent1"
                bgColor={THEME_CONFIG[DashboardType.Parent].mainBg}
                onLogout={onLogout}
                onBack={viewStack.length > 1 ? handleBack : undefined}
                onNotificationClick={handleNotificationClick}
                notificationCount={notificationCount}
                onSearchClick={() => setIsSearchOpen(true)}
            />
            <div className="flex-grow overflow-y-auto" style={{ marginTop: '-4rem' }}>
                <div className="pt-16">
                    <div key={`${viewStack.length}-${version}`} className="animate-slide-in-up">
                        {ComponentToRender ? (
                            <ComponentToRender {...currentNavigation.props} {...commonProps} />
                        ) : (
                            <div className="p-6">View not found: {currentNavigation.view}</div>
                        )}
                    </div>
                </div>
            </div>
            <ParentBottomNav activeScreen={activeBottomNav} setActiveScreen={handleBottomNavClick} />
            {isSearchOpen && (
                <GlobalSearchScreen
                    dashboardType={DashboardType.Parent}
                    navigateTo={navigateTo}
                    onClose={() => setIsSearchOpen(false)}
                />
            )}
        </div>
    );
};

export default ParentDashboard;