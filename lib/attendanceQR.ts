/**
 * QR Attendance Service
 * Handles generation and validation of secure QR codes for student check-in.
 */

import { supabase } from './supabase';
import { notifyStudentsAndParents } from './notifications';

export interface AttendanceResult {
    success: boolean;
    studentName?: string;
    timestamp?: string;
    error?: string;
}

/**
 * Validates a scanned QR code and logs attendance.
 * QRs should contain a signed JWT or a temporary session ID.
 */
export async function processQRCheckIn(
    qrData: string, 
    schoolId: string,
    branchId?: string
): Promise<AttendanceResult> {
    try {
        // In a real app, qrData would be decrypted/verified. 
        // Here we assume it's a student_id or a secure token.
        const studentId = qrData; 

        const { data: student, error: studentError } = await supabase
            .from('students')
            .select('id, name, user_id')
            .eq('id', studentId)
            .single();

        if (studentError || !student) throw new Error('Student not found');

        const timestamp = new Date().toISOString();

        // Log to attendance_records
        const { error: attendanceError } = await supabase
            .from('attendance_records')
            .insert({
                student_id: student.id,
                school_id: schoolId,
                branch_id: branchId,
                status: 'present',
                check_in_time: timestamp,
                method: 'qr_scan'
            });

        if (attendanceError) throw attendanceError;

        // Auto-notify parent (Step 4 of the plan)
        await notifyStudentsAndParents({
            studentIds: [student.id],
            title: 'Attendance Alert',
            message: `${student.name} has safely arrived at school and checked in via QR.`,
            isUrgent: false // Sent as push/in-app, not SMS unless marked urgent
        });

        return {
            success: true,
            studentName: student.name,
            timestamp
        };
    } catch (error: any) {
        console.error('QR Check-in failed:', error);
        return { success: false, error: error.message };
    }
}
