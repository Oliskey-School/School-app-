
import { supabase } from './supabase';
import { Fee, Transaction, PaymentHistoryItem } from '../types';

// ===================================
// FEES
// ===================================

// MOCK DATA STORE
/**
 * Fetch fees for a specific student
 */
export async function fetchStudentFees(studentId: string | number, schoolId?: string): Promise<Fee[]> {
    let query = supabase
        .from('student_fees')
        .select('*')
        .eq('student_id', studentId);

    if (schoolId) query = query.eq('school_id', schoolId);

    const { data, error } = await query.order('due_date', { ascending: true });

    if (error) {
        console.error('Error fetching fees:', error);
        return [];
    }

    return data.map(normalizeFee);
}

/**
 * Fetch all fees (for Admin)
 */
export async function fetchAllFees(schoolId?: string): Promise<Fee[]> {
    let query = supabase
        .from('student_fees')
        .select('*');

    if (schoolId) query = query.eq('school_id', schoolId);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching all fees:', error);
        return [];
    }
    return data.map(normalizeFee);
}

/**
 * Assign a new fee to a student
 */
export async function assignFee(fee: Omit<Fee, 'id' | 'paidAmount' | 'status'>, schoolId: string, branchId?: string | null): Promise<Fee> {
    const { data, error } = await supabase
        .from('student_fees')
        .insert([{
            student_id: fee.studentId,
            school_id: schoolId,
            branch_id: branchId,
            title: fee.title,
            description: fee.description,
            amount: fee.amount,
            due_date: fee.dueDate,
            status: 'pending',
            paid_amount: 0,
            curriculum_type: fee.curriculumType || 'General'
        }])
        .select()
        .single();

    if (error) {
        console.error('Error assigning fee:', error);
        throw error;
    }
    return normalizeFee(data);
}


// ===================================
// TRANSACTIONS
// ===================================

/**
 * Initialize a pending transaction before payment
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
    // Get current user (payer)
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
        .from('transactions')
        .insert([{
            fee_id: feeId,
            student_id: studentId,
            school_id: schoolId,
            branch_id: branchId,
            payer_id: user?.id,
            amount,
            reference,
            provider,
            status: 'pending'
        }]);

    if (error) {
        console.error('Error initializing transaction:', error);
    }
}

/**
 * Verify Transaction (called after successful payment gateway response)
 * This updates the transaction status AND the fee status
 */
export async function verifyTransaction(reference: string): Promise<{ success: boolean; message: string }> {
    try {
        // 1. Mark transaction as success (in a real app, verify with Paystack API first via Edge Function)
        // For MVP, we trust the client-side success callback but we should ideally verify on server.

        const { data: transaction, error: txError } = await supabase
            .from('transactions')
            .update({ status: 'success' })
            .eq('reference', reference)
            .select()
            .single();

        if (txError || !transaction) throw new Error('Transaction not found or update failed');

        // 2. Update the linked Fee
        const feeId = transaction.fee_id;
        if (feeId) {
            // Fetch current fee state
            const { data: fee } = await supabase.from('student_fees').select('amount, paid_amount').eq('id', feeId).single();

            if (fee) {
                const newPaidAmount = (fee.paid_amount || 0) + transaction.amount;
                const newStatus = newPaidAmount >= fee.amount ? 'paid' : 'partial';

                await supabase
                    .from('student_fees')
                    .update({
                        paid_amount: newPaidAmount,
                        status: newStatus,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', feeId);
            }
        }

        return { success: true, message: 'Payment verified successfully' };

    } catch (err: any) {
        console.error('Payment verification error:', err);
        return { success: false, message: err.message };
    }
}

/**
 * Fetch Payment History
 */
export async function fetchPaymentHistory(studentId?: string | number, schoolId?: string): Promise<Transaction[]> {
    let query = supabase
        .from('transactions')
        .select('*');

    if (schoolId) query = query.eq('school_id', schoolId);
    if (studentId) {
        query = query.eq('student_id', studentId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return [];
    return data.map(normalizeTransaction);
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
        payerId: data.payer_id,
        amount: data.amount,
        reference: data.reference,
        provider: data.provider,
        status: data.status,
        date: data.created_at
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
