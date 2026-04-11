/**
 * Payment Notifications
 * Handles payment reminders and confirmations
 */

import { api } from './api';
import { sendPaymentConfirmationEmail, sendFeeAssignmentEmail } from './emailService';

interface PaymentReminderParams {
    feeId: number;
    daysBeforeDue: number;
}

interface PaymentConfirmationParams {
    transactionId: number;
}

/**
 * Send payment reminder SMS to parent when fee is due soon
 */
export const sendPaymentReminder = async (params: PaymentReminderParams): Promise<{ success: boolean; error?: string }> => {
    try {
        // Get fee details
        const { data: fee, error: feeError } = await api
            .from('student_fees')
            .select(`
                id,
                title,
                amount,
                due_date,
                paid_amount,
                status,
                student_id
            `)
            .eq('id', params.feeId)
            .single();

        if (feeError || !fee) {
            console.error('Error fetching fee:', feeError);
            return { success: false, error: 'Fee not found' };
        }

        const feeData = fee as any;

        // Skip if already paid
        if (feeData.status === 'paid') {
            return { success: true };
        }

        const studentId = feeData.student_id;

        // Get parent(s)
        const { data: parentLinks, error: linksError } = await api
            .from('parent_children')
            .select('parent_id')
            .eq('student_id', studentId);

        if (linksError || !parentLinks || (parentLinks as any[]).length === 0) {
            console.warn('No parents found for student');
            return { success: true };
        }

        const parentIds = (parentLinks as any[]).map((link: any) => link.parent_id);

        const { data: parents, error: parentsError } = await api
            .from('profiles')
            .select('id, name, email, phone, notification_preferences')
            .in('id', parentIds)
            .eq('role', 'parent');

        if (parentsError || !parents || (parents as any[]).length === 0) {
            return { success: true };
        }

        const balance = feeData.amount - (feeData.paid_amount || 0);
        const dueDate = new Date(feeData.due_date).toLocaleDateString();

        // Send reminders to parents
        for (const parent of (parents as any[])) {
            const prefs = parent.notification_preferences || {};

            // Send SMS reminder (high priority)
            if (parent.phone && prefs.sms !== false) {
                try {
                    const smsMessage = `Payment Reminder: ${feeData.title} - ₦${balance.toLocaleString()} due on ${dueDate}. Pay online via the school portal.`;

                    // In our backend, we use api.sendNotification or specific functions
                    await api.functions.invoke('send-notification', {
                        body: {
                            userId: parent.id,
                            title: 'Payment Reminder',
                            body: smsMessage,
                            urgency: 'high',
                            channel: 'sms'
                        }
                    });
                } catch (err) {
                    console.error('Error sending payment reminder SMS:', err);
                }
            }
        }

        console.log('✅ Payment reminders sent for fee:', feeData.id);
        return { success: true };
    } catch (err: any) {
        console.error('Error in sendPaymentReminder:', err);
        return { success: false, error: err.message };
    }
};

/**
 * Send payment confirmation after successful payment
 */
export const sendPaymentConfirmation = async (params: PaymentConfirmationParams): Promise<{ success: boolean; error?: string }> => {
    try {
        // Get transaction details
        const { data: transaction, error: txError } = await api
            .from('transactions')
            .select(`
                id,
                reference,
                amount,
                created_at,
                fee_id,
                student_id
            `)
            .eq('id', params.transactionId)
            .single();

        if (txError || !transaction) {
            return { success: false, error: 'Transaction not found' };
        }

        const txData = transaction as any;

        // Get fee details
        const { data: fee, error: feeError } = await api
            .from('student_fees')
            .select('id, title, amount, paid_amount')
            .eq('id', txData.fee_id)
            .single();

        if (feeError || !fee) {
            return { success: false, error: 'Fee not found' };
        }

        const feeData = fee as any;

        // Get student details
        const { data: student, error: studentError } = await api
            .from('students')
            .select('id, name')
            .eq('id', txData.student_id)
            .single();

        if (studentError || !student) {
            return { success: false, error: 'Student not found' };
        }

        const studentData = student as any;

        // Get parent(s)
        const { data: parentLinks } = await api
            .from('parent_children')
            .select('parent_id')
            .eq('student_id', studentData.id);

        if (!parentLinks || (parentLinks as any[]).length === 0) {
            return { success: true };
        }

        const parentIds = (parentLinks as any[]).map((link: any) => link.parent_id);

        const { data: parents } = await api
            .from('profiles')
            .select('id, name, email, notification_preferences')
            .in('id', parentIds)
            .eq('role', 'parent');

        if (!parents || (parents as any[]).length === 0) {
            return { success: true };
        }

        const balance = feeData.amount - (feeData.paid_amount || 0);

        // Send confirmation emails
        for (const parent of (parents as any[])) {
            const prefs = parent.notification_preferences || {};

            if (parent.email && prefs.email !== false) {
                try {
                    await sendPaymentConfirmationEmail({
                        toEmail: parent.email,
                        parentName: parent.name || 'Parent',
                        studentName: studentData.name,
                        feeTitle: feeData.title,
                        amountPaid: txData.amount,
                        transactionReference: txData.reference,
                        paymentDate: new Date(txData.created_at).toLocaleDateString(),
                        balance: balance
                    });
                } catch (err) {
                    console.error('Error sending payment confirmation email:', err);
                }
            }
        }

        console.log('✅ Payment confirmation sent for transaction:', txData.id);
        return { success: true };
    } catch (err: any) {
        console.error('Error in sendPaymentConfirmation:', err);
        return { success: false, error: err.message };
    }
};

/**
 * Send fee assignment notification to parent
 */
export const sendFeeAssignmentNotification = async (feeId: string): Promise<{ success: boolean; error?: string }> => {
    try {
        // Get fee details
        const { data: fee, error: feeError } = await api
            .from('student_fees')
            .select(`
                id,
                title,
                amount,
                due_date,
                description,
                student_id
            `)
            .eq('id', feeId)
            .single();

        if (feeError || !fee) {
            return { success: false, error: 'Fee not found' };
        }

        const feeData = fee as any;

        // Get student
        const { data: student } = await api
            .from('students')
            .select('id, name')
            .eq('id', feeData.student_id)
            .single();

        if (!student) {
            return { success: false, error: 'Student not found' };
        }

        const studentData = student as any;

        // Get parents
        const { data: parentLinks } = await api
            .from('parent_children')
            .select('parent_id')
            .eq('student_id', studentData.id);

        if (!parentLinks || (parentLinks as any[]).length === 0) {
            return { success: true };
        }

        const parentIds = (parentLinks as any[]).map((link: any) => link.parent_id);

        const { data: parents } = await api
            .from('profiles')
            .select('id, name, email, notification_preferences')
            .in('id', parentIds)
            .eq('role', 'parent');

        if (!parents || (parents as any[]).length === 0) {
            return { success: true };
        }

        // Send notifications
        for (const parent of (parents as any[])) {
            const prefs = parent.notification_preferences || {};

            if (parent.email && prefs.email !== false) {
                try {
                    await sendFeeAssignmentEmail({
                        toEmail: parent.email,
                        parentName: parent.name || 'Parent',
                        studentName: studentData.name,
                        feeTitle: feeData.title,
                        amount: feeData.amount,
                        dueDate: new Date(feeData.due_date).toLocaleDateString(),
                        description: feeData.description
                    });
                } catch (err) {
                    console.error('Error sending fee assignment email:', err);
                }
            }
        }

        console.log('✅ Fee assignment notification sent for fee:', feeData.id);
        return { success: true };
    } catch (err: any) {
        console.error('Error in sendFeeAssignmentNotification:', err);
        return { success: false, error: err.message };
    }
};

