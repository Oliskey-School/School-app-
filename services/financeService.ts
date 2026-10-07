import { api } from '../lib/api';
import {
    Assignment,
    Exam,
} from '../types';

/**
 * Data Service
 * Refactored to use the custom backend API exclusively.
 */

// (fetchAssignments and createAssignment moved to assignmentService.ts)

// ============================================
// EXAMS
// ============================================

// (fetchExams moved to examService.ts)

// ============================================
// FEE MANAGEMENT
// ============================================

export async function fetchStudentFees(studentId?: string | number): Promise<any[]> {
    try {
        const schoolId = (await api.getMe()).school_id;
        const data = await api.getFees(schoolId);
        
        let filtered = data;
        if (studentId) {
            filtered = data.filter((f: any) => f.student_id === studentId || f.studentId === studentId);
        }

        return (filtered || []).map((f: any) => ({
            id: f.id,
            studentId: f.student_id || f.studentId,
            totalFee: f.total_fee || f.totalFee,
            paidAmount: f.paid_amount || f.paidAmount,
            status: f.status,
            dueDate: f.due_date || f.dueDate,
            title: f.title,
            term: f.term
        }));
    } catch (err) {
        console.error('Error fetching student fees:', err);
        return [];
    }
}

export async function fetchStudentFeeSummary(studentId: string | number): Promise<any> {
    try {
        const fees = await fetchStudentFees(studentId);
        if (fees.length === 0) return { feeInfo: null };

        const pendingFees = fees.filter(f => f.status.toLowerCase() !== 'paid');
        return {
            feeInfo: {
                totalDue: pendingFees.reduce((sum, f) => sum + (f.totalFee - (f.paidAmount || 0)), 0),
                nextDueDate: pendingFees[0]?.dueDate,
                status: pendingFees[0]?.status || 'Pending'
            }
        };
    } catch (err) {
        console.error('Error fetching student fee summary:', err);
        return { feeInfo: null };
    }
}


export async function updateFeeStatus(feeId: string | number, status: string, amountPaid?: number): Promise<boolean> {
    try {
        const result = await api.updateFeeStatus(feeId.toString(), status);
        return !!result;
    } catch (err) {
        console.error('Error updating fee status:', err);
        return false;
    }
}

// ============================================
// ANALYTICS
// ============================================

export async function fetchAnalyticsMetrics(schoolId: string, branchId?: string) {
    // Calls the stats endpoint directly rather than api.getDashboardStats():
    // that helper swallows every failure and returns zeros, which made the
    // Analytics cards render "0%" / empty charts with no error when the request
    // actually failed. Here a failure returns null so the screen shows its
    // error state instead.
    try {
        const params = new URLSearchParams();
        if (schoolId) params.append('schoolId', schoolId);
        if (branchId && branchId !== 'all') params.append('branchId', branchId);
        const qs = params.toString();
        const stats: any = await api.get<any>(`/dashboard/stats${qs ? `?${qs}` : ''}`);
        if (!stats || typeof stats !== 'object') return null;
        return {
            performance: Array.isArray(stats.performance) ? stats.performance : [],
            fees: stats.fees || { paid: 0, overdue: 0, unpaid: 0, total: 0 },
            workload: Array.isArray(stats.workload) ? stats.workload : [],
            attendance: Array.isArray(stats.attendance) ? stats.attendance : [],
            attendanceTrend: Array.isArray(stats.attendanceTrend) ? stats.attendanceTrend : [],
            // The backend sends `enrollmentData`; reading `enrollment` (as this
            // used to) always came back empty, so Enrollment Trends never drew.
            enrollment: Array.isArray(stats.enrollmentData) ? stats.enrollmentData : (Array.isArray(stats.enrollment) ? stats.enrollment : []),
        };
    } catch (err) {
        console.error('Error fetching analytics metrics:', err);
        return null;
    }
}
