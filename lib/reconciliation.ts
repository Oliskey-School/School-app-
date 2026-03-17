/**
 * Financial Reconciliation Service
 * Automates daily audits, chargeback detection, and department split monitoring.
 */

import { supabase } from './supabase';
import { Transaction, Fee } from '../types';

export interface AuditReport {
    date: string;
    totalExpected: number;
    totalCollected: number;
    variance: number;
    pendingCount: number;
    reconciledCount: number;
    flaggedTransactions: string[]; // IDs of transactions with issues
}

/**
 * Generates a daily audit report for a school/branch.
 */
export async function generateDailyAuditReport(
    schoolId: string, 
    date: string = new Date().toISOString().split('T')[0]
): Promise<AuditReport | null> {
    try {
        // Fetch all transactions for the day
        const { data: transactions, error: txError } = await supabase
            .from('transactions')
            .select('*')
            .eq('school_id', schoolId)
            .gte('created_at', `${date}T00:00:00Z`)
            .lte('created_at', `${date}T23:59:59Z`);

        if (txError) throw txError;

        // Fetch all fees due or updated today
        const { data: fees, error: feeError } = await supabase
            .from('student_fees')
            .select('*')
            .eq('school_id', schoolId);

        if (feeError) throw feeError;

        const totalCollected = transactions?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
        const reconciledCount = transactions?.filter(tx => tx.status === 'success').length || 0;
        
        // Simple variance calculation
        // In a real scenario, this would be more complex (fees due today vs paid today)
        const totalExpected = fees?.filter(f => f.status === 'pending').reduce((sum, f) => sum + (f.amount || 0), 0) || 0;

        return {
            date,
            totalExpected,
            totalCollected,
            variance: totalExpected - totalCollected,
            pendingCount: transactions?.filter(tx => tx.status === 'pending').length || 0,
            reconciledCount,
            flaggedTransactions: transactions?.filter(tx => tx.status === 'failed').map(tx => tx.id) || []
        };
    } catch (error) {
        console.error('❌ Audit generation failed:', error);
        return null;
    }
}

/**
 * Monitors and flags potential chargebacks or payment reversals.
 */
export async function detectChargebacks(schoolId: string): Promise<string[]> {
    // In a production environment, this would call Paystack/Flutterwave APIs 
    // to check for 'reversed' or 'refunded' statuses that haven't been updated locally.
    
    const { data: reversals, error } = await supabase
        .from('transactions')
        .select('id, reference')
        .eq('school_id', schoolId)
        .eq('status', 'reversed'); // Assuming 'reversed' is a valid status

    if (error) return [];
    return reversals.map(r => r.id);
}

/**
 * Calculates department splits for a list of transactions.
 * Useful for routing funds to Tuition, PTA, Sports, etc.
 */
export function calculateSplits(amount: number, config: Record<string, number>): Record<string, number> {
    const splits: Record<string, number> = {};
    let totalAssigned = 0;

    for (const [dept, percentage] of Object.entries(config)) {
        const deptAmount = Math.floor(amount * (percentage / 100));
        splits[dept] = deptAmount;
        totalAssigned += deptAmount;
    }

    // Assign remainder to the first department to avoid rounding loss
    const firstDept = Object.keys(config)[0];
    if (firstDept) {
        splits[firstDept] += (amount - totalAssigned);
    }

    return splits;
}

/**
 * Generates a USSD reference string formatted for Moniepoint/Standard banks.
 */
export function generateUSSDReference(studentCode: string): string {
    // Example: *5573*1*STUDENT_CODE#
    return `*5573*1*${studentCode}#`;
}
