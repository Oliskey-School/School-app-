/**
 * QR Code Attendance Service
 * Generate and scan QR codes for student check-in
 */

import { supabase } from './supabase';
import QRCode from 'qrcode';

/**
 * Generate QR code for a student
 */
export async function generateStudentQRCode(studentId: number): Promise<string | null> {
    try {
        // Call database function to generate unique code
        const { data, error } = await supabase.rpc('generate_student_qr_code', {
            p_student_id: studentId
        });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Generate QR code error:', error);
        return null;
    }
}

/**
 * Generate QR code image as data URL
 */
export async function generateQRCodeImage(qrCode: string): Promise<string | null> {
    try {
        const dataUrl = await QRCode.toDataURL(qrCode, {
            width: 400,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        return dataUrl;
    } catch (error) {
        console.error('Generate QR image error:', error);
        return null;
    }
}

/**
 * Scan QR code and mark attendance
 */
export async function scanQRCodeForAttendance(
    qrCode: string,
    location?: string
): Promise<{ success: boolean; message: string; student?: any }> {
    try {
        // Find student by QR code
        const { data: student, error: studentError } = await supabase
            .from('students')
            .select('*')
            .eq('qr_code', qrCode)
            .single();

        if (studentError || !student) {
            return {
                success: false,
                message: 'Invalid QR code or student not found'
            };
        }

        const today = new Date().toISOString().split('T')[0];

        // Check if already marked today
        const { data: existing } = await supabase
            .from('attendance_analytics')
            .select('*')
            .eq('student_id', student.id)
            .eq('date', today)
            .single();

        if (existing) {
            return {
                success: false,
                message: `Attendance already marked as ${existing.status} today`,
                student
            };
        }

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        // Mark as present
        const { error: attendanceError } = await supabase
            .from('attendance_analytics')
            .insert({
                student_id: student.id,
                date: today,
                status: 'present',
                check_in_time: new Date().toTimeString().split(' ')[0],
                check_in_method: 'qr',
                location,
                marked_by: user?.id
            });

        if (attendanceError) throw attendanceError;

        // Log scan
        await supabase.from('qr_scan_logs').insert({
            student_id: student.id,
            scanned_by: user?.id,
            location,
            status: 'success'
        });

        return {
            success: true,
            message: `Attendance marked for ${student.name}`,
            student
        };
    } catch (error) {
        console.error('Scan QR error:', error);
        return {
            success: false,
            message: 'Failed to process QR scan'
        };
    }
}

/**
 * Mark attendance manually
 */
export async function markAttendance(params: {
    studentId: number;
    date: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    notes?: string;
}): Promise<boolean> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase
            .from('attendance_analytics')
            .upsert({
                student_id: params.studentId,
                date: params.date,
                status: params.status,
                notes: params.notes,
                marked_by: user?.id,
                check_in_method: 'manual'
            }, {
                onConflict: 'student_id,date'
            });

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Mark attendance error:', error);
        return false;
    }
}

/**
 * Bulk mark attendance for a class
 */
export async function bulkMarkAttendance(params: {
    classId: string;
    date: string;
    attendanceData: Array<{ studentId: number; status: string }>;
}): Promise<boolean> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        // Create batch record
        const { data: batch } = await supabase
            .from('bulk_attendance_batches')
            .insert({
                class_id: params.classId,
                date: params.date,
                created_by: user?.id,
                total_students: params.attendanceData.length,
                marked_present: params.attendanceData.filter(a => a.status === 'present').length,
                marked_absent: params.attendanceData.filter(a => a.status === 'absent').length
            })
            .select()
            .single();

        // Insert all attendance records
        const records = params.attendanceData.map(a => ({
            student_id: a.studentId,
            date: params.date,
            status: a.status,
            marked_by: user?.id,
            check_in_method: 'manual'
        }));

        const { error } = await supabase
            .from('attendance_analytics')
            .upsert(records, {
                onConflict: 'student_id,date'
            });

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Bulk attendance error:', error);
        return false;
    }
}

/**
 * Get attendance statistics for a student
 */
export async function getStudentAttendanceStats(studentId: number, month?: Date) {
    try {
        const targetMonth = month || new Date();
        const monthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1)
            .toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('attendance_statistics')
            .select('*')
            .eq('student_id', studentId)
            .eq('month', monthStart)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    } catch (error) {
        console.error('Get attendance stats error:', error);
        return null;
    }
}

/**
 * Get dropout alerts
 */
export async function getDropoutAlerts(options?: {
    severity?: string;
    resolved?: boolean;
}) {
    try {
        let query = supabase
            .from('dropout_alerts')
            .select(`
        *,
        student:student_id (
          id,
          name,
          grade,
          section,
          parent_id
        )
      `)
            .order('created_at', { ascending: false });

        if (options?.severity) {
            query = query.eq('severity', options.severity);
        }

        if (options?.resolved !== undefined) {
            query = query.eq('is_resolved', options.resolved);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Get dropout alerts error:', error);
        return [];
    }
}

/**
 * Resolve dropout alert
 */
export async function resolveDropoutAlert(
    alertId: string,
    notes: string
): Promise<boolean> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase
            .from('dropout_alerts')
            .update({
                is_resolved: true,
                resolved_at: new Date().toISOString(),
                resolved_by: user?.id,
                resolution_notes: notes
            })
            .eq('id', alertId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Resolve alert error:', error);
        return false;
    }
}

/**
 * Get attendance report for class
 */
export async function getClassAttendanceReport(classId: string, date: string) {
    try {
        const { data, error } = await supabase
            .from('attendance_analytics')
            .select(`
        *,
        student:student_id (
          id,
          name,
          grade,
          section
        )
      `)
            .eq('date', date)
            .order('student_id');

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Get class report error:', error);
        return [];
    }
}
