import { supabase } from './supabase';

export interface TeacherAttendance {
    id: number;
    teacher_id: number;
    date: string;
    check_in_time: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    approved_by?: number;
    approved_at?: string;
    rejection_reason?: string;
    created_at: string;
    updated_at: string;
}

/**
 * Submit teacher attendance (teacher marks themselves as present)
 */
export async function submitTeacherAttendance(teacherId: number, date: string = new Date().toISOString().split('T')[0]) {
    try {
        const { data, error } = await supabase
            .from('teacher_attendance')
            .insert({
                teacher_id: teacherId,
                date,
                status: 'Pending',
            })
            .select()
            .single();

        if (error) throw error;

        // Create notification for all admins
        await createAdminNotification(
            'Teacher Attendance',
            `New attendance request from teacher ID ${teacherId}`,
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
export async function getTeacherAttendanceHistory(teacherId: number, limit: number = 30) {
    try {
        const { data, error } = await supabase
            .from('teacher_attendance')
            .select('*')
            .eq('teacher_id', teacherId)
            .order('date', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        console.error('Error fetching teacher attendance history:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get pending attendance requests (for admin)
 */
export async function getPendingAttendanceRequests() {
    try {
        const { data, error } = await supabase
            .from('teacher_attendance')
            .select(`
        *,
        teachers (
          id,
          name,
          email,
          avatar_url
        )
      `)
            .eq('status', 'Pending')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        console.error('Error fetching pending attendance requests:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Approve teacher attendance (admin action)
 */
// Helper to resolve a valid Admin ID if a mock string ID is passed
async function resolveAdminId(userId: string | number): Promise<number> {
    if (typeof userId === 'number') return userId;
    if (!isNaN(Number(userId))) return Number(userId);

    // If string ID (mock), fetch the first real admin from DB
    console.warn(`Resolving mock Admin ID '${userId}' to a real database ID...`);
    const { data } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'Admin')
        .limit(1)
        .maybeSingle();

    return data?.id || 0; // Return Found ID or 0 (which might still fail constraint if no users, but better than string syntax error)
}

/**
 * Approve teacher attendance (admin action)
 */
export async function approveAttendance(attendanceId: number, adminUserId: number | string) {
    try {
        const resolvedAdminId = await resolveAdminId(adminUserId);

        const { data, error } = await supabase
            .from('teacher_attendance')
            .update({
                status: 'Approved',
                approved_by: resolvedAdminId,
                approved_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', attendanceId)
            .select(`
        *,
        teachers (
          id,
          user_id,
          name
        )
      `)
            .single();

        if (error) throw error;

        // Create notification for teacher
        if (data.teachers && (data.teachers as any).user_id) {
            await createNotification(
                (data.teachers as any).user_id,
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
export async function rejectAttendance(attendanceId: number, adminUserId: number | string, reason?: string) {
    try {
        const resolvedAdminId = await resolveAdminId(adminUserId);

        const { data, error } = await supabase
            .from('teacher_attendance')
            .update({
                status: 'Rejected',
                approved_by: resolvedAdminId,
                approved_at: new Date().toISOString(),
                rejection_reason: reason,
                updated_at: new Date().toISOString(),
            })
            .eq('id', attendanceId)
            .select(`
        *,
        teachers (
          id,
          user_id,
          name
        )
      `)
            .single();

        if (error) throw error;

        // Create notification for teacher
        if (data.teachers && (data.teachers as any).user_id) {
            const message = reason
                ? `Your attendance for ${data.date} was rejected. Reason: ${reason}`
                : `Your attendance for ${data.date} was rejected`;

            await createNotification(
                (data.teachers as any).user_id,
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
    userId: number,
    title: string,
    summary: string,
    category: string,
    relatedId?: number
) {
    try {
        const { error } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                title,
                summary,
                category,
                related_id: relatedId,
                is_read: false,
            });

        if (error) throw error;
    } catch (error) {
        console.error('Error creating notification:', error);
    }
}

/**
 * Create notification for all admins
 */
async function createAdminNotification(title: string, summary: string, relatedId?: number) {
    try {
        // Get all admin users
        const { data: adminUsers, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'Admin');

        if (userError) throw userError;

        // Create notifications for each admin
        const notifications = adminUsers?.map(admin => ({
            user_id: admin.id,
            title,
            summary,
            category: 'Attendance',
            related_id: relatedId,
            is_read: false,
        })) || [];

        if (notifications.length > 0) {
            const { error } = await supabase
                .from('notifications')
                .insert(notifications);

            if (error) throw error;
        }
    } catch (error) {
        console.error('Error creating admin notifications:', error);
    }
}

/**
 * Get today's attendance status for a teacher
 */
export async function getTodayAttendanceStatus(teacherId: number) {
    const today = new Date().toISOString().split('T')[0];

    try {
        const { data, error } = await supabase
            .from('teacher_attendance')
            .select('*')
            .eq('teacher_id', teacherId)
            .eq('date', today)
            .maybeSingle();

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        console.error('Error fetching today attendance status:', error);
        return { success: false, error: error.message };
    }
}
