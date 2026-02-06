// ===================================================================
// ADDITIONAL FEATURES TYPES
// Types for: ID Cards, Alumni, Fundraising, Shop, Rewards, Video, Learning
// ===================================================================

// Import base types from main types file
import { Student, Teacher, StoreProduct, Badge } from './types';

// ===================================================================
// FEATURE 1: DIGITAL ID CARDS
// ===================================================================
export interface IDCard {
    id: number;
    userType: 'student' | 'teacher';
    userId: string;
    cardNumber: string;
    qrCodeData: string;
    generatedAt: string;
    expiresAt?: string;
    isActive: boolean;
}

// ===================================================================
// FEATURE 2: ALUMNI & FUNDRAISING
// ===================================================================
export interface Alumni {
    id: number;
    userId: string;
    studentId?: string;
    graduationYear: number;
    degreeObtained?: string;
    currentOccupation?: string;
    company?: string;
    location?: string;
    linkedinUrl?: string;
    websiteUrl?: string;
    bio?: string;
    isMentorAvailable: boolean;
    isVisible: boolean;
    user?: {
        name: string;
        email: string;
        avatarUrl?: string;
    };
}

export interface FundraisingCampaign {
    id: number;
    title: string;
    description?: string;
    goalAmount: number;
    raisedAmount: number;
    startDate: string;
    endDate: string;
    status: 'active' | 'completed' | 'cancelled';
    imageUrl?: string;
    createdBy: string;
    createdAt: string;
    donations?: Donation[];
}

export interface Donation {
    id: number;
    campaignId: number;
    donorId?: string;
    donorName?: string;
    amount: number;
    isAnonymous: boolean;
    paymentReference?: string;
    paymentProvider?: string;
    message?: string;
    donatedAt: string;
}

export interface MentorshipRequest {
    id: number;
    studentId: string;
    mentorId: string;
    status: 'pending' | 'accepted' | 'declined' | 'completed';
    subjectArea?: string;
    message?: string;
    createdAt: string;
    respondedAt?: string;
    mentor?: Alumni;
    student?: Student;
}

// ===================================================================
// FEATURE 3: ENHANCED SHOP
// ===================================================================
export interface EnhancedStoreProduct extends StoreProduct {
    images?: string[];
    sizes?: string[];
    colors?: string[];
    discountPercentage?: number;
    description?: string;
    sku?: string;
    isActive?: boolean;
}

export interface ShoppingCartItem {
    id: number;
    userId: string;
    productId: number;
    quantity: number;
    size?: string;
    color?: string;
    addedAt: string;
    product?: EnhancedStoreProduct;
}

export interface StoreOrderFull {
    id: number;
    orderNumber: string;
    userId: string;
    totalAmount: number;
    shippingAddress?: string;
    contactPhone?: string;
    contactEmail?: string;
    paymentReference?: string;
    paymentProvider?: string;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    notes?: string;
    createdAt: string;
    updatedAt: string;
    items?: OrderItem[];
}

export interface OrderItem {
    id: number;
    orderId: number;
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    size?: string;
    color?: string;
}

// ===================================================================
// FEATURE 4: REWARDS & BADGES
// ===================================================================
export interface StudentPoints {
    id: number;
    studentId: string;
    points: number;
    level: number;
    totalEarned: number;
    totalSpent: number;
    updatedAt: string;
}

export interface PointTransaction {
    id: number;
    studentId: string;
    points: number;
    reason: string;
    category: 'academic' | 'behavior' | 'attendance' | 'participation' | 'redemption';
    referenceId?: number;
    awardedBy?: string;
    createdAt: string;
    awardedByUser?: {
        name: string;
    };
}

export interface BadgeFull extends Badge {
    category?: 'academic' | 'behavioral' | 'attendance' | 'special';
    pointsRequired?: number;
    isActive?: boolean;
    iconUrl?: string;
}

export interface StudentBadge {
    id: number;
    studentId: string;
    badgeId: number;
    earnedAt: string;
    badge?: BadgeFull;
}

export interface BadgeCriteria {
    id: number;
    badgeId: number;
    criteriaType: string;
    criteriaValue: any;
    description?: string;
}

export interface RewardItem {
    id: number;
    name: string;
    description?: string;
    pointsCost: number;
    category: 'privilege' | 'physical' | 'experience';
    stockQuantity?: number;
    isAvailable: boolean;
    imageUrl?: string;
}

export interface RewardRedemption {
    id: number;
    studentId: string;
    rewardId: number;
    pointsSpent: number;
    status: 'pending' | 'approved' | 'delivered' | 'cancelled';
    redeemedAt: string;
    fulfilledAt?: string;
    reward?: RewardItem;
}

// ===================================================================
// FEATURE 5: VIDEO CONFERENCING
// ===================================================================
export interface VirtualClass {
    id: number;
    title: string;
    description?: string;
    teacherId: string;
    classGrade: number;
    classSection: string;
    subject: string;
    scheduledStart: string;
    scheduledEnd: string;
    meetingLink?: string;
    meetingId?: string;
    meetingPassword?: string;
    platform: 'jitsi' | 'zoom' | 'daily';
    status: 'scheduled' | 'live' | 'ended' | 'cancelled';
    recordingUrl?: string;
    maxParticipants?: number;
    createdAt: string;
    teacher?: Teacher;
}

export interface VirtualClassAttendance {
    id: number;
    classId: number;
    studentId: string;
    joinedAt?: string;
    leftAt?: string;
    durationMinutes?: number;
    wasOnTime: boolean;
    participationScore: number;
}

// ===================================================================
// FEATURE 6: CUSTOM LEARNING PATHS
// ===================================================================
export interface LearningPathFull {
    id: number;
    name: string;
    description?: string;
    subject: string;
    gradeLevel: number;
    difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
    estimatedDurationHours?: number;
    createdBy: string;
    isActive: boolean;
    isPublic: boolean;
    tags?: string[];
    createdAt: string;
    creator?: Teacher;
    modules?: LearningPathModule[];
}

export interface LearningPathModule {
    id: number;
    pathId: number;
    title: string;
    description?: string;
    orderIndex: number;
    contentType: 'video' | 'reading' | 'quiz' | 'assignment' | 'interactive' | 'exercise';
    contentUrl?: string;
    contentData?: any;
    estimatedMinutes?: number;
    pointsReward: number;
    prerequisites?: number[];
    isRequired: boolean;
}

export interface StudentLearningPath {
    id: number;
    studentId: string;
    pathId: number;
    assignedBy: string;
    assignedAt: string;
    startedAt?: string;
    completedAt?: string;
    status: 'assigned' | 'in_progress' | 'completed' | 'archived';
    progressPercentage: number;
    currentModuleId?: number;
    path?: LearningPathFull;
}

export interface ModuleProgress {
    id: number;
    studentId: string;
    moduleId: number;
    status: 'not_started' | 'in_progress' | 'completed';
    score?: number;
    attempts: number;
    startedAt?: string;
    completedAt?: string;
    timeSpentMinutes: number;
    notes?: string;
}

export interface AdaptiveRecommendation {
    id: number;
    studentId: string;
    recommendedPathId: number;
    reason?: string;
    confidenceScore: number;
    basedOnPerformance?: any;
    isAccepted?: boolean;
    createdAt: string;
    recommendedPath?: LearningPathFull;
}
