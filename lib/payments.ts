
import { api } from './api';
import { Fee, Transaction, PaymentHistoryItem } from '../types';

// ===================================
// FEES
// ===================================

// MOCK DATA STORE
/**
 * Fetch fees for a specific student
 */
export async function fetchStudentFees(studentId: string | number, schoolId?: string, branchId?: string): Promise<Fee[]> {
    const data = await api.getFees({ studentId, schoolId, branchId });
    return data.map(normalizeFee);
}

/**
 * Fetch all fees (for Admin)
 */
export async function fetchAllFees(schoolId?: string, branchId?: string): Promise<Fee[]> {
    const data = await api.getFees({ schoolId, branchId });
    return data.map(normalizeFee);
}

/**
 * Assign a new fee to a student
 */
export async function assignFee(fee: Omit<Fee, 'id' | 'paidAmount' | 'status'>, schoolId: string, branchId?: string | null): Promise<Fee> {
    const data = await api.createFee({
        student_id: fee.studentId,
        school_id: schoolId,
        branch_id: branchId,
        title: fee.title,
        description: fee.description,
        amount: fee.amount,
        due_date: fee.dueDate,
        curriculum_type: fee.curriculumType || 'General'
    });
    return normalizeFee(data);
}

/**
 * Delete a student fee
 */
export async function deleteFee(feeId: string | number): Promise<void> {
    await api.deleteFee(String(feeId));
}

/**
 * Record a manual student payment for a fee
 */
export async function recordStudentPayment(
    feeId: string | number,
    studentId: string | number,
    amount: number,
    reference: string,
    schoolId: string,
    branchId?: string | null,
    method: string = 'Cash'
): Promise<void> {
    await api.recordPayment({
        fee_id: feeId,
        student_id: studentId,
        school_id: schoolId,
        branch_id: branchId,
        amount,
        reference,
        payment_method: method,
        purpose: 'fee_payment'
    });
}


// ===================================
// TRANSACTIONS
// ===================================

/**
 * Initialize a pending transaction before payment
 * In the new architecture, this is synonymous with recording a pending payment
 */
export async function initializeTransaction(
    feeId: string | number,
    studentId: string | number,
    amount: number,
    reference: string,
    schoolId: string,
    branchId?: string | null,
    provider: 'Paystack' | 'Flutterwave' | 'Mobile Money' = 'Paystack'
): Promise<void> {
    await api.recordPayment({
        fee_id: feeId,
        student_id: studentId,
        school_id: schoolId,
        branch_id: branchId,
        amount,
        reference,
        payment_method: provider,
        status: 'Pending',
        purpose: 'fee_payment'
    });
}

/**
 * Verify Transaction (called after successful payment gateway response)
 */
export async function verifyTransaction(reference: string): Promise<{ success: boolean; message: string }> {
    try {
        await api.put(`/fees/payments/verify/${reference}`, {});
        return { success: true, message: 'Payment verified successfully' };
    } catch (err: any) {
        console.error('Payment verification error:', err);
        return { success: false, message: err.message };
    }
}

/**
 * Fetch Payment History
 */
export async function fetchPaymentHistory(studentId?: string | number, schoolId?: string, branchId?: string): Promise<Transaction[]> {
    const data = await api.getPaymentHistory({ studentId, schoolId, branchId });
    return data.map(normalizeTransaction);
}


/**
 * Delete a transaction and revert its effect on the fee
 */
export async function deleteTransaction(transactionId: string | number): Promise<void> {
    await api.delete(`/fees/payments/${transactionId}`);
}


// Helpers
function normalizeFee(data: any): Fee {
    return {
        id: data.id,
        studentId: data.student_id,
        title: data.title,
        description: data.description,
        amount: data.amount,
        paidAmount: data.paid_amount,
        dueDate: data.due_date,
        status: mapStatus(data.status),
        type: data.type,
        curriculumType: data.curriculum_type,
        createdAt: data.created_at,
        hasPaymentPlan: data.has_payment_plan || false
    };
}

function normalizeTransaction(data: any): Transaction {
    return {
        id: data.id,
        feeId: data.fee_id,
        studentId: data.student_id,
        amount: data.amount,
        reference: data.reference,
        provider: data.payment_method,
        status: data.status,
        date: data.payment_date
    };
}

function mapStatus(status: string): any {
    // Simple mapper to ensure capitalizations match types
    const map: Record<string, string> = {
        'pending': 'Pending',
        'partial': 'Partial',
        'paid': 'Paid',
        'overdue': 'Overdue',
        'success': 'Success',
        'failed': 'Failed'
    };
    return map[status.toLowerCase()] || status;
}

