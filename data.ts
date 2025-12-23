
import {
    Student,
    Teacher,
    StudentFeeInfo,
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
    Quiz,
    Appointment,
    ClassInfo,
    Parent,
    RoleName,
    Complaint,
    AppointmentSlot
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

export const mockClasses: ClassInfo[] = [];
export const mockStudents: Student[] = [];
export const mockTeachers: Teacher[] = [];
export const mockParents: Parent[] = [];
export const mockNotices: Notice[] = [];
export const mockNotifications: Notification[] = [];
export const mockStudentFees: StudentFeeInfo[] = [];
export const mockAssignments: Assignment[] = [];
export const mockSubmissions: Submission[] = [];
export const mockStudentAttendance: StudentAttendance[] = [];
export const mockTimetableData: TimetableEntry[] = [];
export const mockProgressReports: ProgressReport[] = [];
export const mockEnrollmentData: { year: number, count: number }[] = [];
export const mockAuditLogs: AuditLog[] = [];
export const mockSavedTimetable = { current: null as any };
export const mockBusRoster: BusRosterEntry[] = [
    { routeId: 'R1', driverId: 2, date: new Date().toISOString().split('T')[0] },
    { routeId: 'R2', driverId: 1, date: new Date().toISOString().split('T')[0] }
];
export const mockBusRoutes: BusRoute[] = [
    { id: 'R1', name: 'Route A - North Falls', description: 'Serves the northern residential districts and North Falls Estate.' },
    { id: 'R2', name: 'Route B - Sunnyside', description: 'Covers Sunnyside Avenue, Green Park, and the central market area.' },
    { id: 'R3', name: 'Route C - West End', description: 'Serves the West End layout including the new housing development.' },
    { id: 'R4', name: 'Route D - Harbour View', description: 'Long distance route covering Harbour View and coastal road.' }
];
export const mockDrivers: Driver[] = [
    { id: 1, name: 'Mr. John Smith', avatarUrl: 'https://i.pravatar.cc/150?u=john', phone: '+1234567890' },
    { id: 2, name: 'Mrs. Sarah Connor', avatarUrl: 'https://i.pravatar.cc/150?u=sarah', phone: '+1234567891' },
    { id: 3, name: 'Mr. Mike T', avatarUrl: 'https://i.pravatar.cc/150?u=mike', phone: '+1234567892' },
    { id: 4, name: 'Ms. Davina K', avatarUrl: 'https://i.pravatar.cc/150?u=davina', phone: '+1234567893' }
];
export const mockPickupPoints: PickupPoint[] = [];
export const mockHealthLogs: HealthLogEntry[] = [];
export const mockExamsData: Exam[] = [];
export const mockCalendarEvents: any[] = [];
export const mockDigitalResources: DigitalResource[] = [];
export const mockPhotos: Photo[] = [];
export const mockConversations: Conversation[] = [];
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
export const mockAppointmentSlots: AppointmentSlot[] = [
    { time: '09:00 AM', isBooked: false },
    { time: '10:00 AM', isBooked: false },
    { time: '11:00 AM', isBooked: true }, // One booked for demo
    { time: '12:00 PM', isBooked: false },
    { time: '01:00 PM', isBooked: false },
    { time: '02:00 PM', isBooked: false },
    { time: '03:00 PM', isBooked: false },
    { time: '04:00 PM', isBooked: false }
];
export const mockAppointments: Appointment[] = [];
export const mockQuizzes: Quiz[] = [];
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
