/**
 * Payment Plans Library
 * Handles installment-based fee payments
 */

import { supabase } from './supabase';

export interface PaymentPlan {
    id: number;
    feeId: string;
    studentId: string;
    totalAmount: number;
    installmentCount: number;
    frequency: 'weekly' | 'monthly' | 'termly' | 'custom';
    status: 'active' | 'completed' | 'cancelled';
    createdAt: string;
}

export interface Installment {
    id: number;
    paymentPlanId: number;
    installmentNumber: number;
    amount: number;
    dueDate: string;
    paidAmount: number;
    status: 'pending' | 'paid' | 'partial' | 'overdue';
    paidAt?: string;
    transactionId?: number;
}

export interface CreatePaymentPlanParams {
    feeId: string;
    studentId: string;
    totalAmount: number;
    installmentCount: number;
    frequency: 'weekly' | 'monthly' | 'termly' | 'custom';
    startDate?: Date;
    customDueDates?: Date[]; // For 'custom' frequency
}

/**
 * Create a payment plan with installments
 */
export async function createPaymentPlan(params: CreatePaymentPlanParams): Promise<PaymentPlan | null> {
    try {
        const { feeId, studentId, totalAmount, installmentCount, frequency, startDate, customDueDates } = params;

        // 1. Create payment plan
        const { data: plan, error: planError } = await supabase
            .from('payment_plans')
            .insert([{
                fee_id: feeId,
                student_id: studentId,
                total_amount: totalAmount,
                installment_count: installmentCount,
                frequency: frequency,
                status: 'active'
            }])
            .select()
            .single();

        if (planError || !plan) {
            console.error('Error creating payment plan:', planError);
            return null;
        }

        // 2. Generate installments
        const installments = generateInstallments(
            plan.id,
            totalAmount,
            installmentCount,
            frequency,
            startDate || new Date(),
            customDueDates
        );

        // 3. Insert installments
        const { error: installmentsError } = await supabase
            .from('installments')
            .insert(installments);

        if (installmentsError) {
            console.error('Error creating installments:', installmentsError);
            // Rollback plan creation
            await supabase.from('payment_plans').delete().eq('id', plan.id);
            return null;
        }

        // 4. Update fee to indicate it has a payment plan
        const { error: feeUpdateError } = await supabase
            .from('student_fees')
            .update({
                has_payment_plan: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', feeId);

        if (feeUpdateError) {
            console.error('Error updating fee payment plan status:', feeUpdateError);
            // Don't rollback - the plan is still valid even if we can't update this flag
        }

        return normalizePaymentPlan(plan);
    } catch (error) {
        console.error('createPaymentPlan error:', error);
        return null;
    }
}


/**
 * Generate installment records
 */
function generateInstallments(
    planId: number,
    totalAmount: number,
    count: number,
    frequency: string,
    startDate: Date,
    customDueDates?: Date[]
): any[] {
    const installmentAmount = Math.round((totalAmount / count) * 100) / 100; // Round to 2 decimals
    const remainder = totalAmount - (installmentAmount * count);
    const installments = [];

    for (let i = 0; i < count; i++) {
        let dueDate: Date;

        if (customDueDates && customDueDates[i]) {
            dueDate = customDueDates[i];
        } else {
            dueDate = calculateDueDate(startDate, frequency, i);
        }

        // Add remainder to last installment
        const amount = i === count - 1 ? installmentAmount + remainder : installmentAmount;

        installments.push({
            payment_plan_id: planId,
            installment_number: i + 1,
            amount: amount,
            due_date: dueDate.toISOString().split('T')[0], // YYYY-MM-DD
            paid_amount: 0,
            status: 'pending'
        });
    }

    return installments;
}

/**
 * Calculate due date based on frequency
 */
function calculateDueDate(startDate: Date, frequency: string, installmentIndex: number): Date {
    const date = new Date(startDate);

    switch (frequency) {
        case 'weekly':
            date.setDate(date.getDate() + (installmentIndex * 7));
            break;
        case 'monthly':
            date.setMonth(date.getMonth() + installmentIndex);
            break;
        case 'termly':
            // Assuming 3 months per term
            date.setMonth(date.getMonth() + (installmentIndex * 3));
            break;
        default:
            date.setMonth(date.getMonth() + installmentIndex);
    }

    return date;
}

/**
 * Get payment plan with installments
 */
export async function getPaymentPlan(feeId: string): Promise<{ plan: PaymentPlan; installments: Installment[] } | null> {
    try {
        // Get plan
        const { data: plan, error: planError } = await supabase
            .from('payment_plans')
            .select('*')
            .eq('fee_id', feeId)
            .single();

        if (planError || !plan) {
            return null;
        }

        // Get installments
        const { data: installments, error: installmentsError } = await supabase
            .from('installments')
            .select('*')
            .eq('payment_plan_id', plan.id)
            .order('installment_number');

        if (installmentsError) {
            console.error('Error fetching installments:', installmentsError);
            return null;
        }

        return {
            plan: normalizePaymentPlan(plan),
            installments: (installments || []).map(normalizeInstallment)
        };
    } catch (error) {
        console.error('getPaymentPlan error:', error);
        return null;
    }
}

/**
 * Check if fee has payment plan
 */
export async function hasPaymentPlan(feeId: string): Promise<boolean> {
    const { data } = await supabase
        .from('payment_plans')
        .select('id')
        .eq('fee_id', feeId)
        .single();

    return !!data;
}

/**
 * Get upcoming installments (due within X days)
 */
export async function getUpcomingInstallments(studentId: string, daysAhead: number = 7): Promise<Installment[]> {
    try {
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + daysAhead);

        const { data, error } = await supabase
            .from('installments')
            .select(`
                *,
                payment_plans!inner(student_id)
            `)
            .eq('payment_plans.student_id', studentId)
            .in('status', ['pending', 'partial'])
            .gte('due_date', today.toISOString().split('T')[0])
            .lte('due_date', futureDate.toISOString().split('T')[0])
            .order('due_date');

        if (error) {
            console.error('Error fetching upcoming installments:', error);
            return [];
        }

        return (data || []).map(normalizeInstallment);
    } catch (error) {
        console.error('getUpcomingInstallments error:', error);
        return [];
    }
}

/**
 * Cancel payment plan
 */
export async function cancelPaymentPlan(planId: number): Promise<boolean> {
    const { error } = await supabase
        .from('payment_plans')
        .update({ status: 'cancelled' })
        .eq('id', planId);

    return !error;
}

/**
 * Process payment for an installment
 */
export async function processInstallmentPayment(
    installmentId: number,
    amount: number,
    transactionId: number
): Promise<boolean> {
    try {
        // Get current installment
        const { data: installment } = await supabase
            .from('installments')
            .select('paid_amount, amount')
            .eq('id', installmentId)
            .single();

        if (!installment) return false;

        const newPaidAmount = (installment.paid_amount || 0) + amount;

        // Update installment
        const { error } = await supabase
            .from('installments')
            .update({
                paid_amount: newPaidAmount,
                transaction_id: transactionId,
                // Status will be updated by trigger
            })
            .eq('id', installmentId);

        if (error) {
            console.error('Error updating installment:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('processInstallmentPayment error:', error);
        return false;
    }
}


// Normalization functions
function normalizePaymentPlan(data: any): PaymentPlan {
    return {
        id: data.id,
        feeId: data.fee_id,
        studentId: data.student_id,
        totalAmount: parseFloat(data.total_amount),
        installmentCount: data.installment_count,
        frequency: data.frequency,
        status: data.status,
        createdAt: data.created_at
    };
}

function normalizeInstallment(data: any): Installment {
    return {
        id: data.id,
        paymentPlanId: data.payment_plan_id,
        installmentNumber: data.installment_number,
        amount: parseFloat(data.amount),
        dueDate: data.due_date,
        paidAmount: parseFloat(data.paid_amount || 0),
        status: data.status,
        paidAt: data.paid_at,
        transactionId: data.transaction_id
    };
}
