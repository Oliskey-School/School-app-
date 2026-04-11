import { api } from './api';

export interface TeacherAttendance {
    id: string;
    teacher_id: string;
    date: string;
    check_in: string;
    check_out?: string;
    status: string; // e.g. present
    approval_status: 'pending' | 'approved' | 'rejected';
    approved_by?: string;
    created_at: string;
    teacher?: {
        id: string;
        name: string;
        email: string;
        avatar_url?: string;
    };
}

/**
 * Submit teacher attendance (teacher marks themselves as present)
 */
export async function submitTeacherAttendance() {
    try {
        const data = await api.submitMyAttendance();
        
        // Create notification for all admins
        await createAdminNotification(
            'Teacher Attendance',
            `New attendance request from teacher`,
            data.id
        );

        return { success: true, data };
    } catch (error: any) {
        console.error('Error submitting teacher attendance:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get teacher attendance history
 */
export async function getTeacherAttendanceHistory(limit: number = 30) {
    try {
        const data = await api.getTeacherAttendanceHistory(limit);
        return { success: true, data };
    } catch (error: any) {
        console.error('Error fetching teacher attendance history:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get pending attendance requests (for admin)
 */
export async function getPendingAttendanceRequests(schoolId?: string) {
    try {
        if (!schoolId) {
            console.warn('getPendingAttendanceRequests called without schoolId');
        }

        const data = await api.getTeacherAttendance(schoolId || '', { status: 'pending' });
        return { success: true, data };
    } catch (error: any) {
        console.error('Error fetching pending attendance requests:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Approve teacher attendance (admin action)
 */
export async function approveAttendance(attendanceId: string, adminUserId: string) {
    try {
        const data = await api.approveTeacherAttendance(attendanceId, 'approved');

        // Create notification for teacher
        if (data && data.teacher && data.teacher.user_id) {
            await createNotification(
                data.teacher.user_id,
                'Attendance Approved',
                `Your attendance for ${data.date} has been approved`,
                'Attendance',
                attendanceId
            );
        }

        return { success: true, data };
    } catch (error: any) {
        console.error('Error approving attendance:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Reject teacher attendance (admin action)
 */
export async function rejectAttendance(attendanceId: string, adminUserId: string, reason?: string) {
    try {
        const data = await api.approveTeacherAttendance(attendanceId, 'rejected');

        // Create notification for teacher
        if (data && data.teacher && data.teacher.user_id) {
            const message = reason
                ? `Your attendance for ${data.date} was rejected. Reason: ${reason}`
                : `Your attendance for ${data.date} was rejected`;

            await createNotification(
                data.teacher.user_id,
                'Attendance Rejected',
                message,
                'Attendance',
                attendanceId
            );
        }

        return { success: true, data };
    } catch (error: any) {
        console.error('Error rejecting attendance:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Create notification for a specific user
 */
async function createNotification(
    userId: string,
    title: string,
    summary: string,
    category: string,
    relatedId?: string
) {
    try {
        await api.createNotification({
            user_id: userId,
            title,
            summary,
            category,
            related_id: relatedId,
            is_read: false,
        });
    } catch (error) {
        console.error('Error creating notification:', error);
    }
}

/**
 * Create notification for all admins
 */
async function createAdminNotification(title: string, summary: string, relatedId?: string) {
    try {
        // In the REST backend, the server SHOULD handle common notifications.
        // But for compatibility with the existing flow, we can trigger it if there is an endpoint.
        // Currently we don't have a specific "notify admins" endpoint, but we can use createNotification if we have admin IDs.
        // However, it's better if the backend handles this during `submitMyAttendance`.
        
        // For now, we'll just log and let the backend team know.
        console.log('Notification for admins should be created in the backend for:', title);
    } catch (error) {
        console.error('Error creating admin notifications:', error);
    }
}

/**
 * Get today's attendance status for a teacher
 */
export async function getTodayAttendanceStatus(teacherId: string) {
    const today = new Date().toISOString().split('T')[0];

    try {
        // Use general history and find today
        const history = await api.getTeacherAttendanceHistory(5);
        const todayRecord = history.find((h: any) => h.date === today);
        return { success: true, data: todayRecord || null };
    } catch (error: any) {
        console.error('Error fetching today attendance status:', error);
        return { success: false, error: error.message };
    }
}
