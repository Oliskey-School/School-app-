
import {
    Student,
    Teacher,
    Fee,
    Assignment,
    Submission,
    Notice,
    StudentAttendance,
    TimetableEntry,
    StudentPerformanceData,
    Notification,
    Role,
    Permission,
    AuditLog,
    Photo,
    DigitalResource,
    BusRoute,
    BusRosterEntry,
    Driver,
    PickupPoint,
    SubjectAverage,
    AttendanceCorrelationPoint,
    Exam,
    Conversation,
    PTAMeeting,
    SchoolPolicy,
    LearningResource,
    VolunteeringOpportunity,
    PermissionSlip,
    FeeBreakdownItem,
    PaymentHistoryItem,
    Badge,
    Certificate,
    Award,
    StoreProduct,
    StoreOrder,
    ForumTopic,
    PDResource,
    HealthLogEntry,
    AIGame,
    CBTTest,
    Activity,
    ExtracurricularEvent,
    ProgressReport,
    GamifiedQuiz,
    Quiz,
    Appointment,
    ClassInfo,
    Parent,
    RoleName,
    Complaint,
    AppointmentSlot,
    ChatMessage
} from './types';
import {
    ExamIcon,
    AttendanceIcon,
    ReportIcon,
    MegaphoneIcon,
    BookOpenIcon,
    ViewGridIcon,
    BusIcon,
    ReceiptIcon,
    UsersIcon,
    AnalyticsIcon,
    AIIcon,
    GameControllerIcon,
    TrophyIcon,
    StarIcon
} from './constants';

export const daysAgo = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
};

export const getSubjectsForStudent = (student: Student): string[] => {
    // Import from schoolSystem for accurate Nigerian curriculum
    const { getSubjectsForGrade } = require('./lib/schoolSystem');
    return getSubjectsForGrade(student.grade, student.department);
};

export const mockClasses: ClassInfo[] = []; // Migrated to Supabase
export const mockStudents: Student[] = []; // Migrated to Supabase
export const mockTeachers: Teacher[] = []; // Migrated to Supabase
export const mockParents: Parent[] = []; // Migrated to Supabase
export const mockNotices: Notice[] = []; // Migrated to Supabase
export const mockNotifications: Notification[] = []; // Migrated to Supabase
export const mockFees: Fee[] = []; // Migrated to Supabase
export const mockAssignments: Assignment[] = []; // Migrated to Supabase
export const mockSubmissions: Submission[] = []; // Migrated to Supabase
export const mockStudentAttendance: StudentAttendance[] = []; // Migrated to Supabase
export const mockTimetableData: TimetableEntry[] = []; // Migrated to Supabase
export const mockProgressReports: ProgressReport[] = [];
export const mockEnrollmentData: { year: number, count: number }[] = [];
export const mockAuditLogs: AuditLog[] = [];
export const mockSavedTimetable = { current: null as any };
export const mockBusRoster: BusRosterEntry[] = []; // Pending migration if used
export const mockBusRoutes: BusRoute[] = []; // Pending migration if used
export const mockDrivers: Driver[] = []; // Pending migration if used
export const mockPickupPoints: PickupPoint[] = [];
export const mockHealthLogs: HealthLogEntry[] = [];
export const mockExamsData: Exam[] = []; // Migrated to Supabase
export const mockCalendarEvents: any[] = [];
export const mockDigitalResources: DigitalResource[] = []; // Migrated to Supabase
export const mockPhotos: Photo[] = [];
export const mockMessages: ChatMessage[] = []; // Migrated to Supabase
export const mockConversations: Conversation[] = []; // Migrated to Supabase

export const mockAdminConversations: Conversation[] = [];
export const mockSubjectAverages: SubjectAverage[] = [];
export const mockTopStudents: StudentPerformanceData[] = [];
export const mockAttendanceCorrelation: AttendanceCorrelationPoint[] = [];
export const mockFeeBreakdown: FeeBreakdownItem[] = [];
export const mockPaymentHistory: PaymentHistoryItem[] = [];
export const mockBadges: Badge[] = [];
export const mockCertificates: Certificate[] = [];
export const mockAwards: Award[] = [];
export const mockLearningResources: LearningResource[] = [];
export const mockSchoolPolicies: SchoolPolicy[] = [];
export const mockPtaMeetings: PTAMeeting[] = [];
export const mockVolunteeringOpportunities: VolunteeringOpportunity[] = [];
export const mockPermissionSlip: PermissionSlip = {
    id: 1, title: 'Excursion (Placeholder)', description: '', date: new Date().toISOString(), location: '', status: 'Pending'
};
export const mockStoreProducts: StoreProduct[] = [];
export const mockStoreOrders: StoreOrder[] = [];
export const mockForumTopics: ForumTopic[] = [];
export const mockAppointmentSlots: AppointmentSlot[] = []; // Migrated/Pending
export const mockAppointments: Appointment[] = [];
export const mockQuizzes: GamifiedQuiz[] = [];
export const mockPdResources: PDResource[] = [];
export const mockCustomAIGames: AIGame[] = [];
export const mockActivities: Activity[] = [];
export const mockExtracurricularEvents: ExtracurricularEvent[] = [];
export const mockCBTTests: CBTTest[] = [];
export const mockComplaints: Complaint[] = [];
export const mockRolesAndPermissions: Role[] = [
    { id: 'Admin', name: 'Administrator', description: 'Full access', icon: UsersIcon, permissions: [{ id: 'manage-users', label: 'Manage Users', enabled: true }] },
    { id: 'Teacher', name: 'Teacher', description: 'Manage classes', icon: UsersIcon, permissions: [{ id: 'enter-results', label: 'Enter Results', enabled: true }] }
];
