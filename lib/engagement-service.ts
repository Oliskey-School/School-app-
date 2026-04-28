import { api } from './api';
import { sendSMS } from './notifications';

/**
 * Automatically triggers an SMS to parents if a student is marked 'Absent'.
 */
export async function triggerAbsenceAlert(studentId: string, schoolId: string) {
    if (!studentId) {
        console.warn('⚠️ [Engagement] triggerAbsenceAlert called with missing studentId');
        return;
    }

    try {
        // 1. Fetch parent phone number
        const { data: parent, error } = await api
            .from('parent_children')
            .select('parents(name, phone_number), students(name)')
            .eq('student_id', studentId)
            .single();

        if (error || !parent?.parents?.phone_number) return;

        const message = `Absence Alert: ${parent.students.name} was not marked present in school today. Please contact the admin for details.`;
        
        // 2. Send high-priority SMS (Termii/Twilio)
        await sendSMS(parent.parents.phone_number, message);
        
        console.log(`📱 [Engagement] SMS alert sent to ${parent.parents.name}`);
    } catch (err) {
        console.error('❌ Failed to trigger absence alert:', err);
    }
}

/**
 * Sends a bulk fee reminder to all parents with pending invoices.
 */
export async function sendBulkFeeReminders(schoolId: string) {
    const { data: invoices, error } = await api
        .from('student_fees')
        .select('*, parents(phone_number)')
        .eq('school_id', schoolId)
        .eq('status', 'pending');

    if (error) throw error;

    for (const inv of invoices) {
        if (inv.parents?.phone_number) {
            const msg = `Fee Reminder: A pending payment of ₦${inv.amount.toLocaleString()} for ${inv.title} is due soon. Pay via app or use USSD.`;
            await sendSMS(inv.parents.phone_number, msg);
        }
    }
}

