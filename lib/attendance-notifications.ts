/**
 * Attendance Notifications
 * Handles absence notifications to parents via SMS and email
 */

import { api } from './api';
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
        // 1. Get student details via direct API method
        const student = await api.getStudent(params.studentId.toString());

        if (!student) {
            console.error('Student not found:', params.studentId);
            return { success: false, error: 'Student not found' };
        }

        // 2. Get parent(s) for the student
        // Assuming we can get parents linked to this student
        const parents = await api.getParentsByStudentId(student.id);
        
        // Fallback or specific method if available
        let parentProfiles = parents;
        if (!parentProfiles) {
            // If specific method missing, use the generic users endpoint filtered by parent role if possible
            // Or better, if we have a classroom-based parent fetch
            if (student.class_id) {
                parentProfiles = await api.getParentsByClassId(student.class_id);
            }
        }

        if (!parentProfiles || parentProfiles.length === 0) {
            console.warn('No parents found for student:', student.id);
            return { success: true }; 
        }

        // 3. Send notifications to each parent
        const results = {
            emailsSent: 0,
            smsSent: 0,
            errors: [] as string[]
        };

        for (const parent of parentProfiles) {
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

            // Send SMS notification
            if (parent.phone && prefs.sms !== false) {
                try {
                    const smsMessage = `${student.name} was marked absent on ${new Date(params.date).toLocaleDateString()}. Please confirm or provide explanation via the school portal.`;

                    // Use the unified sendNotification method which replaces the edge function
                    await api.sendNotification({
                        userId: parent.id,
                        title: 'Student Absence',
                        body: smsMessage,
                        urgency: 'high',
                        channel: 'sms'
                    });
                    results.smsSent++;
                } catch (err) {
                    console.error('Error sending absence SMS:', err);
                    results.errors.push(`SMS to ${parent.phone} failed`);
                }
            }
        }

        console.log('✅ Attendance notifications sent:', results);
        return { success: true };
    } catch (err: any) {
        console.error('Error in sendAbsenceNotification:', err);
        return { success: false, error: err.message };
    }
};

