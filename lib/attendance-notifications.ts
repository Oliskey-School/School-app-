/**
 * Attendance Notifications
 * Handles absence notifications to parents via SMS and email
 */

import { supabase } from './supabase';
import { sendAbsenceNotificationEmail } from './emailService';

interface AbsenceNotificationParams {
    studentId: number;
    date: string;
    markedBy: string;
}

/**
 * Send absence notification to parent when student is marked absent
 */
export const sendAbsenceNotification = async (params: AbsenceNotificationParams): Promise<{ success: boolean; error?: string }> => {
    try {
        // Get student details
        const { data: student, error: studentError } = await supabase
            .from('students')
            .select('id, name, grade, section, user_id')
            .eq('id', params.studentId)
            .single();

        if (studentError || !student) {
            console.error('Error fetching student:', studentError);
            return { success: false, error: 'Student not found' };
        }

        // Get parent(s) for the student
        const { data: parentLinks, error: linksError } = await supabase
            .from('parent_children')
            .select('parent_id')
            .eq('student_id', student.id);

        if (linksError || !parentLinks || parentLinks.length === 0) {
            console.warn('No parents found for student:', student.id);
            return { success: true }; // Not an error, just no parents linked
        }

        const parentIds = parentLinks.map((link: any) => link.parent_id);

        // Get parent profiles with email and phone
        const { data: parents, error: parentsError } = await supabase
            .from('profiles')
            .select('id, name, email, phone, notification_preferences')
            .in('id', parentIds)
            .eq('role', 'parent');

        if (parentsError || !parents || parents.length === 0) {
            console.warn('Parent profiles not found');
            return { success: true };
        }

        // Send notifications to each parent
        const results = {
            emailsSent: 0,
            smsSent: 0,
            errors: [] as string[]
        };

        for (const parent of parents) {
            const prefs = parent.notification_preferences || {};

            // Send email notification
            if (parent.email && prefs.email !== false) {
                try {
                    await sendAbsenceNotificationEmail({
                        toEmail: parent.email,
                        parentName: parent.name || 'Parent',
                        studentName: student.name,
                        date: new Date(params.date).toLocaleDateString(),
                        grade: student.grade,
                        section: student.section
                    });
                    results.emailsSent++;
                } catch (err) {
                    console.error('Error sending absence email:', err);
                    results.errors.push(`Email to ${parent.email} failed`);
                }
            }

            // Send SMS notification (high priority)
            if (parent.phone && prefs.sms !== false) {
                try {
                    const smsMessage = `${student.name} was marked absent on ${new Date(params.date).toLocaleDateString()}. Please confirm or provide explanation via the school portal.`;

                    // Call edge function for SMS
                    const { data: authData } = await supabase.auth.getSession();
                    if (authData.session) {
                        await supabase.functions.invoke('send-notification', {
                            body: {
                                userId: parent.id,
                                title: 'Student Absence',
                                body: smsMessage,
                                urgency: 'high',
                                channel: 'sms'
                            }
                        });
                        results.smsSent++;
                    }
                } catch (err) {
                    console.error('Error sending absence SMS:', err);
                    results.errors.push(`SMS to ${parent.phone} failed`);
                }
            }
        }

        console.log('✅ Absence notifications sent:', results);
        return { success: true };
    } catch (err: any) {
        console.error('Error in sendAbsenceNotification:', err);
        return { success: false, error: err.message };
    }
};
