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
    try {
        const stats = await api.getDashboardStats(schoolId, branchId);
        
        // Transform the backend stats into the format expected by the UI
        return {
            performance: stats.performance || [],
            fees: stats.fees || { paid: 0, overdue: 0, unpaid: 0, total: 0 },
            workload: stats.workload || [],
            attendance: stats.attendance || [],
            enrollment: stats.enrollment || []
        };
    } catch (err) {
        console.error('Error fetching analytics metrics:', err);
        return null;
    }
}
