
import React from 'react';

export enum DashboardType {
  Admin = 'Admin',
  Teacher = 'Teacher',
  Parent = 'Parent',
  Student = 'Student',
  Proprietor = 'Proprietor',
  Inspector = 'Inspector',
  ExamOfficer = 'Exam Officer',
  ComplianceOfficer = 'Compliance Officer',
  Counselor = 'Counselor',
}

export interface Exam {
  id: number;
  type: string;
  date: string;
  time?: string;
  className: string;
  subject: string;
  isPublished: boolean;
  teacherId?: number; // To associate exams with the teacher who created them
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Leave' | 'Late';

export interface AcademicRecord {
  subject: string;
  score: number; // out of 100
  term: 'Term 1' | 'Term 2' | 'Term 3';
  teacherRemark?: string;
}

export interface BehaviorNote {
  id: number;
  date: string;
  type: 'Positive' | 'Negative';
  title: string;
  note: string;
  by: string; // Teacher's name
  suggestions?: string[];
}

export type Department = 'Science' | 'Commercial' | 'Arts';

export type Rating = 'A' | 'B' | 'C' | 'D' | 'E' | '';

export interface ReportCardAcademicRecord {
  subject: string;
  ca: number;
  exam: number;
  total: number;
  grade: string;
  remark: string;
}

export interface ReportCard {
  term: string; // e.g., "Second Term"
  session: string; // e.g., "2023/2024"
  academicRecords: ReportCardAcademicRecord[];
  skills: Record<string, Rating>;
  psychomotor: Record<string, Rating>;
  attendance: {
    total: number;
    present: number;
    absent: number;
    late: number;
  };
  teacherComment: string;
  principalComment: string;
  status: 'Draft' | 'Submitted' | 'Published';
}

export interface Student {
  id: number;
  name: string;
  email: string;
  avatarUrl: string;
  grade: number;
  section: string;
  rollNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  phone?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  admissionDate?: string;
  bloodGroup?: string;
  status?: 'Active' | 'Inactive' | 'Suspended';
  attendance?: number;
  performance?: number;
  subjects?: string[];
  fees?: {
    total: number;
    paid: number;
    pending: number;
  };
  department?: Department;
  attendanceStatus: AttendanceStatus;
  academicPerformance?: AcademicRecord[];
  behaviorNotes?: BehaviorNote[];
  reportCards?: ReportCard[];
  birthday?: string; // YYYY-MM-DD
  user_id?: string; // Link to auth user
}

export type StudentReportInfo = Student & { status: 'Draft' | 'Submitted' | 'Published'; };

export interface StudentAttendance {
  id: number;
  studentId: number;
  date: string; // YYYY-MM-DD
  status: 'Present' | 'Absent' | 'Late' | 'Leave';
}

export interface Teacher {
  id: number;
  name: string;
  avatarUrl: string;
  subjects: string[];
  classes: string[];
  email: string;
  phone: string;
  status: 'Active' | 'Inactive' | 'On Leave';
  dateOfJoining?: string;
  qualification?: string;
  experience?: string;
  address?: string;
  gender?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  emergencyContact?: string;
  salary?: number;
  attendance?: number;
  performance?: number;
}

export interface ClassInfo {
  id: string;
  subject: string;
  grade: number;
  section: string;
  department?: Department;
  studentCount: number;
}


export interface Notice {
  id: number;
  title: string;
  content: string;
  timestamp: string; // ISO string
  // FIX: Updated category to use the unified AnnouncementCategory type.
  category: AnnouncementCategory;
  isPinned: boolean;
  imageUrl?: string;
  videoUrl?: string;
  audience: Array<'all' | 'parents' | 'teachers' | 'students'>;
  className?: string;
}

export type EventType = 'Sport' | 'Culture' | 'Exam' | 'Holiday' | 'General';

export interface CalendarEvent {
  id: number;
  date: string; // YYYY-MM-DD format
  title: string;
  type: EventType;
  description?: string;
}

export type BookCategory = 'Fiction' | 'Science' | 'History' | 'Comics';

export interface Book {
  id: number;
  title: string;
  author: string;
  coverUrl: string;
  category: BookCategory;
}

export type DigitalResourceType = 'PDF' | 'Video' | 'Slides' | 'Code' | 'Document';

export interface DigitalResource {
  id: number;
  title: string;
  type: DigitalResourceType;
  subject: string;
  description: string;
  thumbnailUrl: string;
  url?: string;
  language?: 'English' | 'Hausa' | 'Yoruba' | 'Igbo';
  curriculumTags?: string[];
}

export interface VideoLesson extends DigitalResource {
  type: 'Video';
  videoUrl: string; // e.g., YouTube embed URL
  duration: string; // e.g., "12:35"
  notes: string; // Markdown formatted notes
  relatedResourceIds: number[]; // IDs of related resources
}


export interface Driver {
  id: number;
  name: string;
  avatarUrl: string;
  phone: string;
}

export interface PickupPoint {
  id: number;
  name: string;
  position: { top: string; left: string };
  isUserStop: boolean;
}

export interface Permission {
  id: string;
  label: string;
  enabled: boolean;
}

export type RoleName = 'Admin' | 'Teacher' | 'Parent' | 'Student' | 'Principal' | 'Counselor' | 'Proprietor' | 'Inspector' | 'Exam Officer' | 'Compliance Officer';

export interface Role {
  id: RoleName;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  permissions: Permission[];
}

export type AuditLogActionType = 'login' | 'logout' | 'create' | 'update' | 'delete' | 'publish' | 'payment';

export interface AuditLog {
  id: number;
  user: {
    name: string;
    avatarUrl: string;
    role: RoleName;
  };
  action: string;
  timestamp: string; // ISO string
  type: AuditLogActionType;
}

export interface Photo {
  id: number;
  imageUrl: string;
  caption: string;
}

export interface Assignment {
  id: number;
  title: string;
  description?: string;
  className: string; // e.g., "Grade 10A"
  subject: string;
  dueDate: string; // ISO string
  totalStudents: number;
  submissionsCount: number;
}

export type GradingStatus = 'Graded' | 'Ungraded';

export interface Submission {
  id: number;
  assignmentId: number;
  student: {
    id: number;
    name: string;
    avatarUrl: string;
  };
  submittedAt: string; // ISO string
  isLate: boolean;
  status: GradingStatus;
  grade?: number; // score out of 100
  feedback?: string;
  textSubmission?: string;
  files?: { name: string; size: number }[];
}


export type StudentAssignment = Assignment & {
  submission?: Submission;
}

export type CurriculumSubjectCategory =
  | 'Core'
  | 'Elective'
  | 'Compulsory'
  | 'Foundational Play-Based Learning'
  | 'Core Foundational'
  | 'Pre-Primary Core'
  | 'Pre-Vocational Electives'
  | 'Other Electives';


export interface CurriculumSubject {
  name: string;
  category: CurriculumSubjectCategory;
}

export interface Fee {
  id: number;
  studentId: number;
  title: string;          // Added title
  description?: string;   // Added description
  amount: number;         // Consistent naming (was totalFee)
  paidAmount: number;
  dueDate: string;
  status: 'Pending' | 'Partial' | 'Paid' | 'Overdue'; // Updated status enum
  type?: string;          // Optional categorization
  curriculumType?: 'Nigerian' | 'British' | 'Dual' | 'General';
  createdAt?: string;     // ISO string - timestamp when fee was created/assigned
  hasPaymentPlan?: boolean; // Indicates if fee has an installment payment plan
}

export interface ChatUser {
  id: number;
  name: string;
  avatarUrl: string;
  role: string;
  isOnline?: boolean;
  lastSeen?: string;
}

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file';

export interface ChatReaction {
  id: number;
  messageId: number;
  userId: number;
  emoji: string;
}

export interface ChatMessage {
  id: number;
  roomId: number;
  senderId: number;
  content: string;
  type: MessageType;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  replyToId?: number;
  replyToMessage?: ChatMessage; // Populated on frontend
  reactions?: ChatReaction[]; // Populated on frontend
  isDeleted: boolean;
  isEdited: boolean;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  sender?: ChatUser; // Populated on frontend
}

export interface ChatParticipant {
  roomId: number;
  userId: number;
  role: 'member' | 'admin';
  joinedAt: string;
  lastReadMessageId?: number;
  user?: ChatUser;
}

export interface ChatRoom {
  id: number;
  type: 'direct' | 'group' | 'class';
  name?: string;
  isGroup: boolean;
  creatorId: number;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  lastMessage?: ChatMessage; // From join
  participants: ChatParticipant[];
  unreadCount?: number; // Calculated
}

// Keeping the old interfaces for now to avoid breaking existing code, but aliasing or marking deprecated if needed.
// However, the prompt implies "fixing" the app, so replacing is better if I update the usage.
// I will keep Message and Conversation as aliases or legacy types if they are heavily used, but better to update them.

export type Message = ChatMessage; // Alias for backward compatibility if possible, though properties differ.
// Actually, let's keep the old Message interface but mark deprecated, or try to map. 
// The old Message used string ID, new uses number.
// I'll leave the old ones for a moment but add the new ones above.

export type Conversation = ChatRoom; // Backward compatibility alias


// FIX: Unify AnnouncementCategory with Notice category to support all required types.
export type AnnouncementCategory = 'General' | 'Homework' | 'Test Reminder' | 'Event' | 'Urgent' | 'Holiday';

export interface TimetableEntry {
  id: number;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  startTime: string; // "09:00"
  endTime: string; // "10:00"
  subject: string;
  className: string; // e.g., "Grade 11C"
  teacherId?: number;
}

export interface StudentPerformanceData {
  id: number;
  name: string;
  avatarUrl: string;
  grade: number;
  section: string;
  averageScore: number;
}

export interface SubjectAverage {
  subject: string;
  averageScore: number;
}

export interface AttendanceCorrelationPoint {
  attendanceBracket: string; // e.g., "90-100%"
  averageScore: number;
}

export type ActivityCategory = 'Club' | 'Sport' | 'Cultural';

export interface Activity {
  id: number;
  name: string;
  category: ActivityCategory;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface ExtracurricularEvent {
  id: number;
  title: string;
  date: string; // YYYY-MM-DD
  category: ActivityCategory;
}

export interface Badge {
  id: number;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string; // e.g., 'bg-green-100 text-green-800'
}

export interface Certificate {
  id: number;
  name: string;
  issuedDate: string; // YYYY-MM-DD
  issuer: string;
  fileUrl: string; // mock URL
}

export interface Award {
  id: number;
  name: string;
  date: string; // YYYY-MM-DD
  description: string;
}

export interface FeeBreakdownItem {
  item: string;
  amount: number;
}

export interface Transaction {
  id: number;
  feeId?: number;
  studentId: number;
  payerId?: string;
  amount: number;
  reference: string;
  provider: 'Paystack' | 'Flutterwave' | 'Cash' | 'Bank Transfer';
  status: 'Pending' | 'Success' | 'Failed';
  date: string; // ISO String
}

export type PaymentHistoryItem = Transaction; // Alias for backward compatibility

export interface ProgressReport {
  studentId: number;
  strengths: string[];
  areasForImprovement: string[];
  generalRemark: string;
}

export interface BehaviorAlert {
  id: number;
  studentId: number;
  studentName: string;
  type: 'Positive' | 'Incident';
  title: string;
  summary: string;
  timestamp: string; // ISO string
}

export interface Parent {
  id: number;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  childIds?: number[];
  address?: string;
  occupation?: string;
  relationship?: string;
  emergencyContact?: string;
  user_id?: string; // Link to auth/users table
}

export type ComplaintStatus = 'Submitted' | 'In Progress' | 'Resolved' | 'Closed';

export interface ComplaintUpdate {
  timestamp: string; // ISO string
  status: ComplaintStatus;
  comment: string;
  by: 'You' | 'Admin';
}

export interface Complaint {
  id: string;
  category: 'Bus Service' | 'Academics' | 'Teacher Conduct' | 'Facilities' | 'Other';
  rating: number; // 1-5
  comment: string;
  imageUrl?: string;
  timeline: ComplaintUpdate[];
}

export type NotificationCategory = 'Fees' | 'Attendance' | 'Message' | 'Event' | 'Volunteering' | 'Homework';

export interface Notification {
  id: number;
  userId?: number;
  category: NotificationCategory;
  title: string;
  summary: string;
  timestamp: string; // ISO String
  isRead: boolean;
  audience: Array<'all' | 'admin' | 'parent' | 'student' | 'teacher'>;
  studentId?: number; // Optional, to link to a specific child
  relatedId?: number; // e.g. parentId, eventId, etc.
}

export interface PTAMeeting {
  id: number;
  title: string;
  date: string; // ISO string
  time: string;
  agenda: { title: string; presenter: string }[];
  isPast: boolean;
}

export interface LearningResource {
  id: number;
  title: string;
  type: 'PDF' | 'Video';
  subject: string;
  description: string;
  url: string; // download or view link
  thumbnailUrl: string;
}

export interface SchoolPolicy {
  id: number;
  title: string;
  description: string;
  url: string; // download link
}

export interface VolunteeringOpportunity {
  id: number;
  title: string;
  description: string;
  date: string; // ISO string
  spotsAvailable: number;
  spotsFilled: number;
}

export interface PermissionSlip {
  id: number;
  title: string;
  description: string;
  date: string; // ISO string
  location: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

// For Admin Online Store
export interface StoreProduct {
  id: number;
  name: string;
  category: 'Uniform' | 'Book' | 'Stationery';
  price: number;
  imageUrl: string;
  stock: number;
}


export type QuestionType = 'MultipleChoice' | 'Theory' | 'TrueFalse';

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: number;
  quizId: number;
  text: string;
  type: QuestionType;
  options?: QuestionOption[];
  points: number;
  imageUrl?: string;
}

export interface Quiz {
  id: number;
  title: string;
  subject: string;
  grade: number;
  teacherId: number;
  description?: string;
  durationMinutes?: number;
  questionCount?: number; // Computed
  isPublished: boolean;
  questions?: Question[];
  createdAt: string;
  points?: number; // Total points
}

export interface QuizSubmission {
  id: number;
  quizId: number;
  studentId: number;
  answers: { questionId: number, selectedOptions?: string[], textAnswer?: string }[];
  score: number;
  submittedAt: string;
  status: 'Graded' | 'Pending';
}

export interface StoreOrder {
  id: string;
  customerName: string;
  items: { productName: string, quantity: number }[];
  totalAmount: number;
  status: 'Pending' | 'Shipped' | 'Delivered';
  orderDate: string; // ISO string
}

// For Teacher Collaboration Forum
export interface ForumPost {
  id: number;
  author: {
    name: string;
    avatarUrl: string;
  };
  content: string;
  timestamp: string; // ISO string
}

export interface ForumTopic {
  id: number;
  title: string;
  authorName: string;
  createdAt: string; // ISO string
  posts: ForumPost[];
  postCount: number;
  lastActivity: string; // ISO string
}

// For Parent Appointment Scheduling
export interface AppointmentSlot {
  time: string; // e.g., "09:00 AM"
  isBooked: boolean;
}

export interface Appointment {
  id: number;
  teacherId: number;
  parentId: number;
  studentId: number;
  date: string; // YYYY-MM-DD
  time: string;
  reason: string;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
}

// For Student Gamified Quizzes
export interface GamifiedQuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface GamifiedQuiz {
  id: number;
  subject: string;
  title: string;
  questionCount: number;
  points: number;
  questions: GamifiedQuizQuestion[];
}

export interface LessonPlan {
  id: number;
  title: string;
  grade: string;
  subject: string;
  objectives: string[];
  materials: string[];
  activities: {
    title: string;
    description: string;
  }[];
  assessment: string;
}

export interface PDResource {
  id: number;
  type: 'Article' | 'Video' | 'Workshop';
  title: string;
  source: string; // e.g., 'Edutopia', 'YouTube', 'School Admin'
  summary: string;
  url: string;
}

// For AI Adventure Quest
export type AdventureDifficulty = 'Young Explorer (4-7 years)' | 'Brave Adventurer (8-11 years)' | 'Master Sage (12-15 years)';

export interface AdventureQuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  image_prompt: string;
  background_theme: string;
  generated_image_url?: string; // Will be populated later
}

export interface StudyGuideSection {
  title: string;
  content: string;
}

export interface StudyGuide {
  title: string;
  sections: StudyGuideSection[];
}

export interface AdventureData {
  study_guide: StudyGuide;
  quiz: AdventureQuizQuestion[];
}

export interface UserAnswer {
  questionId: number;
  answer: string;
  isCorrect: boolean;
}

// For AI Lesson Planner
export interface SchemeWeek {
  week: number;
  topic: string;
  subTopics: string[];
}

export interface SavedScheme {
  subject: string;
  className: string;
  term1Scheme: SchemeWeek[];
  term2Scheme: SchemeWeek[];
  term3Scheme: SchemeWeek[];
}

export type HistoryEntry = SavedScheme & {
  lastUpdated: string;
};

export interface SchemeTopic {
  week: number;
  topic: string;
}

export interface DetailedNote {
  topic: string;
  note: string;
  imageSuggestions?: string[]; // Descriptions of images to illustrate key concepts
}

export interface GeneratedLessonPlan {
  week: number;
  topic: string;
  objectives: string[];
  materials: string[];
  teachingSteps: { step: string; description: string }[];
  duration: string;
  keyVocabulary: string[];
  assessmentMethods: string[];
  visualAidSuggestions?: string[]; // Descriptions of potential diagrams/images
}

export interface TermResources {
  term: string;
  schemeOfWork: SchemeWeek[];
  lessonPlans: GeneratedLessonPlan[];
  assessments: GeneratedAssessment[];
}

export interface GeneratedResources {
  subject: string;
  className: string;
  terms: TermResources[];
  detailedNotes?: DetailedNote[];
}

export interface GeneratedHistoryEntry {
  subject: string;
  className: string;
  lastUpdated: string; // ISO string
  resources: GeneratedResources;
}


// For Health & Wellness Module
export interface HealthLogEntry {
  id: number;
  studentId: number;
  studentName: string;
  studentAvatar: string;
  date: string; // ISO string
  time: string;
  reason: string; // e.g., 'Headache', 'Fever', 'Minor Injury'
  notes: string;
  medicationAdministered?: { name: string; dosage: string; };
  parentNotified: boolean;
  recordedBy: string; // Nurse/Admin name
}

// For AI Game Creator
export type GameLevel = 'Pre-Primary (3-5 years)' | 'Lower Primary (6-8 years)' | 'Upper Primary (9-11 years)' | 'Junior Secondary (12-14 years)' | 'Senior Secondary (15-18 years)';

export interface AIGameQuestion {
  id: string; // Use string for potential UUIDs
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface AIGame {
  id: string;
  gameName: string;
  subject: string;
  topic: string;
  level: GameLevel;
  creatorId: number; // Teacher's ID
  status: 'Draft' | 'Published';
  questions: AIGameQuestion[];
}

// ============================================
// NEW TYPES FOR BACKEND FEATURE EXPANSION
// ============================================

export interface Curriculum {
  id: number; // BigInt from DB
  name: string;
  description: string;
}

export interface Subject {
  id: number;
  name: string;
  code?: string;
  category: string;
  curriculumId: number;
  gradeLevel: string;
  schoolId?: number;
}

export interface LessonNote {
  id: number;
  teacherId: number;
  subjectId: number;
  classId: number;
  week: number;
  term: string;
  title: string;
  content: string;
  fileUrl?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  adminFeedback?: string;
  createdAt: string;
}

export interface CBTExam {
  id: number;
  title: string;
  type?: 'Test' | 'Exam'; // Added
  subjectId: number;
  classId?: number; // Added
  classGrade: string;
  curriculumId: number;
  durationMinutes: number;
  duration?: number; // Alias for frontend usage if needed (often used as alias for durationMinutes)
  totalQuestions: number;
  totalMarks?: number; // Added
  isPublished: boolean;
  teacherId: number;
  createdAt: string;
}

export interface CBTQuestion {
  id: number;
  examId: number;
  questionText: string;
  questionType: 'multiple_choice' | 'true_false' | 'theory';
  options: string[]; // JSONB stored as array of strings
  correctOption: string;
  points: number;
}

export interface CBTResult {
  id: number;
  examId: number;
  studentId: number;
  score: number;
  totalScore: number;
  percentage: number;
  answers: any; // JSONB
  submittedAt: string;
}

// ============================================
// EXISTING HELPERS
// ============================================
// For Lesson Planner Generated Assessment
export interface GeneratedQuestion {
  id: number;
  question: string;
  type: 'multiple-choice' | 'short-answer' | 'theory' | 'practical';
  marks: number;
  options?: string[];
}
export type AssessmentQuestion = GeneratedQuestion; // Alias

export interface GeneratedAssessment {
  week: number;
  type: string;
  totalMarks: number;
  questions: GeneratedQuestion[];
}

