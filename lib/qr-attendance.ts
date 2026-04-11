/**
 * QR Code Attendance Service
 * Generate and scan QR codes for student check-in
 */

import { api } from './api';
import QRCode from 'qrcode';

/**
 * Generate QR code for a student
 */
export async function generateStudentQRCode(studentId: number): Promise<string | null> {
    try {
        return await api.generateStudentQRCode(studentId);
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
        const result = await api.scanQRCodeForAttendance(qrCode, location);
        return {
            success: true,
            message: result.message || 'Attendance marked successfully',
            student: result.student
        };
    } catch (error: any) {
        console.error('Scan QR error:', error);
        return {
            success: false,
            message: error.message || 'Failed to process QR scan'
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
        await api.saveAttendance([{
            student_id: params.studentId,
            status: params.status,
            date: params.date,
            notes: params.notes
        }]);
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
        await api.bulkMarkAttendance(params.classId, params.date, params.attendanceData);
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
        const stats = await api.getStudentAttendance(String(studentId));
        return stats; // Note: Backend structure might differ, needs mapping if UI expects month start
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
        return await api.getDropoutAlerts(options);
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
        await api.resolveDropoutAlert(alertId, notes);
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
        return await api.getAttendanceByClass(classId, date);
    } catch (error) {
        console.error('Get class report error:', error);
        return [];
    }
}

