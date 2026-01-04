/**
 * Payment Notifications
 * Handles payment reminders and confirmations
 */

import { supabase } from './supabase';
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
        const { data: fee, error: feeError } = await supabase
            .from('fees')
            .select(`
                id,
                title,
                amount,
                due_date,
                paid_amount,
                status,
                students (
                    id,
                    name,
                    user_id
                ),
                student_id
            `)
            .eq('id', params.feeId)
            .single();

        if (feeError || !fee) {
            console.error('Error fetching fee:', feeError);
            return { success: false, error: 'Fee not found' };
        }

        // Skip if already paid
        if (fee.status === 'paid') {
            return { success: true };
        }

        const studentId = fee.student_id;

        // Get parent(s)
        const { data: parentLinks, error: linksError } = await supabase
            .from('parent_children')
            .select('parent_id')
            .eq('student_id', studentId);

        if (linksError || !parentLinks || parentLinks.length === 0) {
            console.warn('No parents found for student');
            return { success: true };
        }

        const parentIds = parentLinks.map((link: any) => link.parent_id);

        const { data: parents, error: parentsError } = await supabase
            .from('profiles')
            .select('id, name, email, phone, notification_preferences')
            .in('id', parentIds)
            .eq('role', 'parent');

        if (parentsError || !parents || parents.length === 0) {
            return { success: true };
        }

        const balance = fee.amount - (fee.paid_amount || 0);
        const dueDate = new Date(fee.due_date).toLocaleDateString();

        // Send reminders to parents
        for (const parent of parents) {
            const prefs = parent.notification_preferences || {};

            // Send SMS reminder (high priority)
            if (parent.phone && prefs.sms !== false) {
                try {
                    const smsMessage = `Payment Reminder: ${fee.title} - ₦${balance.toLocaleString()} due on ${dueDate}. Pay online via the school portal.`;

                    const { data: authData } = await supabase.auth.getSession();
                    if (authData.session) {
                        await supabase.functions.invoke('send-notification', {
                            body: {
                                userId: parent.id,
                                title: 'Payment Reminder',
                                body: smsMessage,
                                urgency: 'high',
                                channel: 'sms'
                            }
                        });
                    }
                } catch (err) {
                    console.error('Error sending payment reminder SMS:', err);
                }
            }
        }

        console.log('✅ Payment reminders sent for fee:', fee.id);
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
        const { data: transaction, error: txError } = await supabase
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

        // Get fee details
        const { data: fee, error: feeError } = await supabase
            .from('fees')
            .select('id, title, amount, paid_amount')
            .eq('id', transaction.fee_id)
            .single();

        if (feeError || !fee) {
            return { success: false, error: 'Fee not found' };
        }

        // Get student details
        const { data: student, error: studentError } = await supabase
            .from('students')
            .select('id, name')
            .eq('id', transaction.student_id)
            .single();

        if (studentError || !student) {
            return { success: false, error: 'Student not found' };
        }

        // Get parent(s)
        const { data: parentLinks } = await supabase
            .from('parent_children')
            .select('parent_id')
            .eq('student_id', student.id);

        if (!parentLinks || parentLinks.length === 0) {
            return { success: true };
        }

        const parentIds = parentLinks.map((link: any) => link.parent_id);

        const { data: parents } = await supabase
            .from('profiles')
            .select('id, name, email, notification_preferences')
            .in('id', parentIds)
            .eq('role', 'parent');

        if (!parents || parents.length === 0) {
            return { success: true };
        }

        const balance = fee.amount - (fee.paid_amount || 0);

        // Send confirmation emails
        for (const parent of parents) {
            const prefs = parent.notification_preferences || {};

            if (parent.email && prefs.email !== false) {
                try {
                    await sendPaymentConfirmationEmail({
                        toEmail: parent.email,
                        parentName: parent.name || 'Parent',
                        studentName: student.name,
                        feeTitle: fee.title,
                        amountPaid: transaction.amount,
                        transactionReference: transaction.reference,
                        paymentDate: new Date(transaction.created_at).toLocaleDateString(),
                        balance: balance
                    });
                } catch (err) {
                    console.error('Error sending payment confirmation email:', err);
                }
            }
        }

        console.log('✅ Payment confirmation sent for transaction:', transaction.id);
        return { success: true };
    } catch (err: any) {
        console.error('Error in sendPaymentConfirmation:', err);
        return { success: false, error: err.message };
    }
};

/**
 * Send fee assignment notification to parent
 */
export const sendFeeAssignmentNotification = async (feeId: number): Promise<{ success: boolean; error?: string }> => {
    try {
        // Get fee details
        const { data: fee, error: feeError } = await supabase
            .from('fees')
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

        // Get student
        const { data: student } = await supabase
            .from('students')
            .select('id, name')
            .eq('id', fee.student_id)
            .single();

        if (!student) {
            return { success: false, error: 'Student not found' };
        }

        // Get parents
        const { data: parentLinks } = await supabase
            .from('parent_children')
            .select('parent_id')
            .eq('student_id', student.id);

        if (!parentLinks || parentLinks.length === 0) {
            return { success: true };
        }

        const parentIds = parentLinks.map((link: any) => link.parent_id);

        const { data: parents } = await supabase
            .from('profiles')
            .select('id, name, email, notification_preferences')
            .in('id', parentIds)
            .eq('role', 'parent');

        if (!parents || parents.length === 0) {
            return { success: true };
        }

        // Send notifications
        for (const parent of parents) {
            const prefs = parent.notification_preferences || {};

            if (parent.email && prefs.email !== false) {
                try {
                    await sendFeeAssignmentEmail({
                        toEmail: parent.email,
                        parentName: parent.name || 'Parent',
                        studentName: student.name,
                        feeTitle: fee.title,
                        amount: fee.amount,
                        dueDate: new Date(fee.due_date).toLocaleDateString(),
                        description: fee.description
                    });
                } catch (err) {
                    console.error('Error sending fee assignment email:', err);
                }
            }
        }

        console.log('✅ Fee assignment notification sent for fee:', fee.id);
        return { success: true };
    } catch (err: any) {
        console.error('Error in sendFeeAssignmentNotification:', err);
        return { success: false, error: err.message };
    }
};
