/**
 * Payment Notifications
 * Handles payment reminders and confirmations
 */

import { api } from './api';

interface PaymentReminderParams {
    feeId: number;
    daysBeforeDue: number;
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
 * Send payment confirmation after successful payment.
 * The backend looks up the payment by reference, resolves the student and
 * linked parents, and sends the email itself (SMTP creds never leave the server).
 */
export const sendPaymentConfirmation = async (params: { reference: string }): Promise<{ success: boolean; error?: string }> => {
    try {
        await api.notifyPaymentConfirmation(params.reference);
        return { success: true };
    } catch (err: any) {
        console.error('Error triggering payment confirmation notification:', err);
        return { success: false, error: err.message };
    }
};

/**
 * Send fee assignment notification to parent.
 * The backend looks up the fee, resolves the student and linked parents,
 * and sends the email itself (SMTP creds never leave the server).
 */
export const sendFeeAssignmentNotification = async (feeId: string): Promise<{ success: boolean; error?: string }> => {
    try {
        await api.notifyFeeAssignment(feeId);
        return { success: true };
    } catch (err: any) {
        console.error('Error triggering fee assignment notification:', err);
        return { success: false, error: err.message };
    }
};

