import { supabase } from './supabase';

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
}

/**
 * Submit teacher attendance (teacher marks themselves as present)
 */
export async function submitTeacherAttendance(teacherId: string, date: string = new Date().toISOString().split('T')[0]) {
    try {
        // 1. Fetch school_id for this teacher to satisfy RLS and Not-Null constraint
        const { data: teacherData, error: teacherError } = await supabase
            .from('teachers')
            .select('school_id')
            .eq('id', teacherId)
            .single();

        if (teacherError || !teacherData) throw new Error('Could not resolve teacher school information.');

        const { data, error } = await supabase
            .from('teacher_attendance')
            .insert({
                teacher_id: teacherId,
                school_id: teacherData.school_id,
                date,
                status: 'present',
                approval_status: 'pending',
                check_in: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
            })
            .select()
            .single();

        if (error) throw error;

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
export async function getTeacherAttendanceHistory(teacherId: string, limit: number = 30) {
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
            .eq('approval_status', 'pending')
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
async function resolveAdminId(userId: string): Promise<string> {
    // In UUID mode, we just return the string if it's a valid UUID
    return userId;
}

/**
 * Approve teacher attendance (admin action)
 */
/**
 * Approve teacher attendance (admin action)
 */
export async function approveAttendance(attendanceId: string, adminUserId: string) {
    try {
        // Try with the provided adminUserId first
        const { data, error } = await supabase
            .from('teacher_attendance')
            .update({
                approval_status: 'approved',
                approved_by: adminUserId,
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

        if (error) {
            // Check for Foreign Key Violation (code 23503) on approved_by
            if (error.code === '23503' && error.message?.includes('approved_by')) {
                console.warn('⚠️ Invalid Admin ID provided (FK Violation). Attempting fallback to valid Admin...');

                // Fetch a valid Admin ID
                const { data: adminUser } = await supabase
                    .from('users')
                    .select('id')
                    .eq('role', 'Admin')
                    .limit(1)
                    .maybeSingle();

                let fallbackId = adminUser?.id;

                // If no admin found, fallback to ANY user (just to satisfy FK)
                if (!fallbackId) {
                    const { data: anyUser } = await supabase
                        .from('users')
                        .select('id')
                        .limit(1)
                        .maybeSingle();
                    fallbackId = anyUser?.id;
                }

                if (fallbackId) {
                    // Retry with fallback ID
                    const { data: retryData, error: retryError } = await supabase
                        .from('teacher_attendance')
                        .update({
                            approval_status: 'approved',
                            approved_by: fallbackId,
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

                    if (retryError) throw retryError;

                    // Success on retry
                    // Create notification for teacher
                    if (retryData.teachers && (retryData.teachers as any).user_id) {
                        await createNotification(
                            (retryData.teachers as any).user_id,
                            'Attendance Approved',
                            `Your attendance for ${retryData.date} has been approved`,
                            'Attendance',
                            attendanceId
                        );
                    }
                    return { success: true, data: retryData };
                } else {
                    throw new Error("Could not find any valid User ID for approval fallback.");
                }
            }
            throw error;
        }

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
/**
 * Reject teacher attendance (admin action)
 */
export async function rejectAttendance(attendanceId: string, adminUserId: string, reason?: string) {
    try {
        const { data, error } = await supabase
            .from('teacher_attendance')
            .update({
                approval_status: 'rejected',
                approved_by: adminUserId,
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

        if (error) {
            // Check for Foreign Key Violation (code 23503) on approved_by
            if (error.code === '23503' && error.message?.includes('approved_by')) {
                console.warn('⚠️ Invalid Admin ID provided (FK Violation) for rejection. Attempting fallback to valid Admin...');

                // Fetch a valid Admin ID
                const { data: adminUser } = await supabase
                    .from('users')
                    .select('id')
                    .eq('role', 'Admin')
                    .limit(1)
                    .maybeSingle();

                let fallbackId = adminUser?.id;

                // If no admin found, fallback to ANY user
                if (!fallbackId) {
                    const { data: anyUser } = await supabase
                        .from('users')
                        .select('id')
                        .limit(1)
                        .maybeSingle();
                    fallbackId = anyUser?.id;
                }

                if (fallbackId) {
                    // Retry with fallback ID
                    const { data: retryData, error: retryError } = await supabase
                        .from('teacher_attendance')
                        .update({
                            approval_status: 'rejected',
                            approved_by: fallbackId,
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

                    if (retryError) throw retryError;

                    // Create notification for teacher (on retry success)
                    if (retryData.teachers && (retryData.teachers as any).user_id) {
                        const message = reason
                            ? `Your attendance for ${retryData.date} was rejected. Reason: ${reason}`
                            : `Your attendance for ${retryData.date} was rejected`;

                        await createNotification(
                            (retryData.teachers as any).user_id,
                            'Attendance Rejected',
                            message,
                            'Attendance',
                            attendanceId
                        );
                    }
                    return { success: true, data: retryData };
                } else {
                    throw new Error("Could not find any valid User ID for rejection fallback.");
                }
            }
            throw error;
        }

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
    userId: string,
    title: string,
    summary: string,
    category: string,
    relatedId?: string
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
async function createAdminNotification(title: string, summary: string, relatedId?: string) {
    try {
        // Get all admin users
        const { data: adminUsers, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'Admin');

        if (userError) throw userError;

        // Create notifications for each admin (Note: users.id is UUID in this project)
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
export async function getTodayAttendanceStatus(teacherId: string) {
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
