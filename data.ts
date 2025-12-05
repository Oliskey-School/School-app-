
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
    AppointmentSlot,
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
    Complaint
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
    if (student.grade >= 10) {
        if (student.department === 'Science') return ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology', 'Civic Education'];
        if (student.department === 'Arts') return ['Mathematics', 'English', 'Literature', 'Government', 'History', 'Civic Education'];
        if (student.department === 'Commercial') return ['Mathematics', 'English', 'Accounting', 'Commerce', 'Economics', 'Civic Education'];
    }
    return ['Mathematics', 'English', 'Basic Science', 'Basic Technology', 'Social Studies', 'Civic Education'];
};

export const mockClasses: ClassInfo[] = [
    { id: '1', subject: 'General', grade: 9, section: 'A', studentCount: 25 },
    { id: '2', subject: 'General', grade: 9, section: 'B', studentCount: 24 },
    { id: '3', subject: 'Science', grade: 10, section: 'A', department: 'Science', studentCount: 20 },
    { id: '4', subject: 'Arts', grade: 10, section: 'B', department: 'Arts', studentCount: 22 },
];

export const mockStudents: Student[] = [
    {
        id: 1,
        name: 'Adebayo Oluwaseun',
        avatarUrl: 'https://i.pravatar.cc/150?u=adebayo',
        grade: 10,
        section: 'A',
        department: 'Science',
        attendanceStatus: 'Present',
        academicPerformance: [
            { subject: 'Mathematics', score: 85, term: 'Term 1' },
            { subject: 'English', score: 78, term: 'Term 1' },
            { subject: 'Physics', score: 92, term: 'Term 1' },
        ],
        behaviorNotes: [],
        birthday: '2008-05-15'
    },
    {
        id: 2,
        name: 'Chidinma Okafor',
        avatarUrl: 'https://i.pravatar.cc/150?u=chidinma',
        grade: 10,
        section: 'A',
        department: 'Science',
        attendanceStatus: 'Absent',
        academicPerformance: [
            { subject: 'Mathematics', score: 95, term: 'Term 1' },
            { subject: 'English', score: 88, term: 'Term 1' },
            { subject: 'Physics', score: 89, term: 'Term 1' },
        ],
        behaviorNotes: [],
        birthday: '2008-08-20'
    },
    {
        id: 3,
        name: 'Musa Ibrahim',
        avatarUrl: 'https://i.pravatar.cc/150?u=musa',
        grade: 9,
        section: 'A',
        attendanceStatus: 'Present',
        academicPerformance: [],
        behaviorNotes: [],
        birthday: '2009-02-10'
    },
    {
        id: 4,
        name: 'Fatima Bello',
        avatarUrl: 'https://i.pravatar.cc/150?u=fatima',
        grade: 10,
        section: 'A',
        department: 'Science',
        attendanceStatus: 'Present',
        academicPerformance: [
             { subject: 'Mathematics', score: 78, term: 'Term 1' },
             { subject: 'English', score: 82, term: 'Term 1' },
             { subject: 'Physics', score: 75, term: 'Term 1' }
        ],
        behaviorNotes: [
            { id: 1, date: daysAgo(5), type: 'Positive', title: 'Helpful', note: 'Helped clean up after class.', by: 'Mr. Adeoye' }
        ],
        birthday: '2008-11-05',
        reportCards: [
            {
                term: 'First Term',
                session: '2023/2024',
                status: 'Published',
                academicRecords: [
                    { subject: 'Mathematics', ca: 30, exam: 55, total: 85, grade: 'A', remark: 'Excellent' },
                    { subject: 'English', ca: 25, exam: 50, total: 75, grade: 'B', remark: 'Good' }
                ],
                skills: { 'Neatness': 'A', 'Punctuality': 'B' },
                psychomotor: { 'Sports': 'A' },
                attendance: { total: 60, present: 58, absent: 2, late: 0 },
                teacherComment: 'A very diligent student.',
                principalComment: 'Keep it up.'
            }
        ]
    }
];

export const mockTeachers: Teacher[] = [
    {
        id: 1,
        name: 'Mr. John Adeoye',
        avatarUrl: 'https://i.pravatar.cc/150?u=teacher1',
        subjects: ['Mathematics', 'Physics'],
        classes: ['9A', '10A'],
        email: 'j.adeoye@school.com',
        phone: '+2348012345678',
        status: 'Active'
    },
    {
        id: 2,
        name: 'Mrs. Funke Akintola',
        avatarUrl: 'https://i.pravatar.cc/150?u=teacher2',
        subjects: ['English'],
        classes: ['9A', '9B', '10A', '10B'],
        email: 'f.akintola@school.com',
        phone: '+2348023456789',
        status: 'Active'
    }
];

export const mockParents: Parent[] = [
    {
        id: 1001,
        name: 'Mr. Adewale',
        email: 'adewale@example.com',
        phone: '+2348034567890',
        avatarUrl: 'https://i.pravatar.cc/150?u=parent1',
        childIds: [1]
    },
    {
        id: 1002,
        name: 'Mrs. Bello',
        email: 'bello@example.com',
        phone: '+2348045678901',
        avatarUrl: 'https://i.pravatar.cc/150?u=parent2',
        childIds: [3, 4]
    }
];

export const mockNotices: Notice[] = [
    {
        id: 1,
        title: 'Mid-Term Break',
        content: 'The school will be on mid-term break from Thursday 25th to Friday 26th.',
        timestamp: daysAgo(2),
        category: 'Holiday',
        isPinned: true,
        audience: ['all']
    },
    {
        id: 2,
        title: 'Inter-House Sports',
        content: 'Inter-house sports competition coming up next week!',
        timestamp: daysAgo(5),
        category: 'Event',
        isPinned: false,
        audience: ['all']
    }
];

export const mockNotifications: Notification[] = [
    {
        id: 1,
        category: 'Fees',
        title: 'School Fees Due',
        summary: 'Second term school fees are due.',
        timestamp: daysAgo(1),
        isRead: false,
        audience: ['parent'],
        studentId: 4
    }
];

export const mockStudentFees: StudentFeeInfo[] = [
    { id: 1, name: 'Adebayo Oluwaseun', avatarUrl: 'https://i.pravatar.cc/150?u=adebayo', grade: 10, section: 'A', totalFee: 150000, paidAmount: 100000, dueDate: '2024-05-01', status: 'Unpaid' },
    { id: 2, name: 'Chidinma Okafor', avatarUrl: 'https://i.pravatar.cc/150?u=chidinma', grade: 10, section: 'A', totalFee: 150000, paidAmount: 150000, dueDate: '2024-05-01', status: 'Paid' },
    { id: 4, name: 'Fatima Bello', avatarUrl: 'https://i.pravatar.cc/150?u=fatima', grade: 10, section: 'A', totalFee: 150000, paidAmount: 75000, dueDate: '2024-05-01', status: 'Unpaid' }
];

export const mockAssignments: Assignment[] = [
    {
        id: 1,
        title: 'Algebra Homework',
        description: 'Solve problems 1-10 on page 45.',
        className: 'Grade 10A',
        subject: 'Mathematics',
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
        totalStudents: 20,
        submissionsCount: 15
    }
];

export const mockSubmissions: Submission[] = [
    {
        id: 1,
        assignmentId: 1,
        student: { id: 2, name: 'Chidinma Okafor', avatarUrl: 'https://i.pravatar.cc/150?u=chidinma' },
        submittedAt: daysAgo(1),
        isLate: false,
        status: 'Graded',
        grade: 90
    }
];

export const mockStudentAttendance: StudentAttendance[] = [
    { studentId: 4, date: '2024-08-01', status: 'Present' },
    { studentId: 4, date: '2024-08-02', status: 'Present' },
    { studentId: 4, date: '2024-08-05', status: 'Absent' },
];

export const mockTimetableData: TimetableEntry[] = [
    { day: 'Monday', startTime: '09:00', endTime: '09:45', subject: 'Mathematics', className: 'Grade 10A' },
    { day: 'Monday', startTime: '09:45', endTime: '10:30', subject: 'English', className: 'Grade 10A' },
];

export const mockProgressReports: ProgressReport[] = [
    {
        studentId: 4,
        strengths: ['Mathematics', 'Physics'],
        areasForImprovement: ['Civic Education'],
        generalRemark: 'Doing well overall.'
    }
];

export const mockEnrollmentData = [
    { year: 2020, count: 450 },
    { year: 2021, count: 480 },
    { year: 2022, count: 520 },
    { year: 2023, count: 550 },
    { year: 2024, count: 600 },
];

export const mockAuditLogs: AuditLog[] = [
    { id: 1, user: { name: 'Admin User', avatarUrl: '', role: 'Admin' }, action: 'Updated fee structure', timestamp: daysAgo(0), type: 'update' },
    { id: 2, user: { name: 'Mrs. Funke', avatarUrl: '', role: 'Teacher' }, action: 'Uploaded exam results', timestamp: daysAgo(1), type: 'create' }
];

export const mockSavedTimetable = { current: null as any };

export const mockBusRoster: BusRosterEntry[] = [
    { routeId: 'route-a', driverId: 1, date: new Date().toISOString().split('T')[0] }
];

export const mockBusRoutes: BusRoute[] = [
    { id: 'route-a', name: 'Route A', description: 'Main Street - School' },
    { id: 'route-b', name: 'Route B', description: 'West End - School' }
];

export const mockDrivers: Driver[] = [
    { id: 1, name: 'Mr. Sunday', avatarUrl: '', phone: '08012345678' }
];

export const mockPickupPoints: PickupPoint[] = [
    { id: 1, name: 'Stop 1', position: { top: '20%', left: '30%' }, isUserStop: true },
    { id: 2, name: 'Stop 2', position: { top: '50%', left: '60%' }, isUserStop: false }
];

export const mockHealthLogs: HealthLogEntry[] = [
    {
        id: 1,
        studentId: 1,
        studentName: 'Adebayo Oluwaseun',
        studentAvatar: '',
        date: daysAgo(2),
        time: '10:00 AM',
        reason: 'Headache',
        notes: 'Rest in sick bay.',
        parentNotified: true,
        recordedBy: 'Nurse Joy'
    }
];

export const mockExamsData: Exam[] = [
    {
        id: 1,
        type: 'Mid-term',
        date: '2024-10-15',
        time: '09:00',
        className: 'Grade 10A',
        subject: 'Mathematics',
        isPublished: true,
        teacherId: 1
    }
];

export const mockCalendarEvents = [
    { id: 1, date: '2024-08-10', title: 'PTA Meeting', type: 'General' as const },
    { id: 2, date: '2024-08-15', title: 'Sports Day', type: 'Sport' as const }
];

export const mockDigitalResources: DigitalResource[] = [
    { id: 1, title: 'Algebra Basics', type: 'Video', subject: 'Mathematics', description: 'Intro to Algebra', thumbnailUrl: 'https://img.youtube.com/vi/NybHckSEQBI/0.jpg' }
];

export const mockRolesAndPermissions: Role[] = [
    { id: 'Admin', name: 'Administrator', description: 'Full access', icon: UsersIcon, permissions: [{ id: 'manage-users', label: 'Manage Users', enabled: true }] },
    { id: 'Teacher', name: 'Teacher', description: 'Manage classes', icon: UsersIcon, permissions: [{ id: 'enter-results', label: 'Enter Results', enabled: true }] }
];

export const mockPhotos: Photo[] = [
    { id: 1, imageUrl: 'https://via.placeholder.com/150', caption: 'Science Fair' }
];

export const mockConversations: Conversation[] = [
    {
        id: '1',
        participant: { id: 2, name: 'Mrs. Funke Akintola', avatarUrl: 'https://i.pravatar.cc/150?u=teacher2', role: 'Teacher' },
        lastMessage: { text: 'Hello', timestamp: daysAgo(0) },
        unreadCount: 1,
        messages: [{ id: '1', senderId: 2, text: 'Hello', timestamp: daysAgo(0), type: 'text' }]
    }
];

export const mockAdminConversations = [...mockConversations]; // for demo

export const mockSubjectAverages: SubjectAverage[] = [
    { subject: 'Mathematics', averageScore: 75 },
    { subject: 'English', averageScore: 80 }
];

export const mockTopStudents: StudentPerformanceData[] = [
    { id: 2, name: 'Chidinma Okafor', avatarUrl: '', grade: 10, section: 'A', averageScore: 92 }
];

export const mockAttendanceCorrelation: AttendanceCorrelationPoint[] = [
    { attendanceBracket: '90-100%', averageScore: 85 },
    { attendanceBracket: '80-89%', averageScore: 75 }
];

export const mockFeeBreakdown: FeeBreakdownItem[] = [
    { item: 'Tuition', amount: 100000 },
    { item: 'Development Levy', amount: 20000 }
];

export const mockPaymentHistory: PaymentHistoryItem[] = [
    { id: '1', date: '2024-01-10', amount: 50000, method: 'Bank Transfer' }
];

export const mockBadges: Badge[] = [
    { id: 1, name: 'Math Whiz', description: 'Top score in Math', icon: TrophyIcon, color: 'bg-blue-100 text-blue-600' }
];

export const mockCertificates: Certificate[] = [
    { id: 1, name: 'Honor Roll', issuedDate: '2023-12-15', issuer: 'Principal', fileUrl: '' }
];

export const mockAwards: Award[] = [
    { id: 1, name: 'Best Student', date: '2023', description: 'Overall best student' }
];

export const mockLearningResources: LearningResource[] = [
    { id: 1, title: 'Math Guide', type: 'PDF', subject: 'Mathematics', description: 'Guide', url: '#', thumbnailUrl: '' }
];

export const mockSchoolPolicies: SchoolPolicy[] = [
    { id: 1, title: 'Code of Conduct', description: 'Rules', url: '#' }
];

export const mockPtaMeetings: PTAMeeting[] = [
    { id: 1, title: 'Term 1 Meeting', date: '2024-09-10', time: '10:00 AM', agenda: [{ title: 'Budget', presenter: 'Treasurer' }], isPast: false }
];

export const mockVolunteeringOpportunities: VolunteeringOpportunity[] = [
    { id: 1, title: 'Library Assistant', description: 'Help in library', date: '2024-09-15', spotsAvailable: 5, spotsFilled: 2 }
];

export const mockPermissionSlip: PermissionSlip = {
    id: 1, title: 'Excursion to Zoo', description: 'Trip details', date: '2024-10-01', location: 'City Zoo', status: 'Pending'
};

export const mockStoreProducts: StoreProduct[] = [
    { id: 1, name: 'School Uniform', category: 'Uniform', price: 15000, imageUrl: 'https://via.placeholder.com/150', stock: 50 }
];

export const mockStoreOrders: StoreOrder[] = [
    { id: 'ORD-1', customerName: 'Mrs. Bello', items: [{ productName: 'Uniform', quantity: 2 }], totalAmount: 30000, status: 'Pending', orderDate: daysAgo(1) }
];

export const mockForumTopics: ForumTopic[] = [
    { id: 1, title: 'Teaching Strategies', authorName: 'Mr. Adeoye', createdAt: daysAgo(5), posts: [], postCount: 0, lastActivity: daysAgo(5) }
];

export const mockAppointmentSlots: AppointmentSlot[] = [
    { time: '09:00 AM', isBooked: false },
    { time: '10:00 AM', isBooked: true },
    { time: '11:00 AM', isBooked: false }
];

export const mockAppointments: Appointment[] = [
    { id: 1, teacherId: 2, parentId: 1002, studentId: 4, date: '2024-09-20', time: '09:00 AM', reason: 'Discuss grades', status: 'Pending' }
];

export const mockQuizzes: Quiz[] = [
    {
        id: 1, subject: 'General Knowledge', title: 'Weekly Quiz', questionCount: 10, points: 50,
        questions: [{ question: 'Capital of Nigeria?', options: ['Lagos', 'Abuja', 'Kano'], correctAnswer: 'Abuja' }]
    }
];

export const mockPdResources: PDResource[] = [
    { id: 1, type: 'Article', title: 'Modern Teaching', source: 'Edutopia', summary: 'New methods', url: '#' }
];

export const mockCustomAIGames: AIGame[] = [];

export const mockActivities: Activity[] = [
    { id: 1, name: 'Chess Club', category: 'Club', description: 'Play chess', icon: GameControllerIcon },
    { id: 2, name: 'Football', category: 'Sport', description: 'Play football', icon: TrophyIcon },
    { id: 3, name: 'Drama Club', category: 'Cultural', description: 'Acting', icon: StarIcon }
];

export const mockExtracurricularEvents: ExtracurricularEvent[] = [
    { id: 1, title: 'Football Match', date: '2024-08-20', category: 'Sport' }
];

export const mockCBTTests: CBTTest[] = [
    {
        id: 1,
        title: "General Science Assessment",
        type: 'Test',
        className: "Grade 10A",
        subject: "Science",
        duration: 45,
        attempts: 1,
        fileName: "science_term1.xlsx",
        questionsCount: 20,
        createdAt: daysAgo(5),
        isPublished: true,
        results: [],
        questions: [
            { id: 1, text: "What is the powerhouse of the cell?", options: ["Nucleus", "Mitochondria", "Ribosome", "Cytoplasm"], correctAnswer: "Mitochondria" },
            { id: 2, text: "What is the chemical symbol for Gold?", options: ["Au", "Ag", "Fe", "Pb"], correctAnswer: "Au" },
            { id: 3, text: "Which planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter", "Saturn"], correctAnswer: "Mars" }
        ]
    },
    {
        id: 2,
        title: "Mathematics Quick Quiz",
        type: 'Test',
        className: "Grade 9A",
        subject: "Mathematics",
        duration: 30,
        attempts: 2,
        fileName: "math_quiz_1.xlsx",
        questionsCount: 15,
        createdAt: daysAgo(2),
        isPublished: false,
        results: [],
        questions: [
            { id: 1, text: "What is 12 * 12?", options: ["124", "144", "164", "100"], correctAnswer: "144" },
            { id: 2, text: "Solve for x: 2x + 5 = 15", options: ["5", "10", "2", "7"], correctAnswer: "5" }
        ]
    },
    {
        id: 3,
        title: "Term 1 Biology Exam",
        type: 'Exam',
        className: "Grade 10A",
        subject: "Biology",
        duration: 90,
        attempts: 1,
        fileName: "bio_exam_term1.xlsx",
        questionsCount: 50,
        createdAt: daysAgo(1),
        isPublished: false,
        results: [],
        questions: []
    }
];
// Added mockComplaints to fix the error in FeedbackScreen
export const mockComplaints: Complaint[] = [
    {
        id: 'COMP-1721058291234',
        category: 'Facilities',
        rating: 3,
        comment: 'The air conditioning in Grade 10A is faulty.',
        timeline: [
            {
                timestamp: daysAgo(2),
                status: 'Submitted',
                comment: 'The air conditioning in Grade 10A is faulty.',
                by: 'You',
            },
            {
                timestamp: daysAgo(1),
                status: 'In Progress',
                comment: 'Maintenance team has been notified.',
                by: 'Admin',
            }
        ]
    }
];
